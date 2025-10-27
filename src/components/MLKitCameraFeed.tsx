import React, { useEffect, useRef, useState, useCallback } from 'react';
import { LivenessPluginNative as AirportProPlugins } from '@/lib/capacitor-plugins';
import { LivenessResult } from '@/lib/liveness-integration';
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
  const [status, setStatus] = useState('Initializing camera...');
  const [detectionActive, setDetectionActive] = useState(false);

  // Start camera
  useEffect(() => {
    let cancelled = false;
    
    const startCamera = async () => {
      try {
        const constraints = {
          video: {
            facingMode: mode === 'passport' ? 'environment' : 'user',
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
          await videoRef.current.play().catch(playError => {
            console.warn("Video play interrupted or failed:", playError);
            setStatus("Tap video to start");
          });
          
          setStatus(getStatusMessage());
          
          if (autoCapture && mode !== 'passport') {
            setTimeout(() => setDetectionActive(true), 1000);
          }
        }
      } catch (error) {
        console.error('Camera access failed:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        onError?.(`Camera access failed: ${errorMessage}`);
        setStatus('Camera access denied');
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      setStream(null);
      setDetectionActive(false);
      setIsProcessing(false);
      setStatus('Camera stopped');
    };
  }, [mode, autoCapture, onError, getStatusMessage, stream]);

  // Detection loop for liveness
  useEffect(() => {
    if (!detectionActive || mode !== 'liveness' || isProcessing || !videoRef.current) return;

    let intervalId: number | null = null;

    const runCheck = async () => {
      if (!isProcessing && videoRef.current && canvasRef.current && detectionActive) {
        await performLivenessCheck();
        if (detectionActive && !intervalId) {
          intervalId = setTimeout(runCheck, 2000);
        }
      } else {
        if (intervalId) clearTimeout(intervalId);
        intervalId = null;
      }
    };

    intervalId = setTimeout(runCheck, 500);

    return () => {
      if (intervalId) clearTimeout(intervalId);
    };
  }, [detectionActive, isProcessing, mode]);

  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (!video || video.readyState < video.HAVE_CURRENT_DATA || !canvas) {
      console.warn("Video not ready or canvas missing for captureFrame");
      return null;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.8);
  }, []);

  const performLivenessCheck = useCallback(async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    setStatus('Analyzing face...');

    try {
      const imageBase64 = captureFrame();
      if (!imageBase64) {
        throw new Error('Failed to capture frame');
      }

      if (!AirportProPlugins || !AirportProPlugins.checkLiveness) {
        throw new Error('Liveness plugin not available');
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
        setStatus('Liveness check successful!');
      } else {
        // ✅ FIXED: Removed reference to 'details' property
        setStatus(`Liveness check failed - Keep trying...`);
      }
    } catch (error) {
      console.error('Liveness check failed:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      onError?.(`Liveness check failed: ${errorMessage}`);
      setStatus('Liveness check failed');
      setDetectionActive(false);
    } finally {
      setIsProcessing(false);
    }
  }, [captureFrame, onError, onResult, isProcessing]);

  const performPassportScan = useCallback(async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    setStatus('Scanning passport...');

    try {
      const imageBase64 = captureFrame();
      if (!imageBase64) {
        throw new Error('Failed to capture frame');
      }

      if (!AirportProPlugins || !AirportProPlugins.preprocessImage || !AirportProPlugins.scanPassportMRZ) {
        throw new Error('Passport scanning plugins not available');
      }

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
        setStatus(result.error || 'Could not read passport data - Adjust position/lighting');
        onError?.(result.error || 'Scan failed - try better lighting');
      }
    } catch (error) {
      console.error('Passport scan failed:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      onError?.(`Passport scan failed: ${errorMessage}`);
      setStatus('Passport scan failed');
    } finally {
      setIsProcessing(false);
    }
  }, [captureFrame, onError, onResult, isProcessing]);

  const takeSelfie = useCallback(async () => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    setStatus('Taking selfie...');

    try {
      const imageBase64 = captureFrame();
      if (!imageBase64) {
        throw new Error('Failed to capture frame');
      }

      if (!AirportProPlugins || !AirportProPlugins.checkLiveness) {
        throw new Error('Liveness plugin not available for selfie verification');
      }

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
        // ✅ FIXED: Removed reference to 'details' property
        throw new Error('Liveness verification failed - please look directly at camera');
      }
    } catch (error) {
      console.error('Selfie capture failed:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      onError?.(`Selfie failed: ${errorMessage}`);
      setStatus('Selfie capture failed');
    } finally {
      setIsProcessing(false);
    }
  }, [captureFrame, onError, onResult, isProcessing]);

  const getStatusMessage = useCallback((): string => {
    if (!stream || !videoRef.current || videoRef.current.readyState < videoRef.current.HAVE_ENOUGH_DATA) {
      return 'Initializing camera...';
    }

    switch (mode) {
      case 'liveness':
        return detectionActive ? 'Analyzing...' : 'Position your face in the camera';
      case 'passport':
        return 'Position passport data page in frame';
      case 'selfie':
        return 'Look directly at the camera';
      default:
        return 'Ready';
    }
  }, [mode, stream, detectionActive]);

  const getCaptureButtonText = useCallback((): string => {
    if (isProcessing) return 'Processing...';
    
    switch (mode) {
      case 'liveness':
        return detectionActive ? 'Checking Liveness...' : 'Start Liveness Check';
      case 'passport':
        return 'Scan Passport';
      case 'selfie':
        return 'Take Selfie';
      default:
        return 'Capture';
    }
  }, [mode, isProcessing, detectionActive]);

  const handleManualCapture = useCallback(() => {
    if (isProcessing) return;

    switch (mode) {
      case 'liveness':
        if (!detectionActive) {
          setStatus('Starting liveness check...');
          setDetectionActive(true);
        }
        break;
      case 'passport':
        performPassportScan();
        break;
      case 'selfie':
        takeSelfie();
        break;
    }
  }, [mode, detectionActive, isProcessing, performPassportScan, takeSelfie]);

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      {/* Video Feed */}
      <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="w-full h-full object-cover"
        />
        
        {/* Overlay Canvas */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
        />
        
        {/* Status Overlay */}
        <div className="absolute top-4 left-4 right-4 bg-black/70 text-white px-4 py-2 rounded-lg text-sm font-medium text-center">
          {status}
        </div>
        
        {/* Processing Indicator */}
        {isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="bg-white px-6 py-3 rounded-lg">
              Processing...
            </div>
          </div>
        )}
        
        {/* Liveness Detection Frame */}
        {mode === 'liveness' && detectionActive && !isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-80 border-4 border-blue-500 rounded-full animate-pulse"></div>
          </div>
        )}
        
        {/* Passport Frame Indicator */}
        {mode === 'passport' && !isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="border-2 border-white rounded-lg p-4">
              <p className="text-white text-sm">Align MRZ here</p>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="mt-4 space-y-4">
        <button
          onClick={handleManualCapture}
          disabled={isProcessing}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          {getCaptureButtonText()}
        </button>

        {/* Mode-specific Instructions */}
        <div className="text-sm text-gray-600 space-y-1">
          {mode === 'passport' && (
            <>
              <p>• Ensure good lighting, avoid glare</p>
              <p>• Keep passport flat and steady</p>
              <p>• Align MRZ lines within frame</p>
            </>
          )}
          {mode === 'liveness' && (
            <>
              <p>• Look directly at the camera</p>
              <p>• Keep your face centered in the oval</p>
              <p>• Ensure good, even lighting</p>
              <p>• Hold steady for analysis</p>
            </>
          )}
          {mode === 'selfie' && (
            <>
              <p>• Position face in center</p>
              <p>• Look directly at camera</p>
              <p>• Remove sunglasses/hat</p>
              <p>• Ensure good lighting</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
