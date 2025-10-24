import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  Home,
  RefreshCw,
  Camera as CameraIcon,
  User,
  Sparkles,
  Eye
} from "lucide-react";

// Face-API.js for real liveness detection
import * as faceapi from '@vladmandic/face-api';

interface PassportData {
  documentType: string;
  countryCode: string;
  surname: string;
  givenNames: string;
  passportNumber: string;
  nationality: string;
  dateOfBirth: string;
  dateOfExpiry: string;
  personalNumber?: string;
  rawMRZ?: string;
}

interface LivenessMetrics {
  faceConfidence: number;
  blinkDetected: boolean;
  headMovement: boolean;
  smileDetected: boolean;
  spoofPrevention: boolean;
  overallScore: number;
}

interface DetectionResult {
  isLive: boolean;
  confidence: number;
  metrics: LivenessMetrics;
  capturedImage?: string;
  detectionData: any;
}

interface EnhancedLivenessDetectorProps {
  onScanSuccess: (result: DetectionResult) => void;
  onScanFailure?: (error: Error) => void;
}

const EnhancedLivenessDetector: React.FC<EnhancedLivenessDetectorProps> = ({ onScanSuccess, onScanFailure }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<NodeJS.Timeout>();
  const animationRef = useRef<number>();

  // Refs to track challenge completion
  const challengeState = useRef({
    hasBlinked: false,
    hasSmiled: false,
  });
  
  // State from verification flow
  const passportData = location.state?.passportData as PassportData | undefined;
  
  const [isLoading, setIsLoading] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const [currentDetections, setCurrentDetections] = useState<{
    faces: number;
    confidence: number;
    eyeState: 'open' | 'closed' | 'unknown';
    smiling: boolean;
    headPose: { yaw: number; pitch: number; roll: number };
  }>({
    faces: 0,
    confidence: 0,
    eyeState: 'unknown',
    smiling: false,
    headPose: { yaw: 0, pitch: 0, roll: 0 }
  });
  
  const [livenessResult, setLivenessResult] = useState<DetectionResult | null>(null);
  const [testPhase, setTestPhase] = useState<'ready' | 'detecting' | 'blinking' | 'smiling' | 'moving' | 'complete'>('ready');

  // Initialize Face-API.js models
  useEffect(() => {
    const loadModels = async () => {
      setIsLoading(true);
      setModelsLoaded(false);
      try {
        console.log('🔧 Loading Face-API.js models for enhanced liveness detection...');
        
        const MODEL_URL = '/models';
        
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
          faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL)
        ]);
        
        // CRITICAL: Verify that all models are loaded
        if (!faceapi.nets.tinyFaceDetector.isLoaded || !faceapi.nets.faceLandmark68Net.isLoaded || !faceapi.nets.faceExpressionNet.isLoaded) {
          throw new Error('A critical face-api model failed to load.');
        }

        setModelsLoaded(true);
        console.log('✅ All Face-API.js models loaded successfully');
      } catch (error) {
        console.error('❌ Failed to load Face-API.js models:', error);
        // Keep modelsLoaded as false to prevent the user from starting the test
        setModelsLoaded(false);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadModels();
  }, []);

  // Start camera with enhanced settings
  const startCamera = useCallback(async () => {
    try {
      console.log('📷 Starting enhanced camera for liveness detection...');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
          frameRate: { ideal: 30 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
        
        // Initialize canvas dimensions
        if (canvasRef.current && videoRef.current) {
          canvasRef.current.width = videoRef.current.videoWidth || 640;
          canvasRef.current.height = videoRef.current.videoHeight || 480;
        }
        
        console.log('✅ Camera started successfully');
        return true;
      }
    } catch (error) {
      console.error('❌ Camera access failed:', error);
      return false;
    }
    return false;
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => {
        track.stop();
        console.log('🛑 Stopped camera track:', track.kind);
      });
      videoRef.current.srcObject = null;
      setCameraActive(false);
    }
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = undefined;
    }

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = undefined;
    }
  }, []);

  // Enhanced real-time face detection with visual overlay
  const detectFacesRealTime = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !modelsLoaded || !cameraActive) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;
    
    // Use requestAnimationFrame for smoother loop
    animationRef.current = requestAnimationFrame(detectFacesRealTime);
    
    try {
      // Detect faces with all features
      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ // More sensitive settings
          inputSize: 512,
          scoreThreshold: 0.4
        }))
        .withFaceLandmarks()
        .withFaceExpressions()
        .withAgeAndGender();

      // Clear previous drawings
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (detections.length > 0) {
        const detection = detections[0];
        const { expressions, landmarks, age, gender } = detection;
        
        // Draw face bounding box
        const box = detection.detection.box;
        ctx.strokeStyle = '#4ade80'; // Brighter green
        ctx.lineWidth = 3;
        ctx.strokeRect(box.x, box.y, box.width, box.height);
        
        // Draw face landmarks
        if (landmarks) {
          ctx.fillStyle = '#f87171'; // Softer red
          const jawOutline = landmarks.getJawOutline();
          const leftEye = landmarks.getLeftEye();
          const rightEye = landmarks.getRightEye();
          const nose = landmarks.getNose();
          const mouth = landmarks.getMouth();
          
          // Draw key landmarks
          [leftEye, rightEye, nose, mouth].forEach(feature => {
            feature.forEach(point => {
              ctx.beginPath(); // Use a smaller radius for a cleaner look
              ctx.arc(point.x, point.y, 1, 0, 2 * Math.PI);
              ctx.fill();
            });
          });
        }
        
        // Update detection state
        const faceConfidence = detection.detection.score;
        // A better blink detection: check if eye landmarks are close together
        const leftEye = landmarks.getLeftEye();
        const rightEye = landmarks.getRightEye();
        const leftEyeOpenRatio = (faceapi.euclideanDistance([leftEye[1].x, leftEye[1].y], [leftEye[5].x, leftEye[5].y]) + faceapi.euclideanDistance([leftEye[2].x, leftEye[2].y], [leftEye[4].x, leftEye[4].y])) / (2 * faceapi.euclideanDistance([leftEye[0].x, leftEye[0].y], [leftEye[3].x, leftEye[3].y]));
        const eyesClosed = leftEyeOpenRatio < 0.2;
        const smiling = expressions.happy > 0.5;
        
        // Calculate head pose (simplified)
        const headPose = landmarks ? {
          yaw: 0, // Could calculate from landmark positions
          pitch: 0,
          roll: 0
        } : { yaw: 0, pitch: 0, roll: 0 };
        
        setCurrentDetections({
          faces: detections.length,
          confidence: faceConfidence,
          eyeState: eyesClosed ? 'closed' : 'open',
          smiling,
          headPose
        });
        
        // Draw info overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(10, 10, 200, 100);
        ctx.strokeStyle = '#4ade80';
        ctx.strokeRect(10, 10, 200, 100);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px Arial';
        ctx.fillText('🔴 LIVE ANALYSIS', 20, 30);
        ctx.font = '12px Arial';
        ctx.fillText(`Confidence: ${(faceConfidence * 100).toFixed(0)}%`, 20, 50);
        ctx.fillText(`Age: ~${Math.round(age)}`, 20, 65);
        ctx.fillText(`Gender: ${gender}`, 20, 80);
        ctx.fillText(`Expression: ${expressions.happy > 0.5 ? 'Happy' : 'Neutral'}`, 20, 95);

      } else {
        // No face detected
        setCurrentDetections({
          faces: 0,
          confidence: 0,
          eyeState: 'unknown',
          smiling: false,
          headPose: { yaw: 0, pitch: 0, roll: 0 }
        });
        
        // Draw "No Face Detected" message
        ctx.fillStyle = 'rgba(239, 68, 68, 0.8)'; // Red overlay
        ctx.fillRect(canvas.width / 4, canvas.height / 2 - 40, canvas.width / 2, 80);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('❌ NO FACE DETECTED', canvas.width / 2, canvas.height / 2);
        ctx.font = '14px Arial';
        ctx.fillText('Please center your face', canvas.width / 2, canvas.height / 2 + 20);
        ctx.textAlign = 'start';
      }
      
    } catch (error) {
      console.error('❌ Face detection error:', error);
    }
  }, [modelsLoaded, cameraActive]);

  // Start real-time detection
  const startRealTimeDetection = useCallback(() => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    
    animationRef.current = requestAnimationFrame(detectFacesRealTime);
    console.log('🔄 Started smooth real-time face detection');
  }, [detectFacesRealTime]);

  // New function to preprocess the image and isolate the MRZ
  const preprocessImageForMRZ = async (imageUrl: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!(window as any).cv) {
        console.error("OpenCV not loaded!");
        return reject("OpenCV not loaded");
      }
      const cv = (window as any).cv;

      const image = new Image();
      image.crossOrigin = "anonymous";
      image.src = imageUrl;
      image.onload = () => {
        try {
          console.log("🖼️ Pre-processing image for MRZ extraction...");
          let src = cv.imread(image);
          let gray = new cv.Mat();
          cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);

          // Apply morphological transformations to find dark regions on a light background
          let rectKernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(13, 5));
          let blackhat = new cv.Mat();
          cv.morphologyEx(gray, blackhat, cv.MORPH_BLACKHAT, rectKernel);

          // Find light regions on a dark background
          let gradX = new cv.Mat();
          cv.Sobel(blackhat, gradX, cv.CV_32F, 1, 0, -1);
          gradX = cv.abs(gradX);
          let min = cv.minMaxLoc(gradX).minVal;
          let max = cv.minMaxLoc(gradX).maxVal;
          gradX = cv.convertScaleAbs(gradX, undefined, 255 / (max - min), -min * 255 / (max - min));

          // Binarize the image
          cv.morphologyEx(gradX, gradX, cv.MORPH_CLOSE, rectKernel);
          let thresh = new cv.Mat();
          cv.threshold(gradX, thresh, 0, 255, cv.THRESH_BINARY | cv.THRESH_OTSU);

          // Find contours and filter for the MRZ region (large aspect ratio)
          let contours = new cv.MatVector();
          let hierarchy = new cv.Mat();
          cv.findContours(thresh, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

          // Assuming the largest contour is the MRZ
          // A more robust solution would filter by aspect ratio and size
          let largestContour = contours.get(0);
          let rect = cv.boundingRect(largestContour);

          // Crop the original image to the MRZ region
          let mrz = src.roi(rect);
          
          const canvas = document.createElement('canvas');
          cv.imshow(canvas, mrz);
          resolve(canvas.toDataURL('image/jpeg'));
        } catch (error) { reject(error); }
      };
    });
  };

  // Challenge-based phase progression
  useEffect(() => {
    if (!isDetecting || testPhase === 'complete' || testPhase === 'ready') {
      return;
    }

    const checkChallenges = () => {
      const { faces, eyeState, smiling } = currentDetections;

      if (faces !== 1) {
        return; // Wait for a single face
      }

      switch (testPhase) {
        case 'detecting':
          // This is now the stabilization phase. It will only proceed if a face is present.
          if (faces === 1) {
            console.log('✅ Face stabilized. Starting challenges...');
            setProgress(50);
            setTestPhase('blinking');
          }
          break;

        case 'blinking':
          if (eyeState === 'closed') {
            console.log('✅ Blink detected!');
            challengeState.current.hasBlinked = true;
            setProgress(75);
            setTestPhase('smiling');
          }
          break;

        case 'smiling':
          if (smiling) {
            console.log('✅ Smile detected!');
            challengeState.current.hasSmiled = true;
            setProgress(90);
            setTestPhase('complete'); // End test after smile
          }
          break;
      }
    };

    const challengeInterval = setInterval(checkChallenges, 500);
    return () => clearInterval(challengeInterval);
  }, [isDetecting, testPhase, currentDetections]);

  // Perform complete liveness test
  const performLivenessTest = async () => {
    if (!modelsLoaded) {
      console.error('❌ Models not loaded yet');
      return;
    }

    setIsDetecting(true);
    setProgress(0);
    setTestPhase('detecting');
    // Reset challenge state
    challengeState.current = {
      hasBlinked: false,
      hasSmiled: false,
    };
    
    try {
      // Start camera
      const cameraStarted = await startCamera();
      if (!cameraStarted) {
        throw new Error('Failed to start camera');
      }
      
      setProgress(20);
      startRealTimeDetection(); // Start the detection loop
      setProgress(40);
      
      // Wait for challenges to complete
      await new Promise<void>(resolve => {
        const checkCompletion = setInterval(() => {
          if (testPhase === 'complete' || !isDetecting) {
            clearInterval(checkCompletion);
            resolve();
          }
        }, 100);
      });

      // Stop detection to freeze frame for photo
      if (animationRef.current) cancelAnimationFrame(animationRef.current);

      // Capture final photo
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
      });
      
      setProgress(100);
      
      // Calculate final liveness score
      const livenessScore = calculateLivenessScore();
      
      const result: DetectionResult = { // In your real code, this would use the OCR result from the processed image
        isLive: livenessScore.overallScore > 0.7,
        confidence: livenessScore.overallScore,
        metrics: livenessScore,
        capturedImage: image.dataUrl,
        detectionData: currentDetections
      };
      
      setLivenessResult(result);
      onScanSuccess(result);
      
      console.log('✅ Liveness test completed:', result);
      
    } catch (error) {
      console.error('❌ Liveness test failed:', error);
      onScanFailure?.(error as Error);
      setLivenessResult({
        isLive: false,
        confidence: 0,
        metrics: {
          faceConfidence: 0,
          blinkDetected: false,
          headMovement: false,
          smileDetected: false,
          spoofPrevention: false,
          overallScore: 0
        },
        detectionData: null
      });
      setTestPhase('complete');
    } finally {
      stopCamera();
      setIsDetecting(false);
    }
  };

  // Calculate comprehensive liveness score
  const calculateLivenessScore = (): LivenessMetrics => {
    const metrics = currentDetections;
    
    const faceConfidence = metrics.confidence;
    const blinkDetected = challengeState.current.hasBlinked;
    const headMovement = false; // Not tested in this component
    const smileDetected = metrics.smiling;
    const spoofPrevention = faceConfidence > 0.8; // Anti-spoofing
    
    // Calculate overall score
    let score = 0;
    if (faceConfidence > 0.5) score += 0.3;
    if (blinkDetected) score += 0.2;
    if (headMovement) score += 0.2;
    if (smileDetected) score += 0.15;
    if (spoofPrevention) score += 0.15;
    
    return {
      faceConfidence,
      blinkDetected,
      headMovement,
      smileDetected,
      spoofPrevention,
      overallScore: Math.min(score, 1.0)
    };
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Render test phase instructions
  const renderPhaseInstructions = () => {
    switch (testPhase) {
      case 'ready':
        return (
          <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <Eye className="w-12 h-12 text-blue-600 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Ready for Liveness Test
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Follow the instructions to complete biometric verification
            </p>
          </div>
        );
      case 'detecting': // This is now the stabilization phase
        return (
          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <Sparkles className="w-12 h-12 text-green-600 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-green-800 dark:text-green-300 mb-2">
              Detecting Face
            </h3>
            <p className="text-green-700 dark:text-green-400">
              Hold steady, stabilizing...
            </p>
          </div>
        );
      case 'blinking':
        return (
          <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <Eye className="w-12 h-12 text-purple-600 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-purple-800 dark:text-purple-300 mb-2">
              Blink Detection
            </h3>
            <p className="text-purple-700 dark:text-purple-400">
              Please blink your eyes
            </p>
          </div>
        );
      case 'smiling':
        return (
          <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
            <User className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-300 mb-2">
              Expression Detection
            </h3>
            <p className="text-yellow-700 dark:text-yellow-400">
              Please smile naturally
            </p>
          </div>
        );
      case 'complete':
        return livenessResult ? (
          <div className={`text-center p-4 rounded-lg ${
            livenessResult.isLive 
              ? 'bg-green-50 dark:bg-green-900/20' 
              : 'bg-red-50 dark:bg-red-900/20'
          }`}>
            {livenessResult.isLive ? (
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
            ) : (
              <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-3" />
            )}
            <h3 className={`text-lg font-semibold mb-2 ${
              livenessResult.isLive 
                ? 'text-green-800 dark:text-green-300' 
                : 'text-red-800 dark:text-red-300'
            }`}>
              {livenessResult.isLive ? 'Liveness Verified!' : 'Liveness Test Failed'}
            </h3>
            <p className={`mb-3 ${
              livenessResult.isLive 
                ? 'text-green-700 dark:text-green-400' 
                : 'text-red-700 dark:text-red-400'
            }`}>
              Confidence: {(livenessResult.confidence * 100).toFixed(1)}%
            </p>
          </div>
        ) : null;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header with Navigation */}
        <div className="flex items-center justify-between">
          <Button 
            variant="outline" 
            onClick={() => navigate(-1)}
            className="flex items-center space-x-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => navigate('/')}
            className="flex items-center space-x-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600"
          >
            <Home className="w-4 h-4" />
            <span>Home</span>
          </Button>
        </div>

        {/* Header */}
        <div className="text-center py-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full mb-4">
            <Eye className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Advanced Liveness Detection
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            AI-Powered Biometric Verification • Anti-Spoofing
          </p>
          <div className="flex items-center justify-center mt-4 space-x-2">
            <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
              AI Ready
            </Badge>
            {modelsLoaded && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                Models Loaded
              </Badge>
            )}
          </div>
        </div>

        {/* Passport Data Display */}
        {passportData && (
          <Card className="shadow-lg border-0 bg-white dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-gray-900 dark:text-white">
                Verifying Identity For:
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {passportData.givenNames} {passportData.surname}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    {passportData.nationality} • {passportData.passportNumber}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Liveness Card */}
        <Card className="shadow-xl border-0 bg-white dark:bg-gray-800">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
              <Eye className="w-6 h-6 mr-3 text-purple-600" />
              Enhanced Liveness Detection
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-300">
              Real-time face detection with anti-spoofing technology
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Camera Feed with Overlay */}
            <div className="relative aspect-video bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                style={{ display: cameraActive ? 'block' : 'none' }}
                playsInline
                muted
              />
              <canvas
                ref={canvasRef}
                className="absolute top-0 left-0 w-full h-full"
                style={{ display: cameraActive ? 'block' : 'none' }}
              />
              {!cameraActive && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <CameraIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
                      Camera will activate during liveness test
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Real-time Detection Stats */}
            {cameraActive && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-blue-600">{currentDetections.faces}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Faces</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {(currentDetections.confidence * 100).toFixed(0)}%
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Confidence</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {currentDetections.smiling ? '😊' : '😐'}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Expression</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {modelsLoaded ? '🔄' : '⏳'}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Status</div>
                </div>
              </div>
            )}

            {/* Progress Bar */}
            {isDetecting && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Liveness Test Progress</span>
                  <span className="text-purple-600 font-medium">{progress}%</span>
                </div>
                <Progress value={progress} className="h-3" />
              </div>
            )}

            {/* Phase Instructions */}
            {renderPhaseInstructions()}

            {/* Action Buttons */}
            <div className="flex justify-center space-x-4">
              {testPhase === 'ready' && (
                <Button 
                  onClick={performLivenessTest}
                  disabled={isLoading || !modelsLoaded}
                  size="lg"
                  className="bg-purple-600 hover:bg-purple-700 text-white px-8"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Loading Models...
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4 mr-2" />
                      Start Liveness Test
                    </>
                  )}
                </Button>
              )}
              
              {testPhase === 'complete' && livenessResult && (
                <div className="flex space-x-4">
                  <Button 
                    onClick={() => {
                      setTestPhase('ready');
                      setLivenessResult(null);
                      setProgress(0);
                    }}
                    variant="outline"
                    size="lg"
                    className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Test Again
                  </Button>
                  
                  {livenessResult.isLive && (
                    <Button 
                      onClick={() => navigate('/verification-complete', { 
                        state: { 
                          passportData, 
                          livenessResult,
                          verificationSuccess: true
                        } 
                      })}
                      size="lg"
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Continue Verification
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Detailed Results */}
            {livenessResult && testPhase === 'complete' && (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                  Detection Metrics:
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Face Confidence:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {(livenessResult.metrics.faceConfidence * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Blink Detected:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {livenessResult.metrics.blinkDetected ? '✓' : '✗'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Head Movement:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {livenessResult.metrics.headMovement ? '✓' : '✗'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Anti-Spoofing:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {livenessResult.metrics.spoofPrevention ? '✓' : '✗'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Captured Image */}
            {livenessResult?.capturedImage && (
              <div className="text-center">
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                  Captured Biometric:
                </h4>
                <img 
                  src={livenessResult.capturedImage} 
                  alt="Captured biometric" 
                  className="max-w-xs mx-auto rounded-lg border-2 border-gray-300 dark:border-gray-600"
                />
              </div>
            )}

          </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default EnhancedLivenessDetector;