// src/components/passport/EnhancedPassportScanner.tsx
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { useState, useRef, useEffect } from 'react';

interface PassportScannerProps {
  onScanComplete: (data: any) => void;
  onCancel: () => void;
}

export const EnhancedPassportScanner = ({ onScanComplete, onCancel }: PassportScannerProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const [previewActive, setPreviewActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const startCamera = async () => {
    try {
      setPreviewActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Back camera for passport scanning
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          frameRate: { ideal: 30 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      setError('Camera access failed. Please check permissions.');
    }
  };

  const capturePassport = async () => {
    setIsScanning(true);
    setError(null);
    
    try {
      const image = await Camera.getPhoto({
        quality: 95,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        width: 1920,
        height: 1080,
        correctOrientation: true
      });

      // Enhanced preprocessing before ML Kit
      const processedImage = await preprocessPassportImage(image.dataUrl);
      
      // Call ML Kit with optimized image
      const result = await (window as any).PassportScannerPlugin?.scanPassportMRZ({
        imageData: processedImage
      });

      if (result?.success) {
        onScanComplete(result.data);
      } else {
        setError(result?.error || 'Failed to read passport. Please try again.');
      }
    } catch (error) {
      setError('Scanning failed. Please ensure good lighting and try again.');
    } finally {
      setIsScanning(false);
    }
  };

  const preprocessPassportImage = async (dataUrl: string): Promise<string> => {
    // Enhanced image preprocessing for better OCR
    const result = await (window as any).PassportScannerPlugin?.preprocessImage({
      imageData: dataUrl
    });
    return result?.processedImage || dataUrl;
  };

  return (
    <div className="passport-scanner-enhanced">
      <div className="scanner-header">
        <button onClick={onCancel} className="back-button">
          ← Back
        </button>
        <h2>Scan Your Passport</h2>
      </div>

      {/* ENLARGED CAMERA PREVIEW */}
      <div className="camera-container">
        <video 
          ref={videoRef}
          autoPlay
          playsInline
          className="camera-preview-large"
          style={{
            width: '100%',
            height: '70vh',
            objectFit: 'cover',
            borderRadius: '12px'
          }}
        />
        
        {/* Passport Overlay Guide */}
        <div className="passport-overlay">
          <div className="scan-frame">
            <div className="corner top-left"></div>
            <div className="corner top-right"></div>
            <div className="corner bottom-left"></div>
            <div className="corner bottom-right"></div>
          </div>
          <div className="guidance-text">
            <p>Position passport's information page within the frame</p>
            <p>Ensure MRZ lines at bottom are visible</p>
          </div>
        </div>
      </div>

      {/* Enhanced Controls */}
      <div className="scanner-controls">
        {!previewActive && (
          <button onClick={startCamera} className="btn-primary">
            Start Camera
          </button>
        )}
        
        {previewActive && !isScanning && (
          <button onClick={capturePassport} className="btn-capture">
            📸 Scan Passport
          </button>
        )}
        
        {isScanning && (
          <div className="scanning-indicator">
            <div className="spinner"></div>
            <p>Scanning passport...</p>
          </div>
        )}
      </div>

      {error && (
        <div className="error-panel">
          <p>{error}</p>
          <div className="scanning-tips">
            <h4>Scanning Tips:</h4>
            <ul>
              <li>Ensure good lighting without shadows</li>
              <li>Keep passport flat and steady</li>
              <li>Include entire information page</li>
              <li>Avoid glare on the page</li>
            </ul>
          </div>
          <button onClick={() => setError(null)} className="btn-retry">
            Try Again
          </button>
        </div>
      )}
    </div>
  );
};
