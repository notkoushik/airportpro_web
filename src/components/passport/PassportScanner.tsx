import React, { useRef, useEffect, useState } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { PassportScannerService } from '../../services/passportScanner';
import type { ScanResult } from '../../types/passport';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import { Loader2, Camera as CameraIcon, RefreshCw, CheckCircle, XCircle } from 'lucide-react';

interface PassportScannerProps {
  onScanComplete: (result: ScanResult) => void;
  onCancel: () => void;
}

export const PassportScanner: React.FC<PassportScannerProps> = ({
  onScanComplete,
  onCancel
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [scanner] = useState(() => new PassportScannerService());
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<string>('Initialize Scanner');
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [useWebCamera, setUseWebCamera] = useState(false);

  useEffect(() => {
    initializeScanner();
    return () => cleanup();
  }, []);

  const initializeScanner = async () => {
    setIsInitializing(true);
    setError(null);
    setProgress(20);
    setCurrentStep('Loading OCR Models...');

    try {
      await scanner.initialize();
      setIsInitialized(true);
      setProgress(100);
      setCurrentStep('Ready to Scan');
      
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        setUseWebCamera(true);
      }
    } catch (error) {
      setError(`Scanner initialization failed: ${error}`);
    } finally {
      setIsInitializing(false);
    }
  };

  const startWebCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });

      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }
    } catch (error) {
      setError('Failed to access camera. Please check permissions.');
    }
  };

  const captureFromWebCamera = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    setIsScanning(true);
    setCurrentStep('Processing MRZ...');
    setProgress(0);

    try {
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 100);

      const result = await scanner.scanPassportMRZ(canvas);
      
      clearInterval(progressInterval);
      setProgress(100);
      
      if (result.success) {
        setCurrentStep('MRZ Detected Successfully!');
        setTimeout(() => onScanComplete(result), 500);
      } else {
        setError(result.error || 'Failed to detect MRZ');
      }
    } catch (scanError) {
      setError(`Scan failed: ${scanError}`);
    } finally {
      setIsScanning(false);
    }
  };

  const handleNativeCapture = async (): Promise<void> => {
    if (!isInitialized) return;

    setIsScanning(true);
    setError(null);
    setCurrentStep('Opening Camera...');
    setProgress(10);
    
    try {
      const image = await Camera.getPhoto({
        quality: 95,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        width: 1280,
        height: 720
      });

      setProgress(50);
      setCurrentStep('Processing Image...');

      if (image.dataUrl) {
        const img = new Image();
        
        img.onload = async () => {
          setProgress(75);
          setCurrentStep('Recognizing MRZ...');
          
          const result = await scanner.scanPassportMRZ(img);
          setProgress(100);
          
          if (result.success) {
            setCurrentStep('MRZ Detected Successfully!');
            setTimeout(() => onScanComplete(result), 500);
          } else {
            setError(result.error || 'Failed to detect MRZ');
          }
        };

        img.src = image.dataUrl;
      }
    } catch (error) {
      setError('Camera access failed');
    } finally {
      setIsScanning(false);
    }
  };

  const cleanup = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    scanner.destroy();
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CameraIcon className="w-5 h-5" />
          Passport MRZ Scanner
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {(isInitializing || isScanning) && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm font-medium">{currentStep}</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-center gap-2 mb-2">
              <XCircle className="w-4 h-4 text-red-600" />
              <span className="text-sm font-medium text-red-800">Error</span>
            </div>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {useWebCamera && stream && (
          <div className="relative">
            <video
              ref={videoRef}
              className="w-full h-48 bg-black rounded-lg object-cover"
              autoPlay
              playsInline
              muted
            />
            <canvas ref={canvasRef} className="hidden" />
            
            <div className="absolute bottom-4 left-4 right-4">
              <div className="bg-white bg-opacity-90 rounded p-2 text-xs text-center">
                Position passport MRZ area in frame
              </div>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {useWebCamera && (
            <>
              {!stream ? (
                <Button 
                  onClick={startWebCamera}
                  disabled={!isInitialized || isScanning}
                  className="w-full"
                >
                  <CameraIcon className="w-4 h-4 mr-2" />
                  Start Camera Preview
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    onClick={captureFromWebCamera}
                    disabled={!isInitialized || isScanning}
                    className="flex-1"
                  >
                    {isScanning ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CameraIcon className="w-4 h-4 mr-2" />
                    )}
                    Capture & Scan
                  </Button>
                  <Button onClick={() => setStream(null)} variant="outline">
                    Stop
                  </Button>
                </div>
              )}
            </>
          )}

          <Button 
            onClick={handleNativeCapture} 
            disabled={!isInitialized || isScanning}
            variant={useWebCamera && stream ? "outline" : "default"}
            className="w-full"
          >
            {isScanning ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CameraIcon className="w-4 h-4 mr-2" />
            )}
            {useWebCamera && stream ? 'Use Native Camera' : 'Capture Passport'}
          </Button>
          
          <Button onClick={onCancel} variant="outline" className="w-full">
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
