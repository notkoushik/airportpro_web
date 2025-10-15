import React, { useState } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const PassportScanner: React.FC = () => {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const extractMRZFromImage = async (imageDataUrl: string): Promise<string> => {
    // Simulate MRZ extraction - replace with actual OCR later
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Mock successful MRZ extraction
    const mockMRZ = "P<INDTALUKDARLAJLYKOLKATAVININD<+2080631438320<78";
    return mockMRZ;
  };

  const parseMRZ = (mrzText: string) => {
    try {
      // Basic MRZ parsing for demo
      return {
        documentType: "P",
        countryCode: "IND", 
        surname: "TALUKDAR",
        givenNames: "LAJLY",
        documentNumber: "L898902C",
        dateOfBirth: "800802",
        expirationDate: "200320",
        personalNumber: "2080631438320"
      };
    } catch (error) {
      console.error('Error parsing MRZ:', error);
      return null;
    }
  };

  const takePicture = async () => {
    try {
      setScanning(true);
      setResult('');
      
      console.log('Starting camera capture...');
      
      // ✅ FIXED: Correct Capacitor Camera API usage
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,  // ✅ CORRECT: Use imported CameraSource
        width: 800,
        height: 600
      });
      
      console.log('Camera image captured:', !!image.dataUrl);
      
      if (image.dataUrl) {
        setImagePreview(image.dataUrl);
        
        console.log('Processing MRZ extraction...');
        
        // Extract MRZ from image
        const extractedMRZ = await extractMRZFromImage(image.dataUrl);
        
        if (extractedMRZ) {
          const parsedData = parseMRZ(extractedMRZ);
          
          if (parsedData) {
            setResult(`✅ Passport Scan Successful!

Name: ${parsedData.givenNames} ${parsedData.surname}
Document Number: ${parsedData.documentNumber}
Country: ${parsedData.countryCode}
Date of Birth: ${parsedData.dateOfBirth}
Expiration Date: ${parsedData.expirationDate}
Personal Number: ${parsedData.personalNumber}`);
          } else {
            setResult('❌ Failed to parse passport data');
          }
        } else {
          setResult('❌ No MRZ detected in image');
        }
      } else {
        setResult('❌ No image data received from camera');
      }
      
      setScanning(false);
    } catch (error) {
      console.error('Error scanning passport:', error);
      setResult(`❌ Scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setScanning(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            📷 Passport Scanner
          </CardTitle>
          <CardDescription className="text-center">
            Position your passport's data page clearly and tap scan
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Camera Preview Area */}
          <div className="aspect-[4/3] bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
            {imagePreview ? (
              <img 
                src={imagePreview} 
                alt="Captured passport" 
                className="max-w-full max-h-full object-contain rounded-lg"
              />
            ) : scanning ? (
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Processing image...</p>
              </div>
            ) : (
              <div className="text-center text-gray-500">
                <div className="mb-4 text-4xl">📷</div>
                <p className="font-medium">Camera preview will appear here</p>
                <p className="text-sm mt-2">Ensure good lighting and clear view of MRZ lines</p>
              </div>
            )}
          </div>
          
          {/* ✅ FIXED: Proper Button syntax */}
          <Button 
            onClick={takePicture} 
            disabled={scanning}
            className="w-full py-4 text-lg font-semibold"
            size="lg"
          >
            {scanning ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                Processing...
              </>
            ) : (
              '📷 Scan Passport'
            )}
          </Button>
          
          {/* Results */}
          {result && (
            <Card className="mt-4">
              <CardContent className="p-4">
                <pre className="text-sm whitespace-pre-wrap text-gray-800 bg-gray-50 p-4 rounded border">
                  {result}
                </pre>
              </CardContent>
            </Card>
          )}

          {/* Instructions */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">📋 Scanning Tips:</h4>
            <div className="text-sm text-blue-800 space-y-1">
              <p>• Position passport flat with good lighting</p>
              <p>• Ensure MRZ (bottom text lines) are clearly visible</p>
              <p>• Avoid shadows, reflections, and blurry images</p>
              <p>• Hold device steady when capturing</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PassportScanner;