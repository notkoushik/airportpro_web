import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  Smartphone, 
  Wifi, 
  Shield, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  CreditCard,
  Lock
} from "lucide-react";

interface NFCPassportData {
  basicInfo: {
    documentType: string;
    issuingCountry: string;
    documentNumber: string;
    surname: string;
    givenNames: string;
    nationality: string;
    dateOfBirth: string;
    gender: string;
    dateOfExpiry: string;
  };
  photo?: string; // Base64 encoded image
  digitalSignature?: {
    verified: boolean;
    signerCountry: string;
  };
  biometrics?: {
    faceTemplate: string;
    fingerprints?: string[];
  };
}

interface MRZData {
  documentNumber: string;
  dateOfBirth: string;
  dateOfExpiry: string;
}

interface NFCPassportReaderProps {
  mrzData: MRZData;
  onComplete: (data: NFCPassportData | null) => void;
  className?: string;
}

type NFCStep = 'check-support' | 'ready' | 'positioning' | 'connecting' | 'authenticating' | 'reading' | 'complete';

export const NFCPassportReader: React.FC<NFCPassportReaderProps> = ({ 
  mrzData, 
  onComplete, 
  className = "" 
}) => {
  const [nfcSupported, setNfcSupported] = useState<boolean | null>(null);
  const [isReading, setIsReading] = useState(false);
  const [currentStep, setCurrentStep] = useState<NFCStep>('check-support');
  const [progress, setProgress] = useState(0);
  const [passportData, setPassportData] = useState<NFCPassportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const steps = [
    { id: 'check-support', title: 'Checking NFC', progress: 10 },
    { id: 'ready', title: 'Ready to Read', progress: 20 },
    { id: 'positioning', title: 'Position Passport', progress: 30 },
    { id: 'connecting', title: 'Connecting to Chip', progress: 40 },
    { id: 'authenticating', title: 'Authenticating', progress: 60 },
    { id: 'reading', title: 'Reading Data', progress: 80 },
    { id: 'complete', title: 'Complete', progress: 100 }
  ];

  useEffect(() => {
    checkNFCSupport();
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    const currentStepIndex = steps.findIndex(step => step.id === currentStep);
    if (currentStepIndex !== -1) {
      setProgress(steps[currentStepIndex].progress);
    }
  }, [currentStep]);

  const checkNFCSupport = async () => {
    try {
      const result = await window.CapacitorCustomNative?.checkNFCSupport();
      setNfcSupported(result?.supported || false);
      setCurrentStep(result?.supported ? 'ready' : 'check-support');
    } catch (error) {
      console.error('NFC support check failed:', error);
      setNfcSupported(false);
    }
  };

  const startNFCReading = async () => {
    if (!mrzData.documentNumber || !mrzData.dateOfBirth || !mrzData.dateOfExpiry) {
      setError('MRZ data is incomplete. Please scan passport first.');
      return;
    }

    setIsReading(true);
    setError(null);
    setCurrentStep('positioning');

    // Set a timeout for NFC reading (30 seconds)
    const timeout = setTimeout(() => {
      setError('NFC reading timed out. Please try again.');
      setIsReading(false);
      setCurrentStep('ready');
    }, 30000);
    setTimeoutId(timeout);

    try {
      // Simulate step progression
      await simulateStepProgression();

      const result = await window.CapacitorCustomNative?.readNFCPassport({
        documentNumber: mrzData.documentNumber,
        dateOfBirth: mrzData.dateOfBirth,
        dateOfExpiry: mrzData.dateOfExpiry
      });

      if (timeoutId) {
        clearTimeout(timeoutId);
        setTimeoutId(null);
      }

      if (result && result.success) {
        setPassportData(result.data);
        setCurrentStep('complete');
        onComplete(result.data);
      } else {
        throw new Error(result?.error || 'Failed to read NFC passport data');
      }

    } catch (error) {
      console.error('NFC reading failed:', error);
      setError(error instanceof Error ? error.message : 'NFC reading failed. Please try again.');
      setCurrentStep('ready');
    } finally {
      setIsReading(false);
      if (timeoutId) {
        clearTimeout(timeoutId);
        setTimeoutId(null);
      }
    }
  };

  const simulateStepProgression = async () => {
    const stepDelays = [
      { step: 'connecting', delay: 1000 },
      { step: 'authenticating', delay: 2000 },
      { step: 'reading', delay: 3000 }
    ];

    for (const { step, delay } of stepDelays) {
      await new Promise(resolve => setTimeout(resolve, delay));
      if (!isReading) break; // Stop if reading was cancelled
      setCurrentStep(step as NFCStep);
    }
  };

  const resetReader = () => {
    setPassportData(null);
    setError(null);
    setCurrentStep('ready');
    setProgress(20);
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
  };

  const formatDate = (dateStr: string): string => {
    if (!dateStr) return dateStr;
    // Assume format is YYMMDD or YYYYMMDD
    if (dateStr.length === 6) {
      const yy = dateStr.substring(0, 2);
      const mm = dateStr.substring(2, 4);
      const dd = dateStr.substring(4, 6);
      const year = parseInt(yy) > 30 ? `19${yy}` : `20${yy}`;
      return `${dd}/${mm}/${year}`;
    }
    return dateStr;
  };

  if (nfcSupported === false) {
    return (
      <Card className={`nfc-not-supported bg-card-gradient border-destructive/20 ${className}`}>
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <XCircle className="w-5 h-5" />
            NFC Not Supported
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-destructive/10 rounded-full flex items-center justify-center">
            <Smartphone className="w-8 h-8 text-destructive" />
          </div>
          <p className="text-muted-foreground">
            Your device does not support NFC passport reading, or NFC is disabled.
          </p>
          <div className="text-left bg-muted/30 rounded-lg p-4">
            <h4 className="text-sm font-medium mb-2">To enable NFC:</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Go to Settings → Connected devices</li>
              <li>• Turn on NFC</li>
              <li>• Restart the app</li>
            </ul>
          </div>
          <Button onClick={checkNFCSupport} variant="outline" className="w-full">
            <RefreshCw className="w-4 h-4 mr-2" />
            Check Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const renderReadyState = () => (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="w-32 h-32 mx-auto bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl flex items-center justify-center">
          <CreditCard className="w-12 h-12 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-card-foreground">NFC Passport Reader</h3>
          <p className="text-sm text-muted-foreground">
            Read encrypted data from your passport chip
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="p-3 bg-success/10 rounded-lg">
          <Wifi className="w-6 h-6 text-success mx-auto mb-1" />
          <p className="text-xs font-medium">NFC Ready</p>
        </div>
        <div className="p-3 bg-primary/10 rounded-lg">
          <Shield className="w-6 h-6 text-primary mx-auto mb-1" />
          <p className="text-xs font-medium">Secure</p>
        </div>
        <div className="p-3 bg-accent/10 rounded-lg">
          <Lock className="w-6 h-6 text-accent mx-auto mb-1" />
          <p className="text-xs font-medium">Encrypted</p>
        </div>
      </div>

      <Alert className="border-primary/20 bg-primary/5">
        <AlertTriangle className="h-4 w-4 text-primary" />
        <AlertDescription>
          <strong>Instructions:</strong>
          <ol className="mt-2 space-y-1 text-xs list-decimal list-inside">
            <li>Remove passport from any cover or holder</li>
            <li>Place passport flat against the back of your device</li>
            <li>Keep it steady until reading is complete</li>
            <li>The process may take up to 30 seconds</li>
          </ol>
        </AlertDescription>
      </Alert>

      <Button 
        onClick={startNFCReading} 
        className="w-full bg-aviation-gradient hover:opacity-90 text-white h-12"
        disabled={isReading}
      >
        <CreditCard className="w-5 h-5 mr-2" />
        Start NFC Reading
      </Button>
    </div>
  );

  const renderReadingState = () => (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="relative w-32 h-32 mx-auto">
          {/* Phone illustration */}
          <div className="w-20 h-32 bg-slate-800 rounded-lg mx-auto relative">
            <div className="w-16 h-24 bg-slate-300 rounded-sm absolute top-4 left-2">
              <div className="w-full h-full bg-gradient-to-b from-primary/20 to-primary/10 rounded-sm flex items-center justify-center">
                <Wifi className="w-6 h-6 text-primary animate-pulse" />
              </div>
            </div>
          </div>
          
          {/* Passport illustration */}
          <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-16 h-12 bg-red-800 rounded-sm flex items-center justify-center">
            <CreditCard className="w-4 h-4 text-white" />
          </div>
          
          {/* NFC waves */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="w-8 h-8 border-2 border-primary/30 rounded-full animate-ping"></div>
            <div className="absolute inset-0 w-8 h-8 border-2 border-primary/50 rounded-full animate-ping" style={{ animationDelay: '0.5s' }}></div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-primary">
            {steps.find(s => s.id === currentStep)?.title}
          </h3>
          <p className="text-sm text-muted-foreground">
            {currentStep === 'positioning' && 'Position passport on back of device'}
            {currentStep === 'connecting' && 'Establishing connection to chip'}
            {currentStep === 'authenticating' && 'Authenticating with passport chip'}
            {currentStep === 'reading' && 'Reading encrypted passport data'}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Progress</span>
          <span>{progress}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <Alert className="border-amber-200 bg-amber-50">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800">
          <strong>Keep steady!</strong> Do not move the passport until reading is complete.
        </AlertDescription>
      </Alert>

      <Button 
        onClick={() => {
          setIsReading(false);
          setCurrentStep('ready');
          if (timeoutId) clearTimeout(timeoutId);
        }}
        variant="outline" 
        className="w-full"
      >
        Cancel Reading
      </Button>
    </div>
  );

  const renderCompleteState = () => (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <CheckCircle className="w-16 h-16 text-success mx-auto" />
        <div>
          <h3 className="text-lg font-semibold text-success">NFC Data Read Successfully!</h3>
          <p className="text-sm text-muted-foreground">
            Passport chip data has been securely extracted
          </p>
        </div>
      </div>

      {passportData && (
        <div className="space-y-4">
          {/* Basic Information */}
          <div className="space-y-3">
            <h4 className="font-semibold text-card-foreground">Basic Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(passportData.basicInfo).map(([key, value]) => (
                <div key={key} className="p-3 bg-muted/30 rounded-lg">
                  <label className="text-xs font-medium text-muted-foreground capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </label>
                  <p className="text-sm font-semibold">
                    {key.includes('date') || key.includes('Date') ? formatDate(value) : value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Passport Photo */}
          {passportData.photo && (
            <div className="space-y-3">
              <h4 className="font-semibold text-card-foreground">Passport Photo</h4>
              <div className="flex justify-center">
                <div className="w-32 h-40 bg-muted/30 rounded-lg overflow-hidden border-2 border-primary/20">
                  <img 
                    src={`data:image/jpeg;base64,${passportData.photo}`}
                    alt="Passport Photo" 
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Digital Signature */}
          {passportData.digitalSignature && (
            <div className="space-y-3">
              <h4 className="font-semibold text-card-foreground">Digital Signature</h4>
              <div className="p-4 bg-muted/30 rounded-lg flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    Signature Status: {passportData.digitalSignature.verified ? 'Verified' : 'Unverified'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Signer: {passportData.digitalSignature.signerCountry}
                  </p>
                </div>
                {passportData.digitalSignature.verified ? (
                  <Shield className="w-6 h-6 text-success" />
                ) : (
                  <AlertTriangle className="w-6 h-6 text-warning" />
                )}
              </div>
            </div>
          )}

          <div className="flex space-x-3">
            <Button 
              variant="outline" 
              onClick={resetReader}
              className="flex-1"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Read Another
            </Button>
            <Button 
              onClick={() => onComplete(passportData)}
              className="flex-1 bg-success text-success-foreground hover:bg-success/90"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Use This Data
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
        <h3 className="text-lg font-semibold text-destructive">Reading Failed</h3>
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
      
      <Alert className="border-destructive/20 bg-destructive/5">
        <AlertTriangle className="h-4 w-4 text-destructive" />
        <AlertDescription className="text-left">
          <strong>Troubleshooting:</strong>
          <ul className="mt-2 space-y-1 text-xs">
            <li>• Ensure NFC is enabled in device settings</li>
            <li>• Remove passport from any cover</li>
            <li>• Place passport flat against device back</li>
            <li>• Keep steady for 10-30 seconds</li>
            <li>• Check MRZ data was scanned correctly</li>
          </ul>
        </AlertDescription>
      </Alert>
      
      <div className="flex space-x-3">
        <Button 
          onClick={resetReader}
          variant="outline"
          className="flex-1"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
        <Button 
          onClick={() => onComplete(null)}
          variant="secondary"
          className="flex-1"
        >
          Skip NFC Reading
        </Button>
      </div>
    </div>
  );

  return (
    <Card className={`nfc-passport-reader bg-card-gradient border-primary/20 shadow-aviation ${className}`}>
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-primary flex items-center justify-center gap-2">
          <CreditCard className="w-5 h-5" />
          NFC Passport Reader
        </CardTitle>
      </CardHeader>
      <CardContent>
        {nfcSupported === null ? (
          <div className="text-center py-8">
            <RefreshCw className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Checking NFC support...</p>
          </div>
        ) : error ? renderErrorState() :
          passportData ? renderCompleteState() :
          isReading ? renderReadingState() :
          renderReadyState()
        }
      </CardContent>
    </Card>
  );
};

// Extend window interface for TypeScript
declare global {
  interface Window {
    CapacitorCustomNative?: {
      checkNFCSupport: () => Promise<{
        supported: boolean;
        enabled?: boolean;
      }>;
      readNFCPassport: (params: {
        documentNumber: string;
        dateOfBirth: string;
        dateOfExpiry: string;
      }) => Promise<{
        success: boolean;
        data?: NFCPassportData;
        error?: string;
      }>;
    };
  }
}

export default NFCPassportReader;