import React, { useState, useEffect } from 'react';
import { Camera, CameraResultType } from '@capacitor/camera';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, Camera as CameraIcon, CheckCircle, XCircle, RefreshCw } from "lucide-react";

interface LivenessResult {
  isLive: boolean;
  confidence: number;
  faceDetected: boolean;
  eyesOpen: boolean;
  headPose: boolean;
}

interface LivenessCheckProps {
  onComplete: (passed: boolean, result?: LivenessResult) => void;
  className?: string;
}

export const LivenessCheck: React.FC<LivenessCheckProps> = ({ 
  onComplete, 
  className = "" 
}) => {
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<LivenessResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'ready' | 'camera' | 'processing' | 'complete'>('ready');
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const steps = [
    { id: 'ready', title: 'Ready to Start', description: 'Position yourself in front of the camera' },
    { id: 'camera', title: 'Taking Photo', description: 'Look directly at camera and blink naturally' },
    { id: 'processing', title: 'Processing', description: 'Analyzing liveness indicators...' },
    { id: 'complete', title: 'Complete', description: 'Liveness verification finished' }
  ];

  const startLivenessCheck = async () => {
    setIsChecking(true);
    setError(null);
    setResult(null);
    setStep('camera');

    try {
      // Take photo for liveness detection
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        width: 640,
        height: 480,
        correctOrientation: true
      });

      if (!image.dataUrl) {
        throw new Error('Failed to capture image');
      }

      setImagePreview(image.dataUrl);
      setStep('processing');

      // Call native liveness detection
      const livenessResult = await window.CapacitorCustomNative?.checkLiveness({
        imageData: image.dataUrl
      });

      if (!livenessResult) {
        throw new Error('Liveness detection service unavailable');
      }

      const result: LivenessResult = {
        isLive: livenessResult.isLive || false,
        confidence: livenessResult.confidence || 0,
        faceDetected: livenessResult.faceDetected || false,
        eyesOpen: livenessResult.eyesOpen || false,
        headPose: livenessResult.headPose || false
      };

      setResult(result);
      setStep('complete');
      
      // Call completion callback
      onComplete(result.isLive, result);

    } catch (error) {
      console.error('Liveness check failed:', error);
      setError(error instanceof Error ? error.message : 'Liveness check failed');
      setStep('ready');
    } finally {
      setIsChecking(false);
    }
  };

  const resetCheck = () => {
    setResult(null);
    setError(null);
    setStep('ready');
    setImagePreview(null);
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center space-x-2 mb-6">
      {steps.map((stepItem, index) => (
        <React.Fragment key={stepItem.id}>
          <div className={`
            flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium
            ${step === stepItem.id 
              ? 'bg-primary text-primary-foreground' 
              : steps.findIndex(s => s.id === step) > index
                ? 'bg-success text-success-foreground'
                : 'bg-muted text-muted-foreground'
            }
          `}>
            {steps.findIndex(s => s.id === step) > index ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              index + 1
            )}
          </div>
          {index < steps.length - 1 && (
            <div className={`
              w-8 h-0.5 rounded
              ${steps.findIndex(s => s.id === step) > index 
                ? 'bg-success' 
                : 'bg-muted'
              }
            `} />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  const renderReadyState = () => (
    <div className="text-center space-y-4">
      <div className="w-32 h-32 mx-auto bg-gradient-to-br from-primary/10 to-primary/20 rounded-full flex items-center justify-center">
        <CameraIcon className="w-12 h-12 text-primary" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-card-foreground">Liveness Verification</h3>
        <p className="text-sm text-muted-foreground mt-1">
          We'll take a photo to verify you're a real person
        </p>
      </div>
      <div className="bg-muted/50 rounded-lg p-4 text-left">
        <h4 className="text-sm font-medium text-card-foreground mb-2">Instructions:</h4>
        <ul className="text-xs text-muted-foreground space-y-1">
          <li>• Ensure good lighting on your face</li>
          <li>• Look directly at the camera</li>
          <li>• Remove sunglasses or face coverings</li>
          <li>• Stay still during capture</li>
        </ul>
      </div>
      <Button 
        onClick={startLivenessCheck} 
        className="w-full bg-aviation-gradient hover:opacity-90 text-white"
        disabled={isChecking}
      >
        <CameraIcon className="w-4 h-4 mr-2" />
        Start Liveness Check
      </Button>
    </div>
  );

  const renderProcessingState = () => (
    <div className="text-center space-y-4">
      <div className="w-32 h-32 mx-auto bg-gradient-to-br from-primary/10 to-primary/20 rounded-full flex items-center justify-center animate-pulse">
        <RefreshCw className="w-12 h-12 text-primary animate-spin" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-card-foreground">Processing...</h3>
        <p className="text-sm text-muted-foreground">
          Analyzing liveness indicators
        </p>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span>Detecting face...</span>
          <span className="text-primary">✓</span>
        </div>
        <div className="flex justify-between text-xs">
          <span>Checking eye movement...</span>
          <div className="animate-spin w-3 h-3 border border-primary border-t-transparent rounded-full"></div>
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Verifying liveness...</span>
          <div className="w-3 h-3"></div>
        </div>
      </div>
    </div>
  );

  const renderResultState = () => (
    <div className="space-y-4">
      {imagePreview && (
        <div className="w-32 h-32 mx-auto rounded-full overflow-hidden border-4 border-primary/20">
          <img 
            src={imagePreview} 
            alt="Captured" 
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="text-center">
        {result?.isLive ? (
          <div className="space-y-2">
            <CheckCircle className="w-12 h-12 text-success mx-auto" />
            <h3 className="text-lg font-semibold text-success">Liveness Verified!</h3>
            <p className="text-sm text-muted-foreground">
              You have been successfully verified as a real person
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <XCircle className="w-12 h-12 text-destructive mx-auto" />
            <h3 className="text-lg font-semibold text-destructive">Verification Failed</h3>
            <p className="text-sm text-muted-foreground">
              Please try again with better lighting and follow the instructions
            </p>
          </div>
        )}
      </div>

      {result && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
            <span>Face Detected</span>
            {result.faceDetected ? (
              <CheckCircle className="w-4 h-4 text-success" />
            ) : (
              <XCircle className="w-4 h-4 text-destructive" />
            )}
          </div>
          <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
            <span>Eyes Open</span>
            {result.eyesOpen ? (
              <Eye className="w-4 h-4 text-success" />
            ) : (
              <EyeOff className="w-4 h-4 text-destructive" />
            )}
          </div>
          <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
            <span>Head Position</span>
            {result.headPose ? (
              <CheckCircle className="w-4 h-4 text-success" />
            ) : (
              <XCircle className="w-4 h-4 text-destructive" />
            )}
          </div>
          <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
            <span>Confidence</span>
            <Badge variant={result.confidence > 0.8 ? "default" : "secondary"}>
              {Math.round(result.confidence * 100)}%
            </Badge>
          </div>
        </div>
      )}

      <div className="flex space-x-2">
        <Button 
          variant="outline" 
          onClick={resetCheck}
          className="flex-1"
        >
          Try Again
        </Button>
        {result?.isLive && onComplete && (
          <Button 
            onClick={() => onComplete(true, result)}
            className="flex-1 bg-success text-success-foreground hover:bg-success/90"
          >
            Continue
          </Button>
        )}
      </div>
    </div>
  );

  const renderErrorState = () => (
    <div className="text-center space-y-4">
      <XCircle className="w-12 h-12 text-destructive mx-auto" />
      <div>
        <h3 className="text-lg font-semibold text-destructive">Error</h3>
        <p className="text-sm text-muted-foreground mt-1">{error}</p>
      </div>
      <div className="bg-destructive/10 rounded-lg p-4 text-left">
        <h4 className="text-sm font-medium text-destructive mb-2">Troubleshooting:</h4>
        <ul className="text-xs text-destructive/80 space-y-1">
          <li>• Check camera permissions</li>
          <li>• Ensure good lighting</li>
          <li>• Try again in a few moments</li>
          <li>• Make sure camera is not in use by another app</li>
        </ul>
      </div>
      <Button 
        onClick={resetCheck}
        variant="outline"
        className="w-full"
      >
        Try Again
      </Button>
    </div>
  );

  return (
    <Card className={`liveness-check bg-card-gradient border-primary/20 shadow-aviation ${className}`}>
      <CardHeader className="text-center pb-4">
        <CardTitle className="text-primary">Identity Verification</CardTitle>
        {renderStepIndicator()}
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? renderErrorState() : 
         step === 'ready' ? renderReadyState() :
         step === 'processing' ? renderProcessingState() :
         renderResultState()
        }
      </CardContent>
    </Card>
  );
};

// Extend window interface for TypeScript
declare global {
  interface Window {
    CapacitorCustomNative?: {
      checkLiveness: (params: { imageData: string }) => Promise<{
        isLive: boolean;
        confidence: number;
        faceDetected: boolean;
        eyesOpen: boolean;
        headPose: boolean;
      }>;
    };
  }
}

export default LivenessCheck;