import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from '@vladmandic/face-api';

type Props = {
  autoStart?: boolean;
  onReady?: () => void;
  onFace?: (hasFace: boolean) => void;
};

const MODEL_URL = '/models'; // must exist under <root>/public/models

export default function CameraFeed({ autoStart = true, onReady, onFace }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Load face-api models once
  useEffect(() => {
    let cancelled = false;

    async function loadModels() {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
        ]);
        if (!cancelled) {
          setModelsLoaded(true);
          onReady?.();
        }
      } catch (e) {
        console.error('[CameraFeed] Failed to load models:', e);
      }
    }

    loadModels();
    return () => { cancelled = true; };
  }, [onReady]);

  // Start camera when models are ready (or when autoStart toggles)
  useEffect(() => {
    if (!modelsLoaded || !autoStart) return;
    let stopped = false;

    async function start() {
      try {
        const media = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        if (stopped) return;

        setStream(media);
        if (videoRef.current) {
          videoRef.current.srcObject = media;
          await videoRef.current.play().catch(() => {});
          runLoop(); // start detection loop
        }
      } catch (e) {
        console.error('[CameraFeed] getUserMedia failed:', e);
      }
    }

    start();
    return () => { stopped = true; };
  }, [modelsLoaded, autoStart]);

  // Detection loop
  const runLoop = () => {
    cancelLoop(); // defensive: clear any prior loop
    const loop = async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;

      // Match canvas to video size
      const { videoWidth, videoHeight } = video;
      if (videoWidth && videoHeight) {
        if (canvas.width !== videoWidth) canvas.width = videoWidth;
        if (canvas.height !== videoHeight) canvas.height = videoHeight;
      }

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }

      try {
        const det = await faceapi
          .detectSingleFace(
            video,
            new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 })
          )
          .withFaceLandmarks(true);

        onFace?.(!!det);

        if (det && ctx) {
          // draw detection box & landmarks
          const resized = faceapi.resizeResults(det, { width: canvas.width, height: canvas.height });
          faceapi.draw.drawDetections(canvas, resized);
          // Draw landmarks if available
          if (resized.landmarks) {
            faceapi.draw.drawFaceLandmarks(canvas, resized);
          }
        }
      } catch (e) {
        // Keep loop alive even if a detection fails once
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
  };

  const cancelLoop = () => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelLoop();
      if (stream) {
        for (const t of stream.getTracks()) t.stop();
      }
    };
  }, [stream]);

  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 640 }}>
      <video
        ref={videoRef}
        playsInline
        muted
        style={{ width: '100%', height: 'auto', borderRadius: 12, background: '#000' }}
      />
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      />
      {!modelsLoaded && (
        <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
          Loading face models…
        </div>
      )}
    </div>
  );
}
