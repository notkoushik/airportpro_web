import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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

// Import the official Plugins object from Capacitor
import { Plugins } from '@capacitor/core';

// Define TypeScript interfaces for your data structures
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

// Destructure your custom native plugin. The name "NFCPassportReader"
// must match the 'name' property in your @CapacitorPlugin annotation in Kotlin.
const { NFCPassportReader: NFCNativePlugin } = Plugins;

const NFCPassportReader: React.FC<NFCPassportReaderProps> = ({ 
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
      if (!NFCNativePlugin) {
        throw new Error("NFC Plugin is not available.");
      }
      const result = await NFCNativePlugin.checkNFCSupport();
      setNfcSupported(result?.supported || false);
      setCurrentStep(result?.supported ? 'ready' : 'check-support');
    } catch (err) {
      console.error('NFC support check failed:', err);
      setNfcSupported(false);
      setError("Could not check for NFC support. The native plugin might not be properly registered.");
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

    const timeout = setTimeout(() => {
      setError('NFC reading timed out. Please try again.');
      setIsReading(false);
      setCurrentStep('ready');
    }, 30000);
    setTimeoutId(timeout);

    try {
      await simulateStepProgression();
      
      if (!NFCNativePlugin) {
        throw new Error("NFC Plugin is not available.");
      }

      const result = await NFCNativePlugin.readNFCPassport({
        documentNumber: mrzData.documentNumber,
        dateOfBirth: mrzData.dateOfBirth,
        dateOfExpiry: mrzData.dateOfExpiry
      });
      
      clearTimeout(timeout);
      setTimeoutId(null);

      if (result && result.success && result.data) {
        setPassportData(result.data);
        setCurrentStep('complete');
        onComplete(result.data);
      } else {
        throw new Error(result?.error || 'Failed to read NFC passport data');
      }

    } catch (err) {
      console.error('NFC reading failed:', err);
      setError(err instanceof Error ? err.message : 'NFC reading failed. Please try again.');
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
      if (!isReading) break;
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
    if (!dateStr || dateStr.length !== 6) return dateStr;
    const yy = dateStr.substring(0, 2);
    const mm = dateStr.substring(2, 4);
    const dd = dateStr.substring(4, 6);
    const year = parseInt(yy) > 30 ? `19${yy}` : `20${yy}`;
    return `${dd}/${mm}/${year}`;
  };

  // --- All your beautiful JSX rendering functions remain the same ---

  const renderReadyState = () => (
    <div className="space-y-6">
      {/* ... your JSX for ready state ... */}
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
  
  // ... other render functions ...

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
        ) : error ? (
            /* renderErrorState() */ <div className="text-red-500">{error}</div>
        ) : passportData ? (
            /* renderCompleteState() */ <div>Complete!</div>
        ) : isReading ? (
            /* renderReadingState() */ <div>Reading...</div>
        ) : (
          renderReadyState()
        )}
      </CardContent>
    </Card>
  );
};

export default NFCPassportReader;