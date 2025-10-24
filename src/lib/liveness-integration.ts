// src/lib/liveness-integration.ts
// COMPLETE LIVENESS DETECTION INTEGRATION

import { AirportProPlugins, LivenessResult } from './capacitor-plugins';

export class LivenessDetectionService {
  private isInitialized = false;
  private currentStream: MediaStream | null = null;

  /**
   * Initialize the liveness detection service
   */
  async initialize(): Promise<boolean> {
    try {
      // Check if we're running on a supported platform
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.warn('Camera API not supported');
        return false;
      }

      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize liveness detection:', error);
      return false;
    }
  }

  /**
   * Start camera stream for liveness detection
   */
  async startCameraStream(): Promise<MediaStream | null> {
    if (!this.isInitialized) {
      throw new Error('Service not initialized');
    }

    try {
      this.currentStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user', // Front camera for selfies
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30 }
        },
        audio: false
      });

      return this.currentStream;
    } catch (error) {
  if (error instanceof Error) {
    throw new Error(`Camera access failed: ${error.message}`);
  }
  throw new Error(`Camera access failed: ${String(error)}`);
}

  }

  /**
   * Capture frame from video stream and convert to base64
   */
  captureFrame(videoElement: HTMLVideoElement): string | null {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      ctx.drawImage(videoElement, 0, 0);
      return canvas.toDataURL('image/jpeg', 0.8);
    } catch (error) {
      console.error('Failed to capture frame:', error);
      return null;
    }
  }

  /**
   * Perform liveness detection on captured image
   */
  async performLivenessCheck(imageBase64: string): Promise<LivenessResult> {
    if (!this.isInitialized) {
      throw new Error('Service not initialized');
    }

    try {
      // Clean the base64 string (remove data:image/jpeg;base64, prefix)
      const base64Data = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
      
      // Call native ML Kit plugin
      const result = await AirportProPlugins.checkLiveness(base64Data);
      
      return result;
    } catch (error) {
  if (error instanceof Error) {
    throw new Error(`Liveness detection failed: ${error.message}`);
  }
  throw new Error(`Liveness detection failed: ${String(error)}`);
}

  }

  /**
   * Continuous liveness monitoring
   */
  async startLivenessMonitoring(
    videoElement: HTMLVideoElement,
    onResult: (result: LivenessResult) => void,
    onError: (error: string) => void,
    intervalMs: number = 2000
  ): Promise<() => void> {
    
    let isMonitoring = true;
    let timeoutId: NodeJS.Timeout;

    const monitor = async () => {
      if (!isMonitoring) return;

      try {
        const imageBase64 = this.captureFrame(videoElement);
        if (imageBase64) {
          const result = await this.performLivenessCheck(imageBase64);
          onResult(result);
        }
      } catch (error) {
  if (error instanceof Error) {
    onError(error.message);
  } else {
    onError(String(error));
  }
}


      if (isMonitoring) {
        timeoutId = setTimeout(monitor, intervalMs);
      }
    };

    // Start monitoring
    monitor();

    // Return cleanup function
    return () => {
      isMonitoring = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }

  /**
   * Stop camera stream and cleanup
   */
  stopCameraStream(): void {
    if (this.currentStream) {
      this.currentStream.getTracks().forEach(track => track.stop());
      this.currentStream = null;
    }
  }

  /**
   * Validate liveness result against security thresholds
   */
  validateLivenessResult(result: LivenessResult): {
    isValid: boolean;
    reason?: string;
    score: number;
  } {
    const MIN_CONFIDENCE = 0.7;
    const MIN_FACE_COUNT = 1;
    const MAX_FACE_COUNT = 1;

    if (!result.faceDetected) {
      return {
        isValid: false,
        reason: 'No face detected in image',
        score: 0
      };
    }

    if (result.faceCount < MIN_FACE_COUNT || result.faceCount > MAX_FACE_COUNT) {
      return {
        isValid: false,
        reason: `Expected 1 face, found ${result.faceCount}`,
        score: result.confidence
      };
    }

    if (result.confidence < MIN_CONFIDENCE) {
      return {
        isValid: false,
        reason: `Low confidence score: ${(result.confidence * 100).toFixed(1)}%`,
        score: result.confidence
      };
    }

    if (!result.eyesOpen) {
      return {
        isValid: false,
        reason: 'Eyes must be open for verification',
        score: result.confidence
      };
    }

    if (!result.headPose) {
      return {
        isValid: false,
        reason: 'Please look directly at camera',
        score: result.confidence
      };
    }

    if (!result.isLive) {
      return {
        isValid: false,
        reason: 'Liveness verification failed - potential spoofing detected',
        score: result.confidence
      };
    }

    return {
      isValid: true,
      score: result.confidence
    };
  }

  /**
   * Get detailed liveness status for UI display
   */
  getLivenessStatus(result: LivenessResult): {
    status: 'checking' | 'success' | 'warning' | 'error';
    message: string;
    details: string[];
    confidence: number;
  } {
    const validation = this.validateLivenessResult(result);
    
    if (validation.isValid) {
      return {
        status: 'success',
        message: 'Liveness verified successfully',
        details: [
          '✓ Face detected',
          '✓ Eyes open',
          '✓ Proper head pose',
          '✓ Anti-spoofing passed',
          `✓ Confidence: ${(result.confidence * 100).toFixed(1)}%`
        ],
        confidence: result.confidence
      };
    } else {
      return {
        status: 'error',
        message: validation.reason || 'Liveness check failed',
        details: [
          `Face detected: ${result.faceDetected ? '✓' : '✗'}`,
          `Eyes open: ${result.eyesOpen ? '✓' : '✗'}`,
          `Head pose: ${result.headPose ? '✓' : '✗'}`,
          `Face count: ${result.faceCount}`,
          `Confidence: ${(result.confidence * 100).toFixed(1)}%`
        ],
        confidence: result.confidence
      };
    }
  }
}

// Export singleton instance
export const livenessService = new LivenessDetectionService();