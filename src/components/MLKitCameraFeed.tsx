import React, { useEffect, useRef, useState, useCallback } from 'react';
// CORRECTED IMPORT PATH
import { AirportProPlugins, LivenessResult } from '@/lib/capacitor-plugins';

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
          // Ensure play() is called after user interaction if needed, though often allowed in secure contexts
          await videoRef.current.play().catch(playError => {
             console.warn("Video play interrupted or failed:", playError);
             // Might need a button click from user to start video if autoplay fails
             setStatus("Tap video to start");
          });
          setStatus(getStatusMessage());


          if (autoCapture && mode !== 'passport') {
            setTimeout(() => setDetectionActive(true), 1000);
          }
        }
      } catch (error) {
        // --- UPDATED ERROR HANDLING ---
        console.error('Camera access failed:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        onError?.(`Camera access failed: ${errorMessage}`);
        setStatus('Camera access denied');
        // -----------------------------
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      // Clean up state
      setStream(null);
      setDetectionActive(false);
      setIsProcessing(false);
      setStatus('Camera stopped');
    };
    // Disabled exhaustive-deps because adding getStatusMessage causes infinite loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, autoCapture, onError]); // Removed stream from dependency array as it causes re-runs

  // Detection loop for liveness
  useEffect(() => {
    if (!detectionActive || mode !== 'liveness' || isProcessing) return; // Added isProcessing check here

    let intervalId: NodeJS.Timeout | null = null;

    const runCheck = async () => {
      if (!isProcessing && videoRef.current && canvasRef.current && detectionActive) {
         await performLivenessCheck();
         // If still active after check, schedule next one
         if (detectionActive && !intervalId) {
            intervalId = setTimeout(runCheck, 2000);
         }
      } else {
        // If processing or not active, clear interval
        if (intervalId) clearTimeout(intervalId);
        intervalId = null;
      }
    };

    // Start the first check slightly delayed
    intervalId = setTimeout(runCheck, 500);

    return () => {
       if (intervalId) clearTimeout(intervalId);
    };
    // Added performLivenessCheck to dependencies
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detectionActive, isProcessing, mode]); // Removed performLivenessCheck

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

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height); // Ensure dimensions match
    return canvas.toDataURL('image/jpeg', 0.8);
  }, []);

  const performLivenessCheck = useCallback(async () => { // Wrapped in useCallback
    // Prevent multiple simultaneous checks
    if (isProcessing) return;

    setIsProcessing(true);
    setStatus('Analyzing face...');

    try {
      const imageBase64 = captureFrame();
      if (!imageBase64) {
        throw new Error('Failed to capture frame');
      }

      // Check if plugin exists before calling
      if (!AirportProPlugins || !AirportProPlugins.checkLiveness) {
          throw new Error('Liveness plugin not available');
      }
      const result: LivenessResult = await AirportProPlugins.checkLiveness(imageBase64);


      setStatus(`Liveness: ${result.confidence.toFixed(2)} confidence`);

      if (result.isLive && result.confidence > 0.8) {
        setDetectionActive(false); // Stop loop on success
        onResult?.({
          type: 'liveness',
          result,
          image: imageBase64
        });
        setStatus('Liveness check successful!'); // Update status on success
      } else {
        setStatus(`${result.details || 'Liveness check failed'} - Keep trying...`);
      }
    } catch (error) {
      // --- UPDATED ERROR HANDLING ---
      console.error('Liveness check failed:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      onError?.(`Liveness check failed: ${errorMessage}`);
      setStatus('Liveness check failed');
      setDetectionActive(false); // Stop loop on error
      // -----------------------------
    } finally {
      setIsProcessing(false);
    }
  }, [captureFrame, onError, onResult, isProcessing]); // Added isProcessing dependency

  const performPassportScan = useCallback(async () => { // Wrapped in useCallback
     if (isProcessing) return;
    setIsProcessing(true);
    setStatus('Scanning passport...');

    try {
      const imageBase64 = captureFrame();
      if (!imageBase64) {
        throw new Error('Failed to capture frame');
      }

      // Check if plugins exist
      if (!AirportProPlugins || !AirportProPlugins.preprocessImage || !AirportProPlugins.scanPassportMRZ) {
          throw new Error('Passport scanning plugins not available');
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
          image: imageBase64, // Return original image maybe? Or processed?
          confidence: result.confidence
        });
      } else {
        setStatus(result.error || 'Could not read passport data - Adjust position/lighting'); // More helpful message
        onError?.(result.error || 'Scan failed - try better lighting');
      }
    } catch (error) {
      // --- UPDATED ERROR HANDLING ---
      console.error('Passport scan failed:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      onError?.(`Passport scan failed: ${errorMessage}`);
      setStatus('Passport scan failed');
      // -----------------------------
    } finally {
      setIsProcessing(false);
    }
  }, [captureFrame, onError, onResult, isProcessing]); // Added isProcessing dependency

  const takeSelfie = useCallback(async () => { // Wrapped in useCallback
     if (isProcessing) return;
    setIsProcessing(true);
    setStatus('Taking selfie...');

    try {
      const imageBase64 = captureFrame();
      if (!imageBase64) {
        throw new Error('Failed to capture frame');
      }

      // Check if plugin exists
      if (!AirportProPlugins || !AirportProPlugins.checkLiveness) {
          throw new Error('Liveness plugin not available for selfie verification');
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
        // Provide more specific feedback if available
        throw new Error(livenessResult.details || 'Liveness verification failed - please look directly at camera');
      }
    } catch (error) {
      // --- UPDATED ERROR HANDLING ---
      console.error('Selfie capture failed:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      onError?.(`Selfie failed: ${errorMessage}`);
      setStatus('Selfie capture failed');
      // -----------------------------
    } finally {
      setIsProcessing(false);
    }
  }, [captureFrame, onError, onResult, isProcessing]); // Added isProcessing dependency

  const getStatusMessage = useCallback((): string => { // Wrapped in useCallback
    // Give initial message only if stream is not ready
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
  }, [mode, stream, detectionActive]); // Added stream, detectionActive

  const getCaptureButtonText = useCallback((): string => { // Wrapped in useCallback
     if (isProcessing) return 'Processing...'; // Show processing text on button

    switch (mode) {
      case 'liveness':
         // Change text based on whether detection is active
        return detectionActive ? 'Checking Liveness...' : 'Start Liveness Check';
      case 'passport':
        return 'Scan Passport';
      case 'selfie':
        return 'Take Selfie';
      default:
        return 'Capture';
    }
  }, [mode, isProcessing, detectionActive]); // Added isProcessing, detectionActive

  const handleManualCapture = useCallback(() => { // Wrapped in useCallback
     // Prevent action if already processing
     if (isProcessing) return;

    switch (mode) {
      case 'liveness':
        if (!detectionActive) {
          setStatus('Starting liveness check...'); // Give feedback
          setDetectionActive(true);
        }
        // No explicit call needed here, useEffect loop handles it
        break;
      case 'passport':
        performPassportScan();
        break;
      case 'selfie':
        takeSelfie();
        break;
    }
  }, [mode, detectionActive, isProcessing, performPassportScan, takeSelfie]); // Added isProcessing

  return (
    <div className="relative w-full max-w-md mx-auto p-4 border rounded-lg shadow-md bg-white">
      {/* Video Feed */}
      <div className="relative bg-gray-200 rounded-lg overflow-hidden aspect-video"> {/* Use aspect ratio */}
        <video
          ref={videoRef}
          playsInline
          muted // Ensure muted for autoplay policies
          autoPlay // Try adding autoplay
          className="w-full h-full object-cover" // Use object-cover
          // onClick={() => videoRef.current?.play()} // Allow user interaction to play if needed
        />

        {/* Overlay Canvas - Keep hidden but functional */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full opacity-0 pointer-events-none" // Ensure it doesn't block video
        />

        {/* Status Overlay */}
        <div className="absolute top-2 left-2 right-2 z-10">
          <div className="bg-black/70 text-white px-3 py-1.5 rounded-md text-sm shadow">
            {status}
          </div>
        </div>

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20">
            <div className="bg-white p-4 rounded-lg flex items-center space-x-3 shadow-lg">
              <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-600"></div>
              <span className="text-gray-700 font-medium">Processing...</span>
            </div>
          </div>
        )}

        {/* Liveness Detection Frame/Indicator */}
        {mode === 'liveness' && detectionActive && !isProcessing && (
           // Example: Add an oval overlay or border animation
           <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
             <div className="w-4/5 h-4/5 border-4 border-green-500 rounded-full animate-pulse opacity-75"></div>
           </div>
        )}
         {/* Passport Frame Indicator */}
        {mode === 'passport' && !isProcessing && (
           <div className="absolute inset-0 flex items-center justify-center pointer-events-none p-4">
             {/* Adjust border size/style as needed */}
             <div className="w-full h-2/3 border-4 border-dashed border-blue-400 opacity-75 rounded-md"></div>
              <p className="absolute bottom-6 text-white bg-black/50 px-2 py-1 rounded text-xs">Align MRZ here</p>
           </div>
        )}
      </div>

      {/* Controls */}
      <div className="mt-5 flex justify-center">
        <button
          onClick={handleManualCapture}
          disabled={isProcessing || !stream} // Disable if stream not ready
          className={`
            bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold
            transition-all duration-200 ease-in-out shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75
            disabled:bg-gray-400 disabled:cursor-not-allowed disabled:shadow-none
          `}
        >
          {getCaptureButtonText()}
        </button>
      </div>

      {/* Mode-specific Instructions */}
      <div className="mt-5 text-sm text-gray-500 text-center space-y-1 bg-gray-50 p-3 rounded-md border">
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
  );
}

