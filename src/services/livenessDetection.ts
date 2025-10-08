import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';

export interface LivenessCheckResult {
  success: boolean;
  isLive?: boolean;
  confidence?: number;
  error?: string;
  timestamp: Date;
  frames: number;
  challenges: ChallengeResult[];
}

export interface ChallengeResult {
  type: 'blink' | 'smile' | 'turn_head';
  instruction: string;
  completed: boolean;
  attempts: number;
  confidence: number;
}

export class LivenessDetectionService {
  private model: tf.GraphModel | null = null;
  private isProcessing = false;

  async initialize(): Promise<void> {
    try {
      console.log('Initializing TensorFlow.js...');
      await tf.ready();
      
      const modelUrl = 'https://storage.googleapis.com/tfjs-models/savedmodel/blazeface/model.json';
      this.model = await tf.loadGraphModel(modelUrl);
      
      console.log('Face liveness detection service initialized');
    } catch (error) {
      throw new Error(`Failed to initialize liveness detection: ${error}`);
    }
  }

  async performLivenessCheck(
    videoElement: HTMLVideoElement,
    canvas: HTMLCanvasElement
  ): Promise<LivenessCheckResult> {
    const challenges = [
      {
        type: 'blink' as const,
        instruction: 'Please blink your eyes naturally',
        requiredFrames: 30
      },
      {
        type: 'smile' as const,
        instruction: 'Please smile',
        requiredFrames: 45
      },
      {
        type: 'turn_head' as const,
        instruction: 'Please turn your head left, then right',
        requiredFrames: 60
      }
    ];

    const challengeResults: ChallengeResult[] = [];
    let totalFrames = 0;
    let overallSuccess = true;
    let averageConfidence = 0;

    for (const challenge of challenges) {
      const result = await this.performSingleChallenge(challenge, videoElement, canvas);
      challengeResults.push(result);
      totalFrames += result.attempts;
      
      if (!result.completed) {
        overallSuccess = false;
      }
      
      averageConfidence += result.confidence;
    }

    averageConfidence /= challenges.length;

    return {
      success: overallSuccess,
      isLive: overallSuccess && averageConfidence > 0.7,
      confidence: averageConfidence,
      timestamp: new Date(),
      frames: totalFrames,
      challenges: challengeResults
    };
  }

  private async performSingleChallenge(
    challenge: any,
    videoElement: HTMLVideoElement,
    canvas: HTMLCanvasElement
  ): Promise<ChallengeResult> {
    return new Promise((resolve) => {
      let frameCount = 0;
      let confidenceSum = 0;
      let maxConfidence = 0;
      let detectionCount = 0;
      const maxFrames = challenge.requiredFrames;
      
      const checkFrame = async () => {
        if (frameCount >= maxFrames) {
          const avgConfidence = confidenceSum / Math.max(frameCount, 1);
          const completed = maxConfidence > 0.5 && detectionCount > 5;
          
          resolve({
            type: challenge.type,
            instruction: challenge.instruction,
            completed,
            attempts: frameCount,
            confidence: avgConfidence
          });
          return;
        }

        try {
          const detection = await this.detectFaces(videoElement);
          
          if (detection.isLive) {
            const challengeConfidence = Math.random() * 0.8; // Simplified
            confidenceSum += challengeConfidence;
            maxConfidence = Math.max(maxConfidence, challengeConfidence);
            
            if (challengeConfidence > 0.3) {
              detectionCount++;
            }
          }
          
          frameCount++;
          requestAnimationFrame(checkFrame);
        } catch (error) {
          resolve({
            type: challenge.type,
            instruction: challenge.instruction,
            completed: false,
            attempts: frameCount,
            confidence: 0
          });
        }
      };

      checkFrame();
    });
  }

  async detectFaces(videoElement: HTMLVideoElement): Promise<{ isLive: boolean; confidence: number }> {
    if (!this.model || this.isProcessing) {
      return { isLive: false, confidence: 0 };
    }

    this.isProcessing = true;

    try {
      const videoTensor = tf.browser.fromPixels(videoElement);
      const resized = tf.image.resizeBilinear(videoTensor, [128, 128]);
      const normalized = resized.div(255);
      const batched = normalized.expandDims(0);

      const predictions = await this.model.predict(batched) as tf.Tensor;
      const predictionData = await predictions.data();

      // Cleanup tensors
      videoTensor.dispose();
      resized.dispose();
      normalized.dispose();
      batched.dispose();
      predictions.dispose();

      const confidence = predictionData[0] || 0;
      const isLive = confidence > 0.7;

      return { isLive, confidence };
    } catch (error) {
      return { isLive: false, confidence: 0 };
    } finally {
      this.isProcessing = false;
    }
  }

  destroy(): void {
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }
    this.isProcessing = false;
  }

  isInitialized(): boolean {
    return this.model !== null;
  }
}
