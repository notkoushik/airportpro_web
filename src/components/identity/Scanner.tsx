import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  Circle, 
  User, 
  FileText, 
  CreditCard, 
  Shield
} from "lucide-react";
import LivenessCheck from '../identity/LivenessCheck';
import PassportScanner from '../identity/PassportScanner';
import NFCPassportReader from '../identity/NFCPassportReader';

type ScanStep = 'liveness' | 'passport' | 'nfc' | 'complete';

interface StepData {
  liveness?: boolean;
  passport?: any;
  nfc?: any;
}

export const Scanner: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<ScanStep>('liveness');
  const [stepData, setStepData] = useState<StepData>({});
  const [progress, setProgress] = useState(25);

  const steps = [
    { 
      id: 'liveness', 
      title: 'Liveness Check', 
      description: 'Verify you are a real person',
      icon: User,
      progress: 25
    },
    { 
      id: 'passport', 
      title: 'Scan Passport', 
      description: 'Capture passport information',
      icon: FileText,
      progress: 50
    },
    { 
      id: 'nfc', 
      title: 'Read NFC Chip', 
      description: 'Extract encrypted data',
      icon: CreditCard,
      progress: 75
    },
    { 
      id: 'complete', 
      title: 'Complete', 
      description: 'Verification successful',
      icon: Shield,
      progress: 100
    }
  ];

  const handleLivenessComplete = (passed: boolean, result?: any) => {
    if (passed) {
      setStepData(prev => ({ ...prev, liveness: result }));
      setCurrentStep('passport');
      setProgress(50);
    }
  };

  const handlePassportScanComplete = (data: any) => {
    if (data) {
      setStepData(prev => ({ ...prev, passport: data }));
      setCurrentStep('nfc');
      setProgress(75);
    }
  };

  const handleNFCComplete = (data: any) => {
    setStepData(prev => ({ ...prev, nfc: data }));
    setCurrentStep('complete');
    setProgress(100);
  };

  const renderStepIndicator = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-card-foreground">Identity Verification</h2>
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
          Step {steps.findIndex(s => s.id === currentStep) + 1} of {steps.length}
        </Badge>
      </div>
      
      <div className="space-y-4">
        <Progress value={progress} className="h-3" />
        
        <div className="grid grid-cols-4 gap-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = step.id === currentStep;
            const isCompleted = steps.findIndex(s => s.id === currentStep) > index;
            
            return (
              <div
                key={step.id}
                className={`
                  text-center p-3 rounded-lg border-2 transition-all
                  ${isActive 
                    ? 'border-primary bg-primary/5 text-primary' 
                    : isCompleted 
                      ? 'border-success bg-success/5 text-success'
                      : 'border-muted bg-muted/30 text-muted-foreground'
                  }
                `}
              >
                <div className="flex justify-center mb-2">
                  {isCompleted ? (
                    <CheckCircle className="w-6 h-6" />
                  ) : (
                    <Icon className={`w-6 h-6 ${isActive ? 'animate-pulse' : ''}`} />
                  )}
                </div>
                <h3 className="text-sm font-semibold">{step.title}</h3>
                <p className="text-xs opacity-80">{step.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderCompletionSummary = () => (
    <Card className="bg-gradient-to-br from-success/5 to-success/10 border-success/20 shadow-floating">
      <CardHeader className="text-center">
        <div className="w-16 h-16 mx-auto bg-success/10 rounded-full flex items-center justify-center mb-4">
          <Shield className="w-8 h-8 text-success" />
        </div>
        <CardTitle className="text-success">Verification Complete!</CardTitle>
        <p className="text-muted-foreground">
          Your identity has been successfully verified
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-white/50 rounded-lg">
            <CheckCircle className="w-8 h-8 text-success mx-auto mb-2" />
            <h4 className="font-semibold">Liveness Verified</h4>
            <p className="text-sm text-muted-foreground">
              {stepData.liveness ? 'Real person confirmed' : 'Completed'}
            </p>
          </div>
          
          <div className="text-center p-4 bg-white/50 rounded-lg">
            <CheckCircle className="w-8 h-8 text-success mx-auto mb-2" />
            <h4 className="font-semibold">Passport Scanned</h4>
            <p className="text-sm text-muted-foreground">
              {stepData.passport ? `${stepData.passport.givenNames} ${stepData.passport.surname}` : 'Document processed'}
            </p>
          </div>
          
          <div className="text-center p-4 bg-white/50 rounded-lg">
            <CheckCircle className="w-8 h-8 text-success mx-auto mb-2" />
            <h4 className="font-semibold">NFC Data Read</h4>
            <p className="text-sm text-muted-foreground">
              {stepData.nfc ? 'Chip data extracted' : 'Security verified'}
            </p>
          </div>
        </div>

        {stepData.passport && (
          <div className="bg-white/50 rounded-lg p-4">
            <h4 className="font-semibold mb-3">Verified Information</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Name:</span>
                <p className="font-medium">{stepData.passport.givenNames} {stepData.passport.surname}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Nationality:</span>
                <p className="font-medium">{stepData.passport.nationality}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Document:</span>
                <p className="font-medium">{stepData.passport.documentNumber}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Expires:</span>
                <p className="font-medium">{stepData.passport.expirationDate}</p>
              </div>
            </div>
          </div>
        )}

        <div className="flex space-x-4">
          <Button 
            onClick={() => {
              setCurrentStep('liveness');
              setStepData({});
              setProgress(25);
            }}
            variant="outline"
            className="flex-1"
          >
            Start Over
          </Button>
          <Button 
            className="flex-1 bg-aviation-gradient text-white hover:opacity-90"
            onClick={() => {
              // Handle completion - could navigate to next page or call parent handler
              console.log('Verification complete:', stepData);
            }}
          >
            Continue to App
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white p-4">
      <div className="max-w-4xl mx-auto">
        {renderStepIndicator()}
        
        <div className="space-y-6">
          {currentStep === 'liveness' && (
            <LivenessCheck 
              onComplete={handleLivenessComplete}
              className="max-w-md mx-auto"
            />
          )}

          {currentStep === 'passport' && (
            <PassportScanner 
              onComplete={handlePassportScanComplete}
              className="max-w-2xl mx-auto"
            />
          )}

          {currentStep === 'nfc' && stepData.passport && (
            <NFCPassportReader 
              mrzData={{
                documentNumber: stepData.passport.documentNumber,
                dateOfBirth: stepData.passport.birthDate,
                dateOfExpiry: stepData.passport.expirationDate
              }}
              onComplete={handleNFCComplete}
              className="max-w-2xl mx-auto"
            />
          )}

          {currentStep === 'complete' && renderCompletionSummary()}
        </div>
      </div>
    </div>
  );
};

export default Scanner;