// Enhanced Camera Component with Large Preview
// src/components/passport/LargeCameraScanner.tsx

import React, { useState, useRef, useEffect } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { ArrowLeft, Camera as CameraIcon, RotateCcw } from 'lucide-react';

interface LargeCameraScannerProps {
  onScanComplete: (data: any) => void;
  onCancel: () => void;
}

export const LargeCameraScanner: React.FC<LargeCameraScannerProps> = ({
  onScanComplete,
  onCancel
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    startCameraPreview();
    return () => {
      stopCamera();
    };
  }, []);

  const startCameraPreview = async () => {
    try {
      const constraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          frameRate: { ideal: 30 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraActive(true);
      }
    } catch (error) {
      console.error('Camera access failed:', error);
      setError('Camera access failed. Please check permissions and try again.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const capturePassport = async () => {
    setIsScanning(true);
    setError(null);

    try {
      // Stop preview stream temporarily
      stopCamera();

      // Capture high-quality image
      const image = await Camera.getPhoto({
        quality: 95,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        width: 1920,
        height: 1080,
        correctOrientation: true
      });

      // Process with ML Kit
      const result = await (window as any).PassportScannerPlugin?.scanPassportMRZ({
        imageData: image.dataUrl
      });

      if (result?.success) {
        onScanComplete(result.data);
      } else {
        setError(result?.error || 'Failed to read passport. Please try again with better lighting.');
        // Restart camera preview
        setTimeout(startCameraPreview, 1000);
      }
    } catch (error) {
      console.error('Passport scan failed:', error);
      setError('Scanning failed. Please ensure good lighting and try again.');
      setTimeout(startCameraPreview, 1000);
    } finally {
      setIsScanning(false);
    }
  };

  const retryScanning = () => {
    setError(null);
    startCameraPreview();
  };

  return (
    <div className="large-camera-scanner">
      {/* Header with back button */}
      <div className="camera-header">
        <button onClick={onCancel} className="back-btn">
          <ArrowLeft size={24} />
          <span>Back</span>
        </button>
        <h2>Scan Your Passport</h2>
        <div className="step-indicator">Step 2 of 6</div>
      </div>

      {/* Large Camera Preview - 75% of screen height */}
      <div className="camera-preview-container">
        {cameraActive && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="camera-video-large"
          />
        )}

        {/* Passport scanning overlay */}
        <div className="passport-overlay">
          <div className="scan-frame">
            <div className="corner tl"></div>
            <div className="corner tr"></div>
            <div className="corner bl"></div>
            <div className="corner br"></div>
          </div>
          
          <div className="scan-instructions">
            <p>Position your passport's information page within the frame</p>
            <p>Ensure the MRZ lines at the bottom are clearly visible</p>
          </div>
        </div>

        {/* Scanning overlay */}
        {isScanning && (
          <div className="scanning-overlay">
            <div className="scanning-animation">
              <div className="scan-line"></div>
            </div>
            <div className="scanning-text">
              <h3>Scanning passport...</h3>
              <p>Hold steady and keep good lighting</p>
            </div>
          </div>
        )}
      </div>

      {/* Camera Controls */}
      <div className="camera-controls">
        {cameraActive && !isScanning && (
          <>
            <button onClick={capturePassport} className="capture-btn">
              <CameraIcon size={24} />
              <span>Scan Passport</span>
            </button>
          </>
        )}

        {isScanning && (
          <div className="scanning-indicator">
            <div className="spinner"></div>
            <p>Processing...</p>
          </div>
        )}

        {error && (
          <div className="error-section">
            <div className="error-message">
              <p>{error}</p>
            </div>
            
            <div className="scanning-tips">
              <h4>📋 Scanning Tips:</h4>
              <ul>
                <li>✅ Ensure bright, even lighting</li>
                <li>✅ Keep passport flat and steady</li>
                <li>✅ Include entire information page</li>
                <li>✅ Avoid shadows and glare</li>
                <li>✅ Make sure MRZ lines are visible</li>
              </ul>
            </div>

            <button onClick={retryScanning} className="retry-btn">
              <RotateCcw size={20} />
              <span>Try Again</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};