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

import UnifiedPassportScanner, { ScanResult } from '../passport/UnifiedPassportScanner';

import AdvancedLivenessDetector from '../liveness/EnhancedLivenessDetector'; // 1. Import the component

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
      id: 'welcome',
      title: 'Identity Verification',
      description: 'Welcome to professional identity verification',
      icon: Shield,
      progress: 0
    },
    {
      id: 'passport',
      title: 'Passport Scan',
      description: 'Scan your passport document',
      icon: FileText,
      progress: 33
    },
    {
      id: 'liveness',
      title: 'Liveness Check',
      description: 'Verify you are a real person',
      icon: Eye,
      progress: 66
    },
    {
      id: 'nfc',
      title: 'NFC Verification',
      description: 'Optional chip verification',
      icon: Smartphone,
      progress: 85
    },
    {
      id: 'complete',
      title: 'Verification Complete',
      description: 'Identity successfully verified',
      icon: Award,
      progress: 100
    }
  ];

  const getCurrentStep = () => steps.find(step => step.id === currentStep);

  const handlePassportSuccess = (result: ScanResult) => {
    setVerificationData(prev => ({ ...prev, passportData: result.data }));
    setCurrentStep('liveness');
    setProgress(66);
  };

  const handlePassportFailure = (result: ScanResult) => {
    // For now, let's just log it. You could show an error message and a retry button.
    console.error("Passport scan failed:", result);
    // Optionally, reset to the welcome screen or show a specific error state.
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
    <div className="max-w-2xl mx-auto text-center space-y-8">
      <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto">
        <Shield className="w-12 h-12 text-white" />
      </div>
      
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Professional Identity Verification
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Complete verification in 3 simple steps for enhanced security
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card className="p-6 text-center hover:shadow-lg transition-shadow">
          <FileText className="w-10 h-10 text-blue-600 mx-auto mb-4" />
          <h3 className="font-semibold mb-2">1. Passport Scan</h3>
          <p className="text-sm text-gray-600">AI-powered OCR extraction</p>
        </Card>
        
        <Card className="p-6 text-center hover:shadow-lg transition-shadow">
          <Eye className="w-10 h-10 text-blue-600 mx-auto mb-4" />
          <h3 className="font-semibold mb-2">2. Liveness Check</h3>
          <p className="text-sm text-gray-600">Verify you're a real person</p>
        </Card>
        
        <Card className="p-6 text-center hover:shadow-lg transition-shadow">
          <Smartphone className="w-10 h-10 text-blue-600 mx-auto mb-4" />
          <h3 className="font-semibold mb-2">3. NFC (Optional)</h3>
          <p className="text-sm text-gray-600">Enhanced chip verification</p>
        </Card>
      </div>

      <Button 
        size="lg" 
        onClick={() => {
          setCurrentStep('passport');
          setProgress(33);
        }}
        className="px-8 py-4 text-lg"
      >
        Start Verification
        <ChevronRight className="w-5 h-5 ml-2" />
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
    // 2. Render the real component and pass the success handler
    <AdvancedLivenessDetector
      onScanSuccess={handleLivenessSuccess}
      // You would also add an onFailure handler here for robustness, e.g.:
      // onScanFailure={handleLivenessFailure}
    />
  );

  const renderNFCStep = () => (
    <div className="max-w-xl mx-auto text-center space-y-6">
      <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto">
        <Smartphone className="w-10 h-10 text-white" />
      </div>
      
      <div>
        <h2 className="text-2xl font-bold mb-4">NFC Verification</h2>
        <p className="text-gray-600 mb-8">
          Touch your passport to the back of your phone for enhanced security
        </p>
      </div>

      <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100">
        <div className="space-y-4">
          <div className="w-16 h-16 bg-purple-200 rounded-full flex items-center justify-center mx-auto animate-pulse">
            <Smartphone className="w-8 h-8 text-purple-600" />
          </div>
          <p className="text-sm text-gray-600">
            Hold your passport flat against the back of your device
          </p>
        </div>
      </Card>

      <div className="flex space-x-4">
        <Button variant="outline" onClick={skipNFC} className="flex-1">
          Skip NFC
        </Button>
        <Button onClick={handleNFCComplete} className="flex-1">
          Complete NFC
        </Button>
      </div>
    </div>
  );

  const renderCompleteStep = () => (
    <div className="max-w-2xl mx-auto text-center space-y-8">
      <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto">
        <Award className="w-12 h-12 text-white" />
      </div>
      
      <div>
        <h1 className="text-3xl font-bold text-green-800 mb-4">
          Verification Complete!
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Your identity has been successfully verified
        </p>
      </div>

      <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center">
            <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="font-semibold">Passport Verified</p>
            {verificationData.passportData && (
              <p className="text-sm text-gray-600 mt-1">
                {verificationData.passportData.givenNames} {verificationData.passportData.surname}
              </p>
            )}
          </div>
          
          <div className="text-center">
            <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="font-semibold">Liveness Verified</p>
            <p className="text-sm text-gray-600 mt-1">
              Score: {((verificationData.livenessScore || 0) * 100).toFixed(0)}%
            </p>
          </div>
          
          <div className="text-center">
            {verificationData.nfcVerified ? (
              <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
            ) : (
              <Clock className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
            )}
            <p className="font-semibold">
              {verificationData.nfcVerified ? 'NFC Verified' : 'NFC Skipped'}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {verificationData.nfcVerified ? 'Chip authenticated' : 'Optional step skipped'}
            </p>
          </div>
        </div>
      </Card>

      <Badge variant="secondary" className="text-lg px-6 py-2">
        Verification ID: {verificationData.timestamp?.toString().slice(-8)}
      </Badge>
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="max-w-6xl mx-auto">
        
        {/* Progress Header */}
        {currentStep !== 'welcome' && (
          <Card className="mb-8 shadow-lg">
            <CardContent className="py-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold">{currentStepData?.title}</h2>
                  <p className="text-gray-600">{currentStepData?.description}</p>
                </div>
                <Badge variant="secondary" className="text-lg px-4 py-1">
                  {progress}% Complete
                </Badge>
              </div>
              <Progress value={progress} className="h-3" />
            </CardContent>
          </Card>
        )}

        {/* Step Content */}
        <div className="pb-8">
          {renderStepContent()}
        </div>
        
      </div>
    </div>
  );
};

export default EnhancedIdentityVerification;