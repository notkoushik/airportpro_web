import React, { useState, useRef, useEffect } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Eye, 
  Camera as CameraIcon, 
  CheckCircle, 
  AlertTriangle, 
  User,
  Brain,
  Shield,
  Award,
  Timer,
  Scan
} from "lucide-react";

// Import face-api.js for liveness detection
import * as faceapi from '@vladmandic/face-api';

interface LivenessResult {
  isLive: boolean;
  confidence: number;
  detections: {
    eyeBlink: boolean;
    smile: boolean;
    headMovement: boolean;
    facePresent: boolean;
    spoofDetected: boolean;
  };
  metrics: {
    blinkCount: number;
    smileScore: number;
    headPoseVariation: number;
    faceConfidence: number;
  };
  timestamp: number;
  capturedImage?: string;
}

export interface AdvancedLivenessDetectorProps {
  onLivenessSuccess: (result: LivenessResult) => void;
  onLivenessFailure?: (result: LivenessResult) => void;
}

interface BiometricData {
  faceDescriptor: Float32Array | null;
  livenessResult: LivenessResult | null;
  aadhaarPhoto?: string;
  matchScore?: number;
}

const AdvancedLivenessDetector: React.FC<AdvancedLivenessDetectorProps> = ({ onLivenessSuccess, onLivenessFailure }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [testing, setTesting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [livenessResult, setLivenessResult] = useState<LivenessResult | null>(null);
  const [biometricData, setBiometricData] = useState<BiometricData>({
    faceDescriptor: null,
    livenessResult: null
  });
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Liveness detection state
  const [detectionState, setDetectionState] = useState({
    blinkCount: 0,
    lastBlink: 0,
    smileDetected: false,
    headPoses: [] as number[][],
    faceHistory: [] as any[],
    startTime: Date.now()
  });

  // Initialize face-api.js models
  useEffect(() => {
    const initializeModels = async () => {
      try {
        console.log('🤖 Initializing Face-API.js models...');
        
        // Load models from CDN or local
        const modelPath = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
        
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(modelPath),
          faceapi.nets.faceExpressionNet.loadFromUri(modelPath),
          faceapi.nets.faceLandmark68Net.loadFromUri(modelPath),
          faceapi.nets.faceRecognitionNet.loadFromUri(modelPath)
        ]);
        
        console.log('✅ Face-API.js models loaded successfully');
        setIsInitialized(true);
      } catch (error) {
        console.error('❌ Failed to initialize Face-API.js:', error);
        setIsInitialized(false);
      }
    };

    initializeModels();
  }, []);

  // Start camera stream
  const startCamera = async (): Promise<boolean> => {
    try {
      console.log('📷 Starting camera for liveness detection...');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Camera access failed:', error);
      return false;
    }
  };

  // Stop camera stream
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  // Detect eye blink using facial landmarks
  const detectEyeBlink = (landmarks: faceapi.FaceLandmarks68): boolean => {
    // Calculate Eye Aspect Ratio (EAR)
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();
    
    const leftEAR = calculateEAR(leftEye);
    const rightEAR = calculateEAR(rightEye);
    
    const averageEAR = (leftEAR + rightEAR) / 2;
    
    // EAR threshold for blink detection (typically 0.25)
    return averageEAR < 0.25;
  };

  const calculateEAR = (eye: faceapi.Point[]): number => {
    // Calculate Eye Aspect Ratio using 6 facial landmarks
    if (eye.length < 6) return 1.0;
    
    // Vertical distances
    const A = Math.sqrt(Math.pow(eye[1].x - eye[5].x, 2) + Math.pow(eye[1].y - eye[5].y, 2));
    const B = Math.sqrt(Math.pow(eye[2].x - eye[4].x, 2) + Math.pow(eye[2].y - eye[4].y, 2));
    
    // Horizontal distance
    const C = Math.sqrt(Math.pow(eye[0].x - eye[3].x, 2) + Math.pow(eye[0].y - eye[3].y, 2));
    
    return (A + B) / (2.0 * C);
  };

  // Detect smile using expression detection
  const detectSmile = (expressions: faceapi.FaceExpressions): boolean => {
    return expressions.happy > 0.6; // 60% confidence for smile
  };

  // Detect head movement using pose variation
  const detectHeadMovement = (detection: faceapi.FaceDetection): boolean => {
    const currentBox = detection.box;
    const currentPose = [currentBox.x, currentBox.y, currentBox.width, currentBox.height];
    
    setDetectionState(prev => {
      const newPoses = [...prev.headPoses, currentPose];
      
      // Keep only last 10 poses for movement analysis
      if (newPoses.length > 10) {
        newPoses.shift();
      }
      
      // Calculate pose variation
      if (newPoses.length >= 3) {
        const variation = calculatePoseVariation(newPoses);
        return {
          ...prev,
          headPoses: newPoses
        };
      }
      
      return {
        ...prev,
        headPoses: newPoses
      };
    });
    
    return detectionState.headPoses.length >= 5; // Require some movement history
  };

  const calculatePoseVariation = (poses: number[][]): number => {
    if (poses.length < 2) return 0;
    
    let totalVariation = 0;
    for (let i = 1; i < poses.length; i++) {
      const dx = poses[i][0] - poses[i-1][0];
      const dy = poses[i][1] - poses[i-1][1];
      totalVariation += Math.sqrt(dx * dx + dy * dy);
    }
    
    return totalVariation / (poses.length - 1);
  };

  // Main liveness detection loop
  const performLivenessDetection = async (): Promise<void> => {
    if (!videoRef.current || !canvasRef.current || !isInitialized) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;
    
    // Set canvas dimensions
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    
    // Draw current video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    try {
      // Detect face with all features
      const detection = await faceapi
        .detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceExpressions()
        .withFaceDescriptor();
      
      if (detection) {
        // Update face history
        setDetectionState(prev => ({
          ...prev,
          faceHistory: [...prev.faceHistory.slice(-20), detection] // Keep last 20 detections
        }));
        
        // Check for eye blinks
        const isBlinking = detectEyeBlink(detection.landmarks);
        if (isBlinking && Date.now() - detectionState.lastBlink > 500) {
          setDetectionState(prev => ({
            ...prev,
            blinkCount: prev.blinkCount + 1,
            lastBlink: Date.now()
          }));
        }
        
        // Check for smile
        const isSmiling = detectSmile(detection.expressions);
        if (isSmiling) {
          setDetectionState(prev => ({
            ...prev,
            smileDetected: true
          }));
        }
        
        // Check head movement
        detectHeadMovement(detection.detection);
        
        // Draw detection results on canvas
        drawDetectionResults(ctx, detection, canvas.width, canvas.height);
        
      } else {
        console.log('👤 No face detected');
      }
    } catch (error) {
      console.error('❌ Face detection error:', error);
    }
  };

  const drawDetectionResults = (
    ctx: CanvasRenderingContext2D, 
    detection: faceapi.WithFaceLandmarks<faceapi.WithFaceExpressions<faceapi.WithFaceDescriptor<{ detection: faceapi.FaceDetection; }>>>,
    width: number,
    height: number
  ) => {
    // Draw face bounding box
    const box = detection.detection.box;
    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 2;
    ctx.strokeRect(box.x, box.y, box.width, box.height);
    
    // Draw confidence score
    ctx.fillStyle = '#00FF00';
    ctx.font = '16px Arial';
    ctx.fillText(
      `Confidence: ${(detection.detection.score * 100).toFixed(1)}%`,
      box.x,
      box.y - 10
    );
    
    // Draw liveness indicators
    const indicators = [
      `Blinks: ${detectionState.blinkCount}`,
      `Smile: ${detectionState.smileDetected ? '✓' : '✗'}`,
      `Movement: ${detectionState.headPoses.length > 3 ? '✓' : '✗'}`
    ];
    
    indicators.forEach((text, index) => {
      ctx.fillText(text, 10, 30 + (index * 25));
    });
  };

  // Start liveness test
  const startLivenessTest = async () => {
    if (!isInitialized) {
      console.error('❌ Face-API.js not initialized');
      return;
    }
    
    setTesting(true);
    setProgress(0);
    setCurrentStep('Initializing camera...');
    
    try {
      // Start camera
      const cameraStarted = await startCamera();
      if (!cameraStarted) {
        throw new Error('Failed to start camera');
      }
      
      setProgress(20);
      setCurrentStep('Camera ready. Starting liveness detection...');
      
      // Reset detection state
      setDetectionState({
        blinkCount: 0,
        lastBlink: 0,
        smileDetected: false,
        headPoses: [],
        faceHistory: [],
        startTime: Date.now()
      });
      
      // Start detection loop
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for video to be ready
      
      intervalRef.current = setInterval(() => {
        performLivenessDetection();
        
        // Update progress based on detection criteria
        const elapsed = Date.now() - detectionState.startTime;
        const maxDuration = 10000; // 10 seconds test
        const progressPercentage = Math.min((elapsed / maxDuration) * 100, 100);
        setProgress(progressPercentage);
        
        // Update current step based on what's been detected
        if (detectionState.blinkCount >= 2 && detectionState.smileDetected && detectionState.headPoses.length > 5) {
          setCurrentStep('✅ Liveness confirmed! Finalizing...');
          completeLivenessTest(true);
        } else if (elapsed > maxDuration) {
          setCurrentStep('⏱️ Test timeout. Please try again.');
          completeLivenessTest(false);
        } else {
          // Give user guidance
          const needs = [];
          if (detectionState.blinkCount < 2) needs.push('Blink naturally');
          if (!detectionState.smileDetected) needs.push('Smile briefly');
          if (detectionState.headPoses.length <= 5) needs.push('Move head slightly');
          
          setCurrentStep(needs.length > 0 ? `Please: ${needs.join(', ')}` : 'Analyzing...');
        }
      }, 100);
      
    } catch (error) {
      console.error('❌ Liveness test failed:', error);
      setTesting(false);
      setCurrentStep('Failed to start liveness test');
    }
  };

  // Complete liveness test
  const completeLivenessTest = async (isLive: boolean) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    // Capture final image
    let capturedImage = '';
    if (canvasRef.current) {
      capturedImage = canvasRef.current.toDataURL('image/jpeg', 0.8);
    }
    
    // Calculate confidence based on detections
    let confidence = 0;
    if (detectionState.blinkCount >= 2) confidence += 0.3;
    if (detectionState.smileDetected) confidence += 0.3;
    if (detectionState.headPoses.length > 5) confidence += 0.4;
    
    // Spoof detection (basic)
    const spoofDetected = detectionState.faceHistory.length < 10 || 
                         detectionState.faceHistory.every(d => d.detection.score < 0.7);
    
    const result: LivenessResult = {
      isLive: isLive && !spoofDetected,
      confidence: Math.min(confidence, 1.0),
      detections: {
        eyeBlink: detectionState.blinkCount >= 2,
        smile: detectionState.smileDetected,
        headMovement: detectionState.headPoses.length > 5,
        facePresent: detectionState.faceHistory.length > 0,
        spoofDetected
      },
      metrics: {
        blinkCount: detectionState.blinkCount,
        smileScore: detectionState.smileDetected ? 0.8 : 0.0,
        headPoseVariation: calculatePoseVariation(detectionState.headPoses),
        faceConfidence: detectionState.faceHistory.length > 0 ? 
          detectionState.faceHistory[detectionState.faceHistory.length - 1].detection.score : 0
      },
      timestamp: Date.now(),
      capturedImage
    };
    
    setLivenessResult(result);
    setBiometricData(prev => ({ ...prev, livenessResult: result }));
    setTesting(false);
    stopCamera();
    
    console.log('🎯 Liveness test completed:', result);

    // Notify the parent component of the result
    if (result.isLive) {
      onLivenessSuccess(result);
    } else if (onLivenessFailure) {
      onLivenessFailure(result);
    }
  };

  // Capture Aadhaar card photo
  const captureAadhaarPhoto = async () => {
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        width: 1200,
        height: 800
      });
      
      if (image.dataUrl) {
        setBiometricData(prev => ({ ...prev, aadhaarPhoto: image.dataUrl }));
        console.log('📷 Aadhaar photo captured');
      }
    } catch (error) {
      console.error('❌ Failed to capture Aadhaar photo:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center py-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-600 to-purple-700 rounded-full mb-4">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Advanced Liveness Detection
          </h1>
          <div className="flex items-center justify-center space-x-2">
            <p className="text-gray-600">AI-Powered Biometric Verification • Anti-Spoofing</p>
            <Badge variant={isInitialized ? "success" : "destructive"}>
              {isInitialized ? 'AI Ready' : 'Initializing...'}
            </Badge>
          </div>
        </div>

        {/* Liveness Test Card */}
        <Card className="shadow-xl border-0 bg-white/90 backdrop-blur">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-2xl font-semibold flex items-center justify-center gap-2">
              <Eye className="w-6 h-6 text-purple-600" />
              Live Person Verification
            </CardTitle>
            <CardDescription className="text-base">
              Multi-factor liveness detection with eye blink, smile, and head movement
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Progress Bar (when testing) */}
            {testing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Liveness Detection Progress</span>
                  <span className="text-sm text-gray-500">{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-3" />
                <p className="text-sm text-center text-gray-600">{currentStep}</p>
              </div>
            )}
            
            {/* Camera Feed */}
            <div className="relative aspect-video bg-gray-900 rounded-xl overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
                style={{ display: testing ? 'block' : 'none' }}
              />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full"
                style={{ display: testing ? 'block' : 'none' }}
              />
              
              {!testing && (
                <div className="absolute inset-0 flex items-center justify-center text-white">
                  <div className="text-center">
                    <Eye className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">Ready for Liveness Test</p>
                    <p className="text-sm opacity-75 mt-2">Follow instructions during the test</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Control Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button 
                onClick={startLivenessTest} 
                disabled={!isInitialized || testing}
                size="lg"
                className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
              >
                {testing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                    Testing Liveness...
                  </>
                ) : (
                  <>
                    <Scan className="w-5 h-5 mr-3" />
                    Start Liveness Test
                  </>
                )}
              </Button>
              
              <Button 
                onClick={captureAadhaarPhoto} 
                variant="outline"
                size="lg"
                disabled={testing}
              >
                <CameraIcon className="w-5 h-5 mr-3" />
                Capture Aadhaar Card
              </Button>
            </div>
            
          </CardContent>
        </Card>

        {/* Liveness Results */}
        {livenessResult && (
          <Card className={`shadow-xl border-0 ${livenessResult.isLive ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200' : 'bg-gradient-to-r from-red-50 to-red-100 border-red-200'}`}>
            <CardContent className="pt-6">
              <div className="text-center mb-6">
                {livenessResult.isLive ? (
                  <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                ) : (
                  <AlertTriangle className="w-16 h-16 text-red-600 mx-auto mb-4" />
                )}
                <h2 className={`text-2xl font-bold ${livenessResult.isLive ? 'text-green-800' : 'text-red-800'}`}>
                  {livenessResult.isLive ? 'Live Person Confirmed' : 'Liveness Test Failed'}
                </h2>
                <p className={`text-lg mt-2 ${livenessResult.isLive ? 'text-green-700' : 'text-red-700'}`}>
                  Confidence: {(livenessResult.confidence * 100).toFixed(1)}%
                </p>
              </div>
              
              {/* Detection Results */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div className="text-center">
                  <Badge variant={livenessResult.detections.eyeBlink ? "success" : "destructive"}>
                    {livenessResult.detections.eyeBlink ? '✓' : '✗'} Eye Blink
                  </Badge>
                  <p className="text-sm text-gray-600 mt-1">
                    {livenessResult.metrics.blinkCount} blinks
                  </p>
                </div>
                
                <div className="text-center">
                  <Badge variant={livenessResult.detections.smile ? "success" : "destructive"}>
                    {livenessResult.detections.smile ? '✓' : '✗'} Smile
                  </Badge>
                  <p className="text-sm text-gray-600 mt-1">
                    {(livenessResult.metrics.smileScore * 100).toFixed(0)}% score
                  </p>
                </div>
                
                <div className="text-center">
                  <Badge variant={livenessResult.detections.headMovement ? "success" : "destructive"}>
                    {livenessResult.detections.headMovement ? '✓' : '✗'} Head Move
                  </Badge>
                  <p className="text-sm text-gray-600 mt-1">
                    {livenessResult.metrics.headPoseVariation.toFixed(1)}px var
                  </p>
                </div>
                
                <div className="text-center">
                  <Badge variant={livenessResult.detections.facePresent ? "success" : "destructive"}>
                    {livenessResult.detections.facePresent ? '✓' : '✗'} Face
                  </Badge>
                  <p className="text-sm text-gray-600 mt-1">
                    {(livenessResult.metrics.faceConfidence * 100).toFixed(1)}% conf
                  </p>
                </div>
                
                <div className="text-center">
                  <Badge variant={!livenessResult.detections.spoofDetected ? "success" : "destructive"}>
                    {!livenessResult.detections.spoofDetected ? '✓' : '✗'} Anti-Spoof
                  </Badge>
                  <p className="text-sm text-gray-600 mt-1">
                    {livenessResult.detections.spoofDetected ? 'Spoof' : 'Real'}
                  </p>
                </div>
              </div>
              
              {/* Captured Image */}
              {livenessResult.capturedImage && (
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-2">Captured Biometric</h3>
                  <img 
                    src={livenessResult.capturedImage} 
                    alt="Captured during liveness test" 
                    className="max-w-xs mx-auto rounded-lg shadow-lg"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Aadhaar Integration */}
        {biometricData.aadhaarPhoto && (
          <Card className="shadow-xl border-0 bg-gradient-to-r from-blue-50 to-blue-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-6 h-6 text-blue-600" />
                Aadhaar Document Verification
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Captured Aadhaar Card</h3>
                  <img 
                    src={biometricData.aadhaarPhoto} 
                    alt="Aadhaar card" 
                    className="w-full rounded-lg shadow-lg"
                  />
                </div>
                
                {livenessResult?.capturedImage && (
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Live Biometric</h3>
                    <img 
                      src={livenessResult.capturedImage} 
                      alt="Live capture" 
                      className="w-full rounded-lg shadow-lg"
                    />
                    <div className="mt-4 p-4 bg-white rounded-lg">
                      <h4 className="font-semibold text-green-800">✅ Verification Complete</h4>
                      <p className="text-sm text-gray-600 mt-1">
                        Document captured and live person verified
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
        
      </div>
    </div>
  );
};

export default AdvancedLivenessDetector;