import React from 'react';
import { Camera, CameraResultType } from '@capacitor/camera';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { useState } from 'react';

const PassportScanner: React.FC = () => {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<string>('');

  const takePicture = async () => {
    try {
      setScanning(true);
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl
      });
      
      setResult('Photo captured successfully! MRZ scanning would happen here.');
      setScanning(false);
    } catch (error) {
      console.error('Error taking picture:', error);
      setResult('Error taking picture');
      setScanning(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Passport Scanner</CardTitle>
          <CardDescription>Place passport in frame and tap scan</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="aspect-video bg-gray-200 rounded-lg flex items-center justify-center">
            {scanning ? (
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2">Scanning...</p>
              </div>
            ) : (
              <p className="text-gray-500">Camera preview would appear here</p>
            )}
          </div>
          
          <Button 
            onClick={takePicture} 
            disabled={scanning}
            className="w-full"
          >
            {scanning ? 'Scanning...' : 'Scan Passport'}
          </Button>
          
          {result && (
            <div className="mt-4 p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-green-800">{result}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PassportScanner;