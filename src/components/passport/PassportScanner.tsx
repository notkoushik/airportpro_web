// src/components/passport/PassportScanner.tsx
import React, { useRef, useEffect, useState } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { PassportScannerService, ScanResult } from '../../services/passportScanner';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

interface PassportScannerProps {
  onScanComplete: (result: ScanResult) => void;
  onCancel: () => void;
}

export const PassportScanner: React.FC<PassportScannerProps> = ({
  onScanComplete,
  onCancel
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanner] = useState(new PassportScannerService());
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initScanner = async () => {
      try {
        await scanner.initialize();
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize scanner:', error);
      }
    };

    initScanner();
  }, [scanner]);

  const handleCapture = async () => {
    if (!isInitialized) return;

    setIsScanning(true);
    
    try {
      // Capture image using Capacitor Camera
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera
      });

      if (image.dataUrl) {
        // Convert data URL to image element
        const img = new Image();
        img.onload = async () => {
          const result = await scanner.scanPassportMRZ(img);
          onScanComplete(result);
        };
        img.src = image.dataUrl;
      }
    } catch (error) {
      console.error('Camera error:', error);
      onScanComplete({
        success: false,
        error: 'Camera access failed',
        timestamp: new Date()
      });
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Scan Passport</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Position your passport's data page clearly in the camera frame
          </p>
          
          <div className="space-y-2">
            <Button 
              onClick={handleCapture} 
              disabled={!isInitialized || isScanning}
              className="w-full"
            >
              {isScanning ? 'Scanning...' : 'Capture Passport'}
            </Button>
            
            <Button 
              onClick={onCancel} 
              variant="outline"
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
