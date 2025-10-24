// src/lib/liveness-integration.ts
// Integration layer for liveness detection

import { Capacitor } from '@capacitor/core';
import { LivenessPluginNative } from './capacitor-plugins';

export interface LivenessResult {
  success: boolean;
  score?: number;
  error?: string;
  method: 'native' | 'web';
}

/**
 * Performs liveness detection using native plugin or web fallback
 */
export async function performLivenessCheck(): Promise<LivenessResult> {
  const platform = Capacitor.getPlatform();
  
  try {
    if (platform === 'android' || platform === 'ios') {
      // Use native liveness detection
      const result = await LivenessPluginNative.startLiveness();
      
      return {
        success: result.success,
        score: result.score,
        method: 'native'
      };
    } else {
      // Web-based liveness (face-api.js based)
      return {
        success: false,
        error: 'Web-based liveness not yet implemented. Use EnhancedLivenessDetector component.',
        method: 'web'
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      method: platform === 'web' ? 'web' : 'native'
    };
  }
}

/**
 * Checks if liveness detection is available
 */
export function isLivenessAvailable(): boolean {
  const platform = Capacitor.getPlatform();
  return platform === 'android' || platform === 'ios';
}
