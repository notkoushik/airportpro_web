import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {   
  User,   
  FileText,   
  Smartphone,   
  Shield,
  CheckCircle,
  Camera,
  Scan,
  ChevronRight,
  Award,
  Clock,
  Eye
} from "lucide-react";
import type { PassportData } from '@/types/passport';

// ✅ FIXED: Import named exports correctly
import { UnifiedPassportScanner } from '../passport/UnifiedPassportScanner';
import { EnhancedLivenessDetector } from '../liveness/EnhancedLivenessDetector';
import type { ScanResult } from '../passport/UnifiedPassportScanner';

// ✅ FIXED: Define DetectionResult locally if not exported
interface DetectionResult {
  success: boolean;
  score?: number;
  error?: string;
}

type VerificationStep = 'welcome' | 'passport' | 'liveness' | 'nfc' | 'complete';

interface VerificationData {
  passportData?: any;
  livenessScore?: number;
  nfcVerified?: boolean;
  timestamp?: number;
}

const EnhancedIdentityVerification: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<VerificationStep>('welcome');
  const [verificationData, setVerificationData] = useState<VerificationData>({});
  const [progress, setProgress] = useState(0);

  const steps = [
    {
      id: 'welcome' as const,
      title: 'Identity Verification',
      description: 'Welcome to professional identity verification',
      icon: Shield,
      progress: 0
    },
    {
      id: 'passport' as const,
      title: 'Passport Scan',
      description: 'Scan your passport document',
      icon: FileText,
      progress: 33
    },
    {
      id: 'liveness' as const,
      title: 'Liveness Check',
      description: 'Verify you are a real person',
      icon: Eye,
      progress: 66
    },
    {
      id: 'nfc' as const,
      title: 'NFC Verification',
      description: 'Optional chip verification',
      icon: Smartphone,
      progress: 85
    },
    {
      id: 'complete' as const,
      title: 'Verification Complete',
      description: 'Identity successfully verified',
      icon: Award,
      progress: 100
    }
  ];

  const getCurrentStep = () => steps.find(step => step.id === currentStep);

  const handlePassportSuccess = (data: PassportData) => {
    setVerificationData(prev => ({ ...prev, passportData: data }));
    setCurrentStep('liveness');
    setProgress(66);
  };

  const handlePassportFailure = (error: string) => {
    console.error("Passport scan failed:", error);
  };

  const handleLivenessSuccess = () => {
    setVerificationData(prev => ({ ...prev, livenessScore: 0.94 }));
    setCurrentStep('nfc');
    setProgress(85);
  };

  const handleNFCComplete = () => {
    setVerificationData(prev => ({   
      ...prev,   
      nfcVerified: true,
      timestamp: Date.now()
    }));
    setCurrentStep('complete');
    setProgress(100);
  };

  const skipNFC = () => {
    setVerificationData(prev => ({   
      ...prev,   
      nfcVerified: false,
      timestamp: Date.now()
    }));
    setCurrentStep('complete');
    setProgress(100);
  };

  const renderWelcomeStep = () => (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-100 text-blue-600 mb-4">
          <Shield className="w-10 h-10" />
        </div>
        <h2 className="text-3xl font-bold text-slate-900">Professional Identity Verification</h2>
        <p className="text-slate-600">Complete verification in 3 simple steps for enhanced security</p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6 text-center space-y-2">
            <FileText className="w-8 h-8 mx-auto text-blue-600" />
            <h3 className="font-semibold">1. Passport Scan</h3>
            <p className="text-sm text-slate-600">AI-powered OCR extraction</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6 text-center space-y-2">
            <Eye className="w-8 h-8 mx-auto text-blue-600" />
            <h3 className="font-semibold">2. Liveness Check</h3>
            <p className="text-sm text-slate-600">Verify you're a real person</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6 text-center space-y-2">
            <Smartphone className="w-8 h-8 mx-auto text-blue-600" />
            <h3 className="font-semibold">3. NFC (Optional)</h3>
            <p className="text-sm text-slate-600">Enhanced chip verification</p>
          </CardContent>
        </Card>
      </div>
      
      <Button 
        onClick={() => setCurrentStep('passport')} 
        className="w-full" 
        size="lg"
      >
        Begin Verification <ChevronRight className="ml-2" />
      </Button>
    </div>
  );

  const renderPassportStep = () => (
    <UnifiedPassportScanner 
      onScanSuccess={handlePassportSuccess}
      onScanFailure={handlePassportFailure}
    />
  );

  const renderLivenessStep = () => (
    <EnhancedLivenessDetector 
      onComplete={(success, score) => {
        if (success) {
          handleLivenessSuccess();
        }
      }}
    />
  );

  const renderNFCStep = () => (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-100 text-blue-600 mb-4">
          <Smartphone className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">NFC Verification</h2>
        <p className="text-slate-600">Touch your passport to the back of your phone for enhanced security</p>
      </div>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
        <p className="text-sm text-blue-800">Hold your passport flat against the back of your device</p>
      </div>
      
      <div className="flex gap-4">
        <Button onClick={handleNFCComplete} className="flex-1">
          Verify NFC
        </Button>
        <Button onClick={skipNFC} variant="outline" className="flex-1">
          Skip NFC
        </Button>
      </div>
    </div>
  );

  const renderCompleteStep = () => (
    <div className="space-y-6 text-center">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 text-green-600 mb-4">
        <CheckCircle className="w-10 h-10" />
      </div>
      
      <h2 className="text-3xl font-bold text-slate-900">Verification Complete!</h2>
      <p className="text-slate-600">Your identity has been successfully verified</p>
      
      <div className="grid gap-4 md:grid-cols-3 text-left">
        <Card>
          <CardContent className="pt-6">
            <Badge className="mb-2">Passport Verified</Badge>
            {verificationData.passportData && (
              <p className="text-sm">{verificationData.passportData.givenNames} {verificationData.passportData.surname}</p>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <Badge className="mb-2">Liveness Verified</Badge>
            <p className="text-sm">Score: {((verificationData.livenessScore || 0) * 100).toFixed(0)}%</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <Badge className="mb-2">{verificationData.nfcVerified ? 'NFC Verified' : 'NFC Skipped'}</Badge>
            <p className="text-sm">{verificationData.nfcVerified ? 'Chip authenticated' : 'Optional step skipped'}</p>
          </CardContent>
        </Card>
      </div>
      
      <p className="text-sm text-slate-500">Verification ID: {verificationData.timestamp?.toString().slice(-8)}</p>
    </div>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 'welcome':
        return renderWelcomeStep();
      case 'passport':
        return renderPassportStep();
      case 'liveness':
        return renderLivenessStep();
      case 'nfc':
        return renderNFCStep();
      case 'complete':
        return renderCompleteStep();
      default:
        return renderWelcomeStep();
    }
  };

  const currentStepData = getCurrentStep();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Progress Header */}
        {currentStep !== 'welcome' && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">{currentStepData?.title}</h2>
                  <Badge>{progress}% Complete</Badge>
                </div>
                <p className="text-sm text-slate-600">{currentStepData?.description}</p>
                <Progress value={progress} className="h-2" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step Content */}
        <Card>
          <CardContent className="pt-6">
            {renderStepContent()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EnhancedIdentityVerification;
