// src/lib/liveness-integration.ts
// Integration layer for liveness detection

import { Capacitor } from '@capacitor/core';
// ✅ FIXED: Import the correct export
import { AirportProPlugins } from './capacitor-plugins';

export interface LivenessResult {
  success: boolean;
  score?: number;
  error?: string;
  method: 'native' | 'web';
}

/**
 * Performs liveness detection using native plugin or web fallback
 */
export async function performLivenessCheck(imageData?: string): Promise<LivenessResult> {
  const platform = Capacitor.getPlatform();
  
  try {
    if (platform === 'android' || platform === 'ios') {
      if (!imageData) {
        return {
          success: false,
          error: 'Image data required for native liveness check',
          method: 'native'
        };
      }

      // ✅ FIXED: Use AirportProPlugins instead of LivenessPluginNative
      const result = await AirportProPlugins.checkLiveness(imageData);
      
      return {
        success: result.isLive,
        score: result.confidence,
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
