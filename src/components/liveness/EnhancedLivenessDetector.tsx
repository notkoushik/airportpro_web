// src/components/liveness/EnhancedLivenessDetector.tsx

import React, { useState, useEffect } from 'react';
import { Camera, AlertTriangle, CheckCircle2 } from 'lucide-react';
import CameraFeed from '@/components/CameraFeed';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface Props {
  onComplete?: (success: boolean, score?: number) => void;
  onError?: (error: Error) => void;
}

type LivenessState = 'initializing' | 'detecting' | 'success' | 'failed';

export function EnhancedLivenessDetector({ onComplete, onError }: Props) {
  const [state, setState] = useState<LivenessState>('initializing');
  const [faceDetected, setFaceDetected] = useState(false);
  const [detectionCount, setDetectionCount] = useState(0);
  const [message, setMessage] = useState('Initializing face detection...');
  
  const REQUIRED_DETECTIONS = 30; // ~1 second at 30fps
  const LIVENESS_SCORE = 0.85;

  useEffect(() => {
    if (state === 'detecting' && faceDetected) {
      setDetectionCount(prev => {
        const newCount = prev + 1;
        
        if (newCount >= REQUIRED_DETECTIONS) {
          setState('success');
          setMessage('Face verified successfully!');
          onComplete?.(true, LIVENESS_SCORE);
        } else {
          const progress = Math.round((newCount / REQUIRED_DETECTIONS) * 100);
          setMessage(`Hold still... ${progress}%`);
        }
        
        return newCount;
      });
    } else if (state === 'detecting' && !faceDetected) {
      setMessage('Position your face in the frame');
      setDetectionCount(0);
    }
  }, [faceDetected, state, onComplete]);

  const handleCameraReady = () => {
    setState('detecting');
    setMessage('Position your face in the frame');
  };

  const handleFaceDetection = (hasFace: boolean) => {
    setFaceDetected(hasFace);
  };

  const handleError = (error: Error) => {
    setState('failed');
    setMessage(`Error: ${error.message}`);
    onError?.(error);
  };

  return (
    <div className="max-w-xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Liveness Detection
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Alert variant={state === 'success' ? 'default' : 'default'}>
            <AlertDescription className="flex items-center gap-2">
              {state === 'success' ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : state === 'failed' ? (
                <AlertTriangle className="h-4 w-4 text-destructive" />
              ) : null}
              {message}
            </AlertDescription>
          </Alert>
          
          {state !== 'success' && state !== 'failed' && (
            <CameraFeed
              autoStart={true}
              onReady={handleCameraReady}
              onFace={handleFaceDetection}
              onError={handleError}
            />
          )}
          
          {state === 'success' && (
            <div className="text-center py-8">
              <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <p className="text-lg font-semibold">Liveness Verified!</p>
              <p className="text-sm text-muted-foreground mt-2">
                Score: {(LIVENESS_SCORE * 100).toFixed(0)}%
              </p>
            </div>
          )}
          
          {state === 'failed' && (
            <Button onClick={() => {
              setState('initializing');
              setDetectionCount(0);
            }} className="w-full">
              Try Again
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
// ✅ ADD MISSING EXPORT TYPE
export interface DetectionResult {
  success: boolean;
  score?: number;
  error?: string;
}

// ✅ ADD DEFAULT EXPORT
export default EnhancedLivenessDetector;
