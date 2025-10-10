import React, { useEffect, useRef, useState, useCallback } from 'react';
import { AirportProPlugins, LivenessResult } from '../lib/capacitor-plugins';

interface Props {
  mode: 'liveness' | 'passport' | 'selfie';
  onResult?: (result: any) => void;
  onError?: (error: string) => void;
  autoCapture?: boolean;
}

export default function MLKitCameraFeed({ mode, onResult, onError, autoCapture = false }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<string>('Initializing camera...');
  const [detectionActive, setDetectionActive] = useState(false);

  // Start camera
  useEffect(() => {
    let cancelled = false;

    const startCamera = async () => {
      try {
        const constraints = {
          video: {
            facingMode: mode === 'passport' ? 'environment' : 'user', // Back camera for passport, front for selfie
            width: { ideal: mode === 'passport' ? 1280 : 640 },
            height: { ideal: mode === 'passport' ? 720 : 480 }
          },
          audio: false
        };

        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        if (cancelled) {
          mediaStream.getTracks().forEach(track => track.stop());
          return;
        }

        setStream(mediaStream);
        
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          await videoRef.current.play();
          setStatus(getStatusMessage());
          
          if (autoCapture && mode !== 'passport') {
            setTimeout(() => setDetectionActive(true), 1000);
          }
        }
      } catch (error) {
        console.error('Camera access failed:', error);
        onError?.(`Camera access failed: ${error.message}`);
        setStatus('Camera access denied');
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [mode, autoCapture]);

  // Detection loop for liveness
  useEffect(() => {
    if (!detectionActive || mode !== 'liveness') return;

    const interval = setInterval(async () => {
      if (!isProcessing && videoRef.current && canvasRef.current) {
        await performLivenessCheck();
      }
    }, 2000); // Check every 2 seconds

    return () => clearInterval(interval);
  }, [detectionActive, isProcessing, mode]);

  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || !canvas) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.8);
  }, []);

  const performLivenessCheck = async () => {
    setIsProcessing(true);
    setStatus('Analyzing face...');

    try {
      const imageBase64 = captureFrame();
      if (!imageBase64) {
        throw new Error('Failed to capture frame');
      }

      const result: LivenessResult = await AirportProPlugins.checkLiveness(imageBase64);
      
      setStatus(`Liveness: ${result.confidence.toFixed(2)} confidence`);
      
      if (result.isLive && result.confidence > 0.8) {
        setDetectionActive(false);
        onResult?.({
          type: 'liveness',
          result,
          image: imageBase64
        });
      } else {
        setStatus(`${result.details} - Keep trying...`);
      }
    } catch (error) {
      console.error('Liveness check failed:', error);
      onError?.(`Liveness check failed: ${error.message}`);
      setStatus('Liveness check failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const performPassportScan = async () => {
    setIsProcessing(true);
    setStatus('Scanning passport...');

    try {
      const imageBase64 = captureFrame();
      if (!imageBase64) {
        throw new Error('Failed to capture frame');
      }

      // First preprocess the image for better OCR
      const preprocessed = await AirportProPlugins.preprocessImage(imageBase64);
      const scanImage = preprocessed.success ? preprocessed.processedImage : imageBase64;

      const result = await AirportProPlugins.scanPassportMRZ(scanImage);
      
      if (result.success && result.data) {
        setStatus('Passport data extracted successfully!');
        onResult?.({
          type: 'passport',
          result: result.data,
          image: imageBase64,
          confidence: result.confidence
        });
      } else {
        setStatus(result.error || 'Could not read passport data');
        onError?.(result.error || 'Scan failed - try better lighting');
      }
    } catch (error) {
      console.error('Passport scan failed:', error);
      onError?.(`Passport scan failed: ${error.message}`);
      setStatus('Passport scan failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const takeSelfie = async () => {
    setIsProcessing(true);
    setStatus('Taking selfie...');

    try {
      const imageBase64 = captureFrame();
      if (!imageBase64) {
        throw new Error('Failed to capture frame');
      }

      // Verify liveness before accepting selfie
      const livenessResult = await AirportProPlugins.checkLiveness(imageBase64);
      
      if (livenessResult.isLive && livenessResult.confidence > 0.7) {
        setStatus('Selfie captured successfully!');
        onResult?.({
          type: 'selfie',
          image: imageBase64,
          livenessVerified: true,
          livenessScore: livenessResult.confidence
        });
      } else {
        throw new Error('Liveness verification failed - please look directly at camera');
      }
    } catch (error) {
      console.error('Selfie capture failed:', error);
      onError?.(`Selfie failed: ${error.message}`);
      setStatus('Selfie capture failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusMessage = (): string => {
    switch (mode) {
      case 'liveness':
        return 'Position your face in the camera';
      case 'passport':
        return 'Position passport data page in frame';
      case 'selfie':
        return 'Look directly at the camera';
      default:
        return 'Ready';
    }
  };

  const getCaptureButtonText = (): string => {
    switch (mode) {
      case 'liveness':
        return 'Start Liveness Check';
      case 'passport':
        return 'Scan Passport';
      case 'selfie':
        return 'Take Selfie';
      default:
        return 'Capture';
    }
  };

  const handleManualCapture = () => {
    switch (mode) {
      case 'liveness':
        if (!detectionActive) {
          setDetectionActive(true);
        } else {
          performLivenessCheck();
        }
        break;
      case 'passport':
        performPassportScan();
        break;
      case 'selfie':
        takeSelfie();
        break;
    }
  };

  return (
    <div className="relative w-full max-w-md mx-auto">
      {/* Video Feed */}
      <div className="relative bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          playsInline
          muted
          className="w-full h-auto"
          style={{ maxHeight: '400px' }}
        />
        
        {/* Overlay Canvas */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full opacity-0"
        />

        {/* Status Overlay */}
        <div className="absolute top-4 left-4 right-4">
          <div className="bg-black/60 text-white px-3 py-2 rounded text-sm">
            {status}
          </div>
        </div>

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="bg-white p-4 rounded-lg flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span>Processing...</span>
            </div>
          </div>
        )}

        {/* Liveness Detection Indicator */}
        {mode === 'liveness' && detectionActive && !isProcessing && (
          <div className="absolute inset-0 border-4 border-green-500 rounded-lg animate-pulse"></div>
        )}
      </div>

      {/* Controls */}
      <div className="mt-4 flex justify-center">
        <button
          onClick={handleManualCapture}
          disabled={isProcessing}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          {isProcessing ? 'Processing...' : getCaptureButtonText()}
        </button>
      </div>

      {/* Mode-specific Instructions */}
      <div className="mt-4 text-sm text-gray-600 text-center space-y-2">
        {mode === 'passport' && (
          <div>
            <p>• Ensure good lighting</p>
            <p>• Keep passport flat and steady</p>
            <p>• Include the entire data page</p>
            <p>• Make sure MRZ lines are visible</p>
          </div>
        )}
        
        {mode === 'liveness' && (
          <div>
            <p>• Look directly at camera</p>
            <p>• Keep your face centered</p>
            <p>• Ensure good lighting</p>
            <p>• Hold steady for analysis</p>
          </div>
        )}

        {mode === 'selfie' && (
          <div>
            <p>• Position face in center</p>
            <p>• Look directly at camera</p>
            <p>• Remove sunglasses/hat</p>
            <p>• Ensure good lighting</p>
          </div>
        )}
      </div>
    </div>
  );
}