import React, { useState, useRef } from 'react';
import { Camera, CameraResultType } from '@capacitor/camera';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Camera as CameraIcon, 
  FileText, 
  CheckCircle, 
  XCircle, 
  RotateCcw,
  Scan,
  AlertTriangle
} from "lucide-react";

interface PassportData {
  documentType: string;
  countryCode: string;
  surname: string;
  givenNames: string;
  documentNumber: string;
  nationality: string;
  birthDate: string;
  gender: string;
  expirationDate: string;
  personalNumber: string;
  confidence: number;
}

interface PassportScannerProps {
  onComplete: (data: PassportData | null) => void;
  className?: string;
}

export const PassportScanner: React.FC<PassportScannerProps> = ({ 
  onComplete, 
  className = "" 
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [passportData, setPassportData] = useState<PassportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [step, setStep] = useState<'ready' | 'capturing' | 'processing' | 'complete'>('ready');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startPassportScan = async () => {
    setIsScanning(true);
    setError(null);
    setPassportData(null);
    setStep('capturing');

    try {
      // Open camera for passport scanning
      const image = await Camera.getPhoto({
        quality: 95,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        width: 1920,
        height: 1080,
        correctOrientation: true
      });

      if (!image.dataUrl) {
        throw new Error('Failed to capture image');
      }

      setCapturedImage(image.dataUrl);
      setStep('processing');

      // Process MRZ with ML Kit
      const mrzResult = await window.CapacitorCustomNative?.scanPassportMRZ({
        imageData: image.dataUrl
      });

      if (mrzResult && mrzResult.success) {
        const data: PassportData = {
          ...mrzResult.data,
          confidence: mrzResult.confidence || 0.85
        };
        setPassportData(data);
        setStep('complete');
        onComplete(data);
      } else {
        throw new Error(mrzResult?.error || 'Could not read passport MRZ. Please try again.');
      }

    } catch (error) {
      console.error('Passport scan failed:', error);
      setError(error instanceof Error ? error.message : 'Scanning failed. Please try again.');
      setStep('ready');
    } finally {
      setIsScanning(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setError(null);
    setStep('processing');

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;
        setCapturedImage(dataUrl);

        try {
          const mrzResult = await window.CapacitorCustomNative?.scanPassportMRZ({
            imageData: dataUrl
          });

          if (mrzResult && mrzResult.success) {
            const data: PassportData = {
              ...mrzResult.data,
              confidence: mrzResult.confidence || 0.85
            };
            setPassportData(data);
            setStep('complete');
            onComplete(data);
          } else {
            throw new Error('Could not read passport MRZ from uploaded image.');
          }
        } catch (error) {
          setError(error instanceof Error ? error.message : 'Failed to process image');
          setStep('ready');
        } finally {
          setIsScanning(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      setError('Failed to process uploaded file');
      setStep('ready');
      setIsScanning(false);
    }
  };

  const resetScanner = () => {
    setPassportData(null);
    setError(null);
    setStep('ready');
    setCapturedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatDate = (dateStr: string): string => {
    if (!dateStr || dateStr.length !== 6) return dateStr;
    const day = dateStr.substring(4, 6);
    const month = dateStr.substring(2, 4);
    const year = '20' + dateStr.substring(0, 2);
    return `${day}/${month}/${year}`;
  };

  const renderReadyState = () => (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="w-32 h-32 mx-auto bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl flex items-center justify-center">
          <FileText className="w-12 h-12 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-card-foreground">Passport Scanner</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Scan your passport's information page
          </p>
        </div>
      </div>

      <Alert className="border-primary/20 bg-primary/5">
        <AlertTriangle className="h-4 w-4 text-primary" />
        <AlertDescription className="text-sm">
          <strong>For best results:</strong>
          <ul className="mt-2 space-y-1 text-xs">
            <li>• Ensure good lighting without shadows</li>
            <li>• Keep passport flat and parallel to camera</li>
            <li>• Include the entire information page</li>
            <li>• Avoid glare on the page</li>
          </ul>
        </AlertDescription>
      </Alert>

      <div className="space-y-3">
        <Button 
          onClick={startPassportScan} 
          className="w-full bg-aviation-gradient hover:opacity-90 text-white h-12"
          disabled={isScanning}
        >
          <CameraIcon className="w-5 h-5 mr-2" />
          Scan with Camera
        </Button>
        
        <div className="relative">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={isScanning}
          />
          <Button 
            variant="outline" 
            className="w-full h-12 border-primary/20 text-primary hover:bg-primary/5"
            disabled={isScanning}
          >
            <FileText className="w-5 h-5 mr-2" />
            Upload Photo
          </Button>
        </div>
      </div>
    </div>
  );

  const renderProcessingState = () => (
    <div className="text-center space-y-6">
      {capturedImage && (
        <div className="w-full max-w-sm mx-auto rounded-lg overflow-hidden border-2 border-primary/20">
          <img 
            src={capturedImage} 
            alt="Captured passport" 
            className="w-full h-auto object-cover"
          />
        </div>
      )}
      
      <div className="space-y-3">
        <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
          <Scan className="w-8 h-8 text-primary animate-pulse" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-card-foreground">Processing...</h3>
          <p className="text-sm text-muted-foreground">
            Reading passport information
          </p>
        </div>
      </div>

      <div className="space-y-2 text-left bg-muted/30 rounded-lg p-4">
        <div className="flex justify-between text-sm">
          <span>Detecting text regions...</span>
          <CheckCircle className="w-4 h-4 text-success" />
        </div>
        <div className="flex justify-between text-sm">
          <span>Reading MRZ data...</span>
          <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full"></div>
        </div>
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Validating information...</span>
          <div className="w-4 h-4"></div>
        </div>
      </div>
    </div>
  );

  const renderCompleteState = () => (
    <div className="space-y-6">
      <div className="text-center">
        <CheckCircle className="w-12 h-12 text-success mx-auto mb-3" />
        <h3 className="text-lg font-semibold text-success">Passport Scanned Successfully!</h3>
        <p className="text-sm text-muted-foreground">
          Please verify the information below
        </p>
      </div>

      {passportData && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-success/10 rounded-lg">
            <span className="text-sm font-medium">Scan Confidence</span>
            <Badge variant="outline" className="bg-success/20 text-success border-success/30">
              {Math.round(passportData.confidence * 100)}%
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="p-3 bg-muted/30 rounded-lg">
                <label className="text-xs font-medium text-muted-foreground">Document Type</label>
                <p className="text-sm font-semibold">{passportData.documentType || 'Passport'}</p>
              </div>
              
              <div className="p-3 bg-muted/30 rounded-lg">
                <label className="text-xs font-medium text-muted-foreground">Country</label>
                <p className="text-sm font-semibold">{passportData.countryCode}</p>
              </div>
              
              <div className="p-3 bg-muted/30 rounded-lg">
                <label className="text-xs font-medium text-muted-foreground">Surname</label>
                <p className="text-sm font-semibold">{passportData.surname}</p>
              </div>
              
              <div className="p-3 bg-muted/30 rounded-lg">
                <label className="text-xs font-medium text-muted-foreground">Given Names</label>
                <p className="text-sm font-semibold">{passportData.givenNames}</p>
              </div>
              
              <div className="p-3 bg-muted/30 rounded-lg">
                <label className="text-xs font-medium text-muted-foreground">Gender</label>
                <p className="text-sm font-semibold">{passportData.gender}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-muted/30 rounded-lg">
                <label className="text-xs font-medium text-muted-foreground">Document Number</label>
                <p className="text-sm font-semibold">{passportData.documentNumber}</p>
              </div>
              
              <div className="p-3 bg-muted/30 rounded-lg">
                <label className="text-xs font-medium text-muted-foreground">Nationality</label>
                <p className="text-sm font-semibold">{passportData.nationality}</p>
              </div>
              
              <div className="p-3 bg-muted/30 rounded-lg">
                <label className="text-xs font-medium text-muted-foreground">Birth Date</label>
                <p className="text-sm font-semibold">{formatDate(passportData.birthDate)}</p>
              </div>
              
              <div className="p-3 bg-muted/30 rounded-lg">
                <label className="text-xs font-medium text-muted-foreground">Expiry Date</label>
                <p className="text-sm font-semibold">{formatDate(passportData.expirationDate)}</p>
              </div>
              
              {passportData.personalNumber && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <label className="text-xs font-medium text-muted-foreground">Personal Number</label>
                  <p className="text-sm font-semibold">{passportData.personalNumber}</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex space-x-3">
            <Button 
              variant="outline" 
              onClick={resetScanner}
              className="flex-1"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Scan Again
            </Button>
            <Button 
              onClick={() => onComplete(passportData)}
              className="flex-1 bg-success text-success-foreground hover:bg-success/90"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Confirm Data
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  const renderErrorState = () => (
    <div className="text-center space-y-4">
      <XCircle className="w-12 h-12 text-destructive mx-auto" />
      <div>
        <h3 className="text-lg font-semibold text-destructive">Scan Failed</h3>
        <p className="text-sm text-muted-foreground mt-1">{error}</p>
      </div>
      
      <Alert className="border-destructive/20 bg-destructive/5">
        <AlertTriangle className="h-4 w-4 text-destructive" />
        <AlertDescription className="text-left">
          <strong>Troubleshooting tips:</strong>
          <ul className="mt-2 space-y-1 text-xs">
            <li>• Ensure the MRZ (bottom text lines) are clearly visible</li>
            <li>• Check that lighting is even across the page</li>
            <li>• Make sure the image is not blurry</li>
            <li>• Try cleaning the camera lens</li>
          </ul>
        </AlertDescription>
      </Alert>
      
      <Button 
        onClick={resetScanner}
        variant="outline"
        className="w-full"
      >
        <RotateCcw className="w-4 h-4 mr-2" />
        Try Again
      </Button>
    </div>
  );

  return (
    <Card className={`passport-scanner bg-card-gradient border-primary/20 shadow-aviation ${className}`}>
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-primary flex items-center justify-center gap-2">
          <FileText className="w-5 h-5" />
          Passport Scanner
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error ? renderErrorState() :
         step === 'ready' ? renderReadyState() :
         step === 'processing' ? renderProcessingState() :
         renderCompleteState()
        }
      </CardContent>
    </Card>
  );
};

// Extend window interface for TypeScript
declare global {
  interface Window {
    CapacitorCustomNative?: {
      scanPassportMRZ: (params: { imageData: string }) => Promise<{
        success: boolean;
        data?: PassportData;
        error?: string;
        confidence?: number;
      }>;
    };
  }
}

export default PassportScanner;