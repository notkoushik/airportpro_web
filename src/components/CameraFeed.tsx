import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from '@vladmandic/face-api';

type Props = {
  autoStart?: boolean;
  onReady?: () => void;
  onFace?: (hasFace: boolean) => void;
  onError?: (error: Error) => void;
};

const MODEL_URL = '/models'; // Ensure models exist in public/models/

export default function CameraFeed({ 
  autoStart = true, 
  onReady, 
  onFace,
  onError 
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);

  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load face-api models with proper error handling
  useEffect(() => {
    let cancelled = false;

    async function loadModels() {
      try {
        setIsLoading(true);

        // Load models sequentially with error handling
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        if (cancelled) return;

        await faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL);
        if (cancelled) return;

        if (!cancelled) {
          setModelsLoaded(true);
          setError(null);
          onReady?.();
        }
      } catch (e) {
        const errorMsg = `Failed to load face detection models: ${e}`;
        console.error('[CameraFeed]', errorMsg);
        setError(errorMsg);
        onError?.(e instanceof Error ? e : new Error(errorMsg));
      } finally {
        setIsLoading(false);
      }
    }

    loadModels();

    return () => { 
      cancelled = true; 
    };
  }, [onReady, onError]);

  // Start camera when models are ready
  useEffect(() => {
    if (!modelsLoaded || !autoStart) return;

    let stopped = false;

    async function startCamera() {
      try {
        const media = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'user', 
            width: { ideal: 640 }, 
            height: { ideal: 480 } 
          },
          audio: false,
        });

        if (stopped) {
          media.getTracks().forEach(t => t.stop());
          return;
        }

        setStream(media);

        if (videoRef.current) {
          videoRef.current.srcObject = media;
          await videoRef.current.play().catch(err => {
            console.error('[CameraFeed] Video play failed:', err);
          });

          // Wait for video to be ready before starting detection
          videoRef.current.onloadedmetadata = () => {
            runDetectionLoop();
          };
        }
      } catch (e) {
        const errorMsg = `Camera access failed: ${e}`;
        console.error('[CameraFeed]', errorMsg);
        setError(errorMsg);
        onError?.(e instanceof Error ? e : new Error(errorMsg));
      }
    }

    startCamera();

    return () => { 
      stopped = true; 
    };
  }, [modelsLoaded, autoStart, onError]);

  // Face detection loop with proper error handling
  const runDetectionLoop = () => {
    cancelDetectionLoop();

    const loop = async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (!video || !canvas || video.readyState !== 4) {
        rafRef.current = requestAnimationFrame(loop);
        return;
      }

      // Match canvas to video dimensions
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
        const detection = await faceapi
          .detectSingleFace(
            video,
            new faceapi.TinyFaceDetectorOptions({ 
              inputSize: 224, 
              scoreThreshold: 0.5 
            })
          )
          .withFaceLandmarks(true);

        // Notify parent component
        onFace?.(!!detection);

        // Draw detection overlay
        if (detection && ctx) {
          const resized = faceapi.resizeResults(
            detection, 
            { width: canvas.width, height: canvas.height }
          );

          faceapi.draw.drawDetections(canvas, resized);

          if (resized.landmarks) {
            faceapi.draw.drawFaceLandmarks(canvas, resized);
          }
        }
      } catch (e) {
        // Continue loop even on detection errors
        console.warn('[CameraFeed] Detection error:', e);
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
  };

  const cancelDetectionLoop = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelDetectionLoop();
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, [stream]);

  return (
    <div style={{ position: 'relative' }}>
      <video
        ref={videoRef}
        playsInline
        muted
        style={{ 
          width: '100%', 
          height: 'auto', 
          borderRadius: 12, 
          background: '#000' 
        }}
      />
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      />
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '1rem' }}>
          Loading face detection models...
        </div>
      )}
      {error && (
        <div style={{ color: 'red', textAlign: 'center', padding: '1rem' }}>
          Error: {error}
        </div>
      )}
    </div>
  );
}
