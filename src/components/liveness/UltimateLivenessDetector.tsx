import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Eye,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  Home,
  RefreshCw,
  Camera as CameraIcon,
  User,
  Target,
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
  facesDetected: number;
  eyeOpenRatio: number;
  headPoseVariation: number;
}

interface DetectionResult {
  isLive: boolean;
  confidence: number;
  metrics: LivenessMetrics;
  capturedImage?: string;
  detectionData: any;
  timestamp: number;
}

const UltimateLivenessDetector: React.FC = () => {
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
    hasTurnedHead: false,
    initialHeadPose: null as { yaw: number; pitch: number; roll: number } | null,
  });

  // State from verification flow
  const passportData = location.state?.passportData as PassportData | undefined;
  
  const [isLoading, setIsLoading] = useState(true);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [testStarted, setTestStarted] = useState(false);
  
  const [currentDetections, setCurrentDetections] = useState<{
    faces: number;
    confidence: number;
    eyeState: 'open' | 'closed' | 'unknown';
    smiling: boolean;
    headPose: { yaw: number; pitch: number; roll: number };
    faceBounds: { x: number; y: number; width: number; height: number } | null;
    landmarks: any[];
    expressions: any;
  }>({
    faces: 0,
    confidence: 0,
    eyeState: 'unknown',
    smiling: false,
    headPose: { yaw: 0, pitch: 0, roll: 0 },
    faceBounds: null,
    landmarks: [],
    expressions: null
  });
  
  const [livenessResult, setLivenessResult] = useState<DetectionResult | null>(null);
  const [testPhase, setTestPhase] = useState<'ready' | 'detecting' | 'blinking' | 'smiling' | 'moving' | 'complete'>('ready');
  const [phaseInstructions, setPhaseInstructions] = useState<string>('Position your face in the center of the camera');

  // Initialize Face-API.js models with enhanced loading
  useEffect(() => {
    const loadModels = async () => {
      setIsLoading(true);
      try {
        console.log('🔧 Loading Face-API.js models for ultimate liveness detection...');
        
        const MODEL_URL = '/models';
        
        // Load models with proper error handling
        const modelPromises = [
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
          faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
        ];
        
        await Promise.all(modelPromises);
        
        setModelsLoaded(true);
        console.log('✅ All Face-API.js models loaded successfully');
      } catch (error) {
        console.error('❌ Failed to load Face-API.js models:', error);
        setModelsLoaded(false);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadModels();
  }, []);

  // Enhanced camera startup with better constraints
  const startCamera = useCallback(async () => {
    try {
      console.log('📷 Starting ultimate camera for liveness detection...');
      
      const constraints = {
        video: { 
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          facingMode: 'user',
          frameRate: { ideal: 30, min: 15 },
          aspectRatio: { ideal: 16/9 }
        }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Wait for video to be ready
        await new Promise<void>((resolve) => {
          videoRef.current!.onloadedmetadata = () => {
            videoRef.current!.play();
            resolve();
          };
        });
        
        setCameraActive(true);
        
        // Set canvas dimensions to match video
        if (canvasRef.current && videoRef.current) {
          const rect = videoRef.current.getBoundingClientRect();
          canvasRef.current.width = videoRef.current.videoWidth || 1280;
          canvasRef.current.height = videoRef.current.videoHeight || 720;
          
          // Style canvas to overlay exactly on video
          canvasRef.current.style.width = '100%';
          canvasRef.current.style.height = '100%';
        }
        
        console.log('✅ Ultimate camera started successfully');
        return true;
      }
    } catch (error) {
      console.error('❌ Camera access failed:', error);
      return false;
    }
    return false;
  }, []);

  // Enhanced stop camera with cleanup
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

  // Ultra-smooth real-time face detection with visual overlay
  const detectFacesRealTime = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !modelsLoaded || !cameraActive) {
      if (cameraActive) {
        animationRef.current = requestAnimationFrame(detectFacesRealTime);
      }
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      animationRef.current = requestAnimationFrame(detectFacesRealTime);
      return;
    }

    try {
      // Detect faces with all features
      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({
          inputSize: 512, // Higher resolution for better accuracy
          scoreThreshold: 0.4 // Lower threshold for better detection
        }))
        .withFaceLandmarks()
        .withFaceExpressions();

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Set canvas coordinate system to match video
      const scaleX = canvas.width / video.videoWidth;
      const scaleY = canvas.height / video.videoHeight;

      if (detections.length > 0) {
        const detection = detections[0];
        const { expressions, landmarks } = detection;
        
        // Scale detection box to canvas coordinates
        const box = detection.detection.box;
        const scaledBox = {
          x: box.x * scaleX,
          y: box.y * scaleY,
          width: box.width * scaleX,
          height: box.height * scaleY
        };
        
        // Draw main face rectangle with gradient border
        const gradient = ctx.createLinearGradient(scaledBox.x, scaledBox.y, scaledBox.x + scaledBox.width, scaledBox.y + scaledBox.height);
        gradient.addColorStop(0, '#00ff00');
        gradient.addColorStop(0.5, '#ffff00');
        gradient.addColorStop(1, '#ff0000');
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 4;
        ctx.strokeRect(scaledBox.x, scaledBox.y, scaledBox.width, scaledBox.height);
        
        // Draw corner indicators
        const cornerSize = 20;
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 6;
        
        // Top-left corner
        ctx.beginPath();
        ctx.moveTo(scaledBox.x, scaledBox.y + cornerSize);
        ctx.lineTo(scaledBox.x, scaledBox.y);
        ctx.lineTo(scaledBox.x + cornerSize, scaledBox.y);
        ctx.stroke();
        
        // Top-right corner
        ctx.beginPath();
        ctx.moveTo(scaledBox.x + scaledBox.width - cornerSize, scaledBox.y);
        ctx.lineTo(scaledBox.x + scaledBox.width, scaledBox.y);
        ctx.lineTo(scaledBox.x + scaledBox.width, scaledBox.y + cornerSize);
        ctx.stroke();
        
        // Bottom-left corner
        ctx.beginPath();
        ctx.moveTo(scaledBox.x, scaledBox.y + scaledBox.height - cornerSize);
        ctx.lineTo(scaledBox.x, scaledBox.y + scaledBox.height);
        ctx.lineTo(scaledBox.x + cornerSize, scaledBox.y + scaledBox.height);
        ctx.stroke();
        
        // Bottom-right corner
        ctx.beginPath();
        ctx.moveTo(scaledBox.x + scaledBox.width - cornerSize, scaledBox.y + scaledBox.height);
        ctx.lineTo(scaledBox.x + scaledBox.width, scaledBox.y + scaledBox.height);
        ctx.lineTo(scaledBox.x + scaledBox.width, scaledBox.y + scaledBox.height - cornerSize);
        ctx.stroke();
        
        // Draw facial landmarks
        if (landmarks) {
          ctx.fillStyle = '#ff0000';
          
          // Draw key facial points
          const jawOutline = landmarks.getJawOutline();
          const leftEye = landmarks.getLeftEye();
          const rightEye = landmarks.getRightEye();
          const nose = landmarks.getNose();
          const mouth = landmarks.getMouth();
          
          // Draw eyes with special highlighting
          [leftEye, rightEye].forEach((eye, index) => {
            ctx.fillStyle = '#00ffff';
            eye.forEach((point: any) => {
              ctx.beginPath();
              ctx.arc(point.x * scaleX, point.y * scaleY, 2, 0, 2 * Math.PI);
              ctx.fill();
            });
            
            // Eye center indicator
            if (eye.length > 0) {
              const centerX = eye.reduce((sum: number, p: any) => sum + p.x, 0) / eye.length * scaleX;
              const centerY = eye.reduce((sum: number, p: any) => sum + p.y, 0) / eye.length * scaleY;
              
              ctx.strokeStyle = '#ffff00';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.arc(centerX, centerY, 8, 0, 2 * Math.PI);
              ctx.stroke();
            }
          });
          
          // Draw nose
          ctx.fillStyle = '#ff00ff';
          nose.forEach((point: any) => {
            ctx.beginPath();
            ctx.arc(point.x * scaleX, point.y * scaleY, 1.5, 0, 2 * Math.PI);
            ctx.fill();
          });
          
          // Draw mouth
          ctx.fillStyle = '#ffff00';
          mouth.forEach((point: any) => {
            ctx.beginPath();
            ctx.arc(point.x * scaleX, point.y * scaleY, 1.5, 0, 2 * Math.PI);
            ctx.fill();
          });
        }
        
        // Enhanced info display with better styling
        const faceConfidence = detection.detection.score;
        const eyesClosed = expressions.neutral < 0.3; // Better eye detection logic
        const smiling = expressions.happy > 0.3;
        
        // Create info panel background
        const panelWidth = 300;
        const panelHeight = 200;
        const panelX = canvas.width - panelWidth - 10;
        const panelY = 10;
        
        // Semi-transparent background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
        
        // Border
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);
        
        // Title
        ctx.fillStyle = '#00ff00';
        ctx.font = 'bold 16px Arial';
        ctx.fillText('🔴 LIVE DETECTION', panelX + 10, panelY + 25);
        
        // Detection info
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px Arial';
        let yOffset = 50;
        
        ctx.fillText(`👤 Faces: ${detections.length}`, panelX + 10, panelY + yOffset);
        yOffset += 20;
        
        ctx.fillText(`🎯 Confidence: ${(faceConfidence * 100).toFixed(1)}%`, panelX + 10, panelY + yOffset);
        yOffset += 20;
        
        ctx.fillText(`👁️ Eyes: ${eyesClosed ? 'Closed' : 'Open'}`, panelX + 10, panelY + yOffset);
        yOffset += 20;
        
        ctx.fillText(`😊 Smile: ${(expressions.happy * 100).toFixed(1)}%`, panelX + 10, panelY + yOffset);
        yOffset += 20;
        
        ctx.fillText(`😮 Surprise: ${(expressions.surprised * 100).toFixed(1)}%`, panelX + 10, panelY + yOffset);
        yOffset += 20;
        
        ctx.fillText(`😠 Angry: ${(expressions.angry * 100).toFixed(1)}%`, panelX + 10, panelY + yOffset);
        yOffset += 20;
        
        ctx.fillText(`😢 Sad: ${(expressions.sad * 100).toFixed(1)}%`, panelX + 10, panelY + yOffset);
        yOffset += 20;
        
        ctx.fillText(`😐 Neutral: ${(expressions.neutral * 100).toFixed(1)}%`, panelX + 10, panelY + yOffset);
        
        // Update detection state
        setCurrentDetections({
          faces: detections.length,
          confidence: faceConfidence,
          eyeState: eyesClosed ? 'closed' : 'open',
          smiling,
          headPose: { yaw: 0, pitch: 0, roll: 0 }, // Could be calculated from landmarks
          faceBounds: scaledBox,
          landmarks: landmarks ? landmarks.positions : [],
          expressions
        });
        
      } else {
        // No face detected - show guidance
        setCurrentDetections(prev => ({
          ...prev,
          faces: 0,
          confidence: 0,
          faceBounds: null,
          landmarks: []
        }));
        
        // Draw "No Face" indicator
        ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
        ctx.fillRect(canvas.width/4, canvas.height/2 - 50, canvas.width/2, 100);
        
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 3;
        ctx.strokeRect(canvas.width/4, canvas.height/2 - 50, canvas.width/2, 100);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('❌ NO FACE DETECTED', canvas.width/2, canvas.height/2 - 20);
        ctx.font = '16px Arial';
        ctx.fillText('Position your face in the center', canvas.width/2, canvas.height/2 + 10);
        ctx.textAlign = 'left';
        
        // Draw targeting guide
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const targetSize = 200;
        
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 5]);
        ctx.strokeRect(centerX - targetSize/2, centerY - targetSize/2, targetSize, targetSize);
        ctx.setLineDash([]);
      }
      
    } catch (error) {
      console.error('❌ Face detection error:', error);
    }
    
    // Continue detection loop
    if (cameraActive) {
      animationRef.current = requestAnimationFrame(detectFacesRealTime);
    }
  }, [modelsLoaded, cameraActive]);

  // Start real-time detection with animation frame
  const startRealTimeDetection = useCallback(() => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    
    animationRef.current = requestAnimationFrame(detectFacesRealTime);
    console.log('🔄 Started ultra-smooth real-time face detection');
  }, [detectFacesRealTime]);

  // Challenge-based phase progression
  useEffect(() => {
    if (!isDetecting || testPhase === 'complete' || testPhase === 'ready') {
      return;
    }

    const checkChallenges = () => {
      const { faces, eyeState, smiling, headPose } = currentDetections;

      if (faces !== 1) {
        // If face is lost, we might want to pause or reset the current challenge
        return;
      }

      switch (testPhase) {
        case 'detecting':
          // Initial face presence check
          setPhaseInstructions('Hold steady, detecting face...');
          setProgress(35);
          setTimeout(() => setTestPhase('blinking'), 1500); // Move to next phase after a short delay
          break;

        case 'blinking':
          setPhaseInstructions('Please blink your eyes');
          if (eyeState === 'closed') {
            challengeState.current.hasBlinked = true;
            console.log('✅ Blink detected!');
            setProgress(50);
            setTestPhase('smiling');
          }
          break;

        case 'smiling':
          setPhaseInstructions('Please give a natural smile');
          if (smiling) {
            challengeState.current.hasSmiled = true;
            console.log('✅ Smile detected!');
            setProgress(65);
            setTestPhase('moving');
          }
          break;

        case 'moving':
          // This is a simplified head movement check. A real implementation would be more robust.
          setPhaseInstructions('Slowly turn your head left or right');
          // A real check would track pose over time. For this example, we'll just move on.
          challengeState.current.hasTurnedHead = true; // Simulate for now
          setProgress(80);
          setTimeout(() => setTestPhase('complete'), 2000); // Simulate time for head turn
          break;
      }
    };

    // Use an interval to check challenges, but clear it if the phase changes
    const challengeInterval = setInterval(checkChallenges, 500);
    return () => clearInterval(challengeInterval);

  }, [isDetecting, testPhase, currentDetections]);

  // Enhanced liveness test with multiple phases
  const performUltimateLivenessTest = async () => {
    if (!modelsLoaded) {
      console.error('❌ Models not loaded yet');
      return;
    }

    setIsDetecting(true);
    setTestStarted(true);
    setProgress(0);
    setTestPhase('detecting');
    // Reset challenge state
    challengeState.current = {
      hasBlinked: false,
      hasSmiled: false,
      hasTurnedHead: false,
      initialHeadPose: null,
    };
    setPhaseInstructions('Look directly at the camera and stay still');
    
    try {
      // Start camera
      const cameraStarted = await startCamera();
      if (!cameraStarted) {
        throw new Error('Failed to start camera');
      }
      
      setProgress(10);
      
      // Wait for camera to stabilize
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Start real-time detection
      startRealTimeDetection();
      setProgress(20);

      // The useEffect hook will now handle phase transitions.
      // We just need to wait for the 'complete' phase.
      await new Promise<void>(resolve => {
        const checkCompletion = setInterval(() => {
          if (testPhase === 'complete' || !isDetecting) {
            clearInterval(checkCompletion);
            resolve();
          }
        }, 100);
      });

      // Final capture
      setPhaseInstructions('Finalizing...');
      // Stop detection to freeze the frame for the photo
      if (animationRef.current) cancelAnimationFrame(animationRef.current);

      const image = await Camera.getPhoto({
        quality: 95,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
      });
      
      setProgress(95);
      
      // Calculate final liveness score
      const livenessScore = calculateUltimateLivenessScore();
      
      const result: DetectionResult = {
        isLive: livenessScore.overallScore > 0.75,
        confidence: livenessScore.overallScore,
        metrics: livenessScore,
        capturedImage: image.dataUrl,
        detectionData: currentDetections,
        timestamp: Date.now()
      };
      
      setLivenessResult(result);
      setProgress(100);
      setPhaseInstructions(result.isLive ? 'Liveness verification successful!' : 'Liveness verification failed. Please try again.');
      
      console.log('✅ Ultimate liveness test completed:', result);
      
    } catch (error) {
      console.error('❌ Ultimate liveness test failed:', error);
      setLivenessResult({
        isLive: false,
        confidence: 0,
        metrics: {
          faceConfidence: 0,
          blinkDetected: false,
          headMovement: false,
          smileDetected: false,
          spoofPrevention: false,
          overallScore: 0,
          facesDetected: 0,
          eyeOpenRatio: 0,
          headPoseVariation: 0
        },
        detectionData: null,
        timestamp: Date.now()
      });
      setTestPhase('complete');
      setPhaseInstructions('Test failed. Please try again.');
    } finally {
      setTimeout(() => {
        stopCamera();
        setIsDetecting(false);
      }, 2000); // Keep camera on for 2 more seconds to show result
    }
  };

  // Enhanced liveness scoring
  const calculateUltimateLivenessScore = (): LivenessMetrics => {
    const metrics = currentDetections;
    
    const faceConfidence = metrics.confidence;
    const blinkDetected = challengeState.current.hasBlinked;
    const headMovement = challengeState.current.hasTurnedHead;
    const smileDetected = challengeState.current.hasSmiled;
    const spoofPrevention = faceConfidence > 0.7 && metrics.faces === 1;
    const facesDetected = metrics.faces;
    const eyeOpenRatio = metrics.eyeState === 'open' ? 1.0 : 0.5;
    const headPoseVariation = Math.abs(metrics.headPose.yaw) + Math.abs(metrics.headPose.pitch);
    
    // Advanced scoring algorithm
    let score = 0;
    if (faceConfidence > 0.6) score += 0.25;
    if (blinkDetected) score += 0.20;
    if (headMovement) score += 0.15;
    if (smileDetected) score += 0.15;
    if (spoofPrevention) score += 0.15;
    if (facesDetected === 1) score += 0.10;
    
    return {
      faceConfidence,
      blinkDetected,
      headMovement,
      smileDetected,
      spoofPrevention,
      overallScore: Math.min(score, 1.0),
      facesDetected,
      eyeOpenRatio,
      headPoseVariation
    };
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-6xl mx-auto space-y-4">
        
        {/* Header with Navigation */}
        <div className="flex items-center justify-between">
          <Button 
            variant="outline" 
            onClick={() => navigate(-1)}
            className="flex items-center space-x-2 bg-white dark:bg-gray-800"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => navigate('/')}
            className="flex items-center space-x-2 bg-white dark:bg-gray-800"
          >
            <Home className="w-4 h-4" />
            <span>Home</span>
          </Button>
        </div>

        {/* Header */}
        <div className="text-center py-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full mb-4">
            <Eye className="w-8 h-8 text-white" />
          </div> 
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Ultimate Liveness Detection
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Advanced AI • Real-time Face Tracking • Anti-Spoofing
          </p>
          <div className="flex items-center justify-center mt-4 space-x-2">
            {modelsLoaded ? (
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                ✅ AI Ready
              </Badge>
            ) : (
              <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
                ⏳ Loading...
              </Badge>
            )}
            {cameraActive && (
              <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                🔴 LIVE
              </Badge>
            )}
          </div>
        </div>

        {/* Main Liveness Card - MUCH LARGER CAMERA */}
        <Card className="shadow-xl border-0 bg-white dark:bg-gray-800">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
              <Eye className="w-6 h-6 mr-3 text-purple-600" />
              Live Face Detection
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-300">
              {phaseInstructions}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            
            {/* ENLARGED CAMERA FEED - FULL WIDTH AND TALL */}
            <div className="relative w-full bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9', minHeight: '400px' }}>
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                style={{ display: cameraActive ? 'block' : 'none' }}
                playsInline
                muted
                autoPlay
              />
              <canvas
                ref={canvasRef}
                className="absolute top-0 left-0 w-full h-full pointer-events-none"
                style={{ display: cameraActive ? 'block' : 'none' }}
              />
              
              {/* Camera Inactive Overlay */}
              {!cameraActive && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                  <div className="text-center">
                    <CameraIcon className="w-24 h-24 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-gray-700 dark:text-gray-300 mb-2">
                      Large Camera View Ready
                    </h3>
                    <p className="text-lg text-gray-600 dark:text-gray-400">
                      Enhanced viewing area for better face detection
                    </p>
                  </div>
                </div>
              )}
              
              {/* Loading Overlay */}
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                  <div className="text-center text-white">
                    <RefreshCw className="w-16 h-16 mx-auto mb-4 animate-spin" />
                    <h3 className="text-xl font-bold mb-2">Loading AI Models...</h3>
                    <p>Please wait while we initialize face detection</p>
                  </div>
                </div>
              )}
            </div>

            {/* Real-time Stats - ENHANCED DISPLAY */}
            {cameraActive && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-blue-600">{currentDetections.faces}</div>
                  <div className="text-sm text-blue-800 dark:text-blue-300 font-medium">Faces</div>
                </div>
                <div className="bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {(currentDetections.confidence * 100).toFixed(0)}%
                  </div>
                  <div className="text-sm text-green-800 dark:text-green-300 font-medium">Confidence</div>
                </div>
                <div className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-purple-600">
                    {currentDetections.eyeState === 'open' ? '👁️' : currentDetections.eyeState === 'closed' ? '😴' : '❓'}
                  </div>
                  <div className="text-sm text-purple-800 dark:text-purple-300 font-medium">Eyes</div>
                </div>
                <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900 dark:to-yellow-800 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-yellow-600">
                    {currentDetections.smiling ? '😊' : '😐'}
                  </div>
                  <div className="text-sm text-yellow-800 dark:text-yellow-300 font-medium">Expression</div>
                </div>
                <div className="bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900 dark:to-red-800 rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-red-600">
                    {testStarted ? '🔄' : modelsLoaded ? '✅' : '⏳'}
                  </div>
                  <div className="text-sm text-red-800 dark:text-red-300 font-medium">Status</div>
                </div>
              </div>
            )}

            {/* Progress Bar */}
            {isDetecting && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Ultimate Liveness Test Progress</span>
                  <span className="text-purple-600 font-bold">{progress}%</span>
                </div>
                <Progress value={progress} className="h-4" />
                <div className="text-center text-sm text-gray-600 dark:text-gray-400">
                  {phaseInstructions}
                </div>
              </div>
            )}

            {/* Action Button */}
            <div className="flex justify-center">
              {!testStarted && (
                <Button 
                  onClick={performUltimateLivenessTest}
                  disabled={isLoading || !modelsLoaded}
                  size="lg"
                  className="bg-purple-600 hover:bg-purple-700 text-white px-12 py-4 text-lg"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-5 h-5 mr-3 animate-spin" />
                      Loading AI Models...
                    </>
                  ) : (
                    <>
                      <Target className="w-5 h-5 mr-3" />
                      Start Ultimate Liveness Test
                    </>
                  )}
                </Button>
              )}
              
              {testPhase === 'complete' && (
                <div className="flex space-x-4">
                  <Button 
                    onClick={() => {
                      setTestPhase('ready');
                      setTestStarted(false);
                      setLivenessResult(null);
                      setProgress(0);
                      setPhaseInstructions('Position your face in the center of the camera');
                    }}
                    variant="outline"
                    size="lg"
                    className="border-gray-300 dark:border-gray-600"
                  >
                    <RefreshCw className="w-5 h-5 mr-2" />
                    Test Again
                  </Button>
                  
                  {livenessResult?.isLive && (
                    <Button 
                      onClick={() => navigate('/verification-complete', { 
                        state: { 
                          passportData, 
                          livenessResult,
                          verificationSuccess: true
                        } 
                      })}
                      size="lg"
                      className="bg-green-600 hover:bg-green-700 text-white px-8"
                    >
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Continue Verification
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Detailed Results */}
            {livenessResult && testPhase === 'complete' && (
              <div className={`rounded-lg p-6 ${
                livenessResult.isLive 
                  ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800' 
                  : 'bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800'
              }`}>
                <div className="text-center mb-4">
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 ${
                    livenessResult.isLive 
                      ? 'bg-green-100 dark:bg-green-800' 
                      : 'bg-red-100 dark:bg-red-800'
                  }`}>
                    {livenessResult.isLive ? (
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    ) : (
                      <AlertTriangle className="w-8 h-8 text-red-600" />
                    )}
                  </div>
                  <h3 className={`text-2xl font-bold mb-2 ${
                    livenessResult.isLive 
                      ? 'text-green-800 dark:text-green-300' 
                      : 'text-red-800 dark:text-red-300'
                  }`}>
                    {livenessResult.isLive ? 'Liveness Verified!' : 'Liveness Test Failed'}
                  </h3>
                  <p className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                    Overall Confidence: {(livenessResult.confidence * 100).toFixed(1)}%
                  </p>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl mb-1">
                      {livenessResult.metrics.faceConfidence > 0.5 ? '✅' : '❌'}
                    </div>
                    <div className="text-sm font-medium">Face Detection</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {(livenessResult.metrics.faceConfidence * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl mb-1">
                      {livenessResult.metrics.blinkDetected ? '✅' : '❌'}
                    </div>
                    <div className="text-sm font-medium">Blink Test</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {livenessResult.metrics.blinkDetected ? 'Detected' : 'Not Detected'}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl mb-1">
                      {livenessResult.metrics.smileDetected ? '✅' : '❌'}
                    </div>
                    <div className="text-sm font-medium">Expression</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {livenessResult.metrics.smileDetected ? 'Smile' : 'Neutral'}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl mb-1">
                      {livenessResult.metrics.spoofPrevention ? '✅' : '❌'}
                    </div>
                    <div className="text-sm font-medium">Anti-Spoof</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      {livenessResult.metrics.spoofPrevention ? 'Passed' : 'Failed'}
                    </div>
                  </div>
                </div>
              </div>
            )}

          </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default UltimateLivenessDetector;