import React, { useState } from 'react';
import { Camera, Loader2, CheckCircle2, XCircle, RotateCcw, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { scanPassport } from '@/services/passportScanner'
import { PassportData, ScanResult } from '@/types/passport';

interface Props {
  onScanSuccess?: (data: PassportData) => void;
  onScanFailure?: (error: string) => void;
}

type ScanState = 'idle' | 'scanning' | 'success' | 'error';

export function UnifiedPassportScanner({ onScanSuccess, onScanFailure }: Props) {
  const navigate = useNavigate();

  const [state, setState] = useState<ScanState>('idle');
  const [passportData, setPassportData] = useState<PassportData | null>(null);
  const [error, setError] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const [status, setStatus] = useState<string>('');

  const handleScan = async () => {
  try {
    setState('scanning');
    setProgress(0);
    setStatus('Preparing camera...');
    
    console.log('=== UnifiedPassportScanner: Starting scan ===');
    
    // IMPORTANT: This calls the NATIVE scanner
    const result: ScanResult = await scanPassport();
    
    console.log('=== Scan complete ===');
    console.log('Result:', result);
    
    if (result.success && result.data) {
      setPassportData(result.data);
      setState('success');
      onScanSuccess?.(result.data);
    } else {
      setError(result.error || 'Unknown scanning error');
      setState('error');
      onScanFailure?.(result.error || 'Unknown error');
    }
    
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Scanning failed';
    console.error('=== Scan exception ===');
    console.error(errorMessage);
    setError(errorMessage);
    setState('error');
    onScanFailure?.(errorMessage);
  }
};


  const handleReset = () => {
    setState('idle');
    setPassportData(null);
    setError('');
    setProgress(0);
    setStatus('');
  };

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-6 w-6" />
            Passport Scanner
          </CardTitle>
          <CardDescription>
            Scan your passport to extract MRZ information
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Idle State */}
          {state === 'idle' && (
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  <strong>Instructions:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Ensure good lighting</li>
                    <li>Place passport on a flat, contrasting surface</li>
                    <li>Align the camera to capture the entire data page</li>
                    <li>Keep the passport still and avoid glare</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <Button 
                onClick={handleScan} 
                className="w-full"
                size="lg"
              >
                <Camera className="mr-2 h-5 w-5" />
                Scan Passport
              </Button>
            </div>
          )}

          {/* Scanning State */}
          {state === 'scanning' && (
            <div className="text-center space-y-4">
              <div className="flex flex-col items-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-lg font-medium">{status}</p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all" 
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-2">{Math.round(progress)}%</p>
              </div>
            </div>
          )}

          {/* Success State */}
          {state === 'success' && passportData && (
            <div className="space-y-4">
              <Alert className="border-green-500 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Passport scanned successfully!
                  {!passportData.checksumValid && (
                    <span className="block mt-1 text-yellow-700">
                      ⚠️ Warning: Checksum validation failed. Data may be inaccurate.
                    </span>
                  )}
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 gap-3">
                <InfoField label="Full Name" value={passportData.fullName} />
                <InfoField label="Nationality" value={passportData.nationality} />
                <InfoField label="Passport Number" value={passportData.passportNumber} />
                <InfoField label="Date of Birth" value={passportData.dateOfBirthFormatted} />
                <InfoField label="Gender" value={passportData.sex} />
                <InfoField label="Expiry Date" value={passportData.expiryDateFormatted} />
                <InfoField label="Issuing Country" value={passportData.issuingCountry} />
                <InfoField label="Document Type" value={passportData.documentType} />
              </div>

              {passportData.confidence && (
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <span className="text-sm font-medium">OCR Confidence:</span>
                  <Badge variant={passportData.confidence > 0.8 ? 'default' : 'secondary'}>
                    {(passportData.confidence * 100).toFixed(1)}%
                  </Badge>
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={handleGoHome} variant="outline" className="flex-1">
                  <Home className="mr-2 h-4 w-4" />
                  Go Home
                </Button>
                <Button onClick={handleReset} variant="default" className="flex-1">
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Scan Another
                </Button>
              </div>
            </div>
          )}

          {/* Error State */}
          {state === 'error' && (
            <div className="space-y-4">
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Scanning Failed</strong>
                  <p className="mt-1">{error}</p>
                </AlertDescription>
              </Alert>

              <Alert>
                <AlertDescription>
                  <strong>Troubleshooting Tips:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Ensure the MRZ (bottom 2 lines) is clearly visible</li>
                    <li>Try better lighting conditions</li>
                    <li>Clean your camera lens</li>
                    <li>Hold the camera steady</li>
                    <li>Make sure there's no glare on the passport</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <div className="flex gap-2">
                <Button onClick={handleGoHome} variant="outline" className="flex-1">
                  <Home className="mr-2 h-4 w-4" />
                  Go Home
                </Button>
                <Button onClick={handleReset} variant="default" className="flex-1">
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Helper component for displaying info fields
function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 bg-gray-50 rounded">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}