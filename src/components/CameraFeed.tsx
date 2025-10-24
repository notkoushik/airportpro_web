// src/components/CameraFeed.tsx
import React, { useEffect, useRef, useState } from 'react';

interface CameraFeedProps {
  onCapture?: (imageData: string) => void;
  onError?: (error: string) => void;
}

const CameraFeed: React.FC<CameraFeedProps> = ({ onCapture, onError }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const startCamera = async () => {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user' },
          audio: false
        });

        if (cancelled) {
          mediaStream.getTracks().forEach(track => track.stop());
          return;
        }
        
        setStream(mediaStream);
        
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          // ✅ FIXED: Added proper promise handling
          videoRef.current.play()
            .then(() => setIsReady(true))
            .catch((playError) => {
              console.error('Failed to play video:', playError);
              onError?.('Failed to start camera');
            });
        }
      } catch (error) {
        console.error('Camera access failed:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        onError?.(errorMessage);
      }
    };
    
    startCamera();
    
    return () => {
      cancelled = true;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [onError]);

  const captureImage = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0);
    const imageData = canvas.toDataURL('image/jpeg');
    onCapture?.(imageData);
  };

  return (
    <div className="relative">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full rounded-lg"
      />
      <canvas ref={canvasRef} className="hidden" />
      
      {isReady && (
        <button
          onClick={captureImage}
          className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg"
        >
          Capture
        </button>
      )}
    </div>
  );
};

export default CameraFeed;