// src/plugins/web.ts
import { WebPlugin } from '@capacitor/core';
import type { PassportScannerPlugin, PassportScanResult } from './PassportScanner';

export class PassportScannerWeb extends WebPlugin implements PassportScannerPlugin {
  
  async scanPassport(): Promise<PassportScanResult> {
    console.error('❌ PassportScanner: Web platform not supported');
    console.error('❌ This should only run on Android/iOS with native plugin');
    
    throw new Error(
      'Passport scanning is only available on mobile devices. ' +
      'Please run this app on Android or iOS.'
    );
  }

  async scanFromImage(options: { imagePath: string }): Promise<PassportScanResult> {
    console.error('❌ PassportScanner: Web platform not supported');
    console.error('❌ Attempted to scan from:', options.imagePath);
    console.error('❌ This should NEVER be called on Android - check plugin registration!');
    
    throw new Error(
      'Passport scanning is only available on mobile devices with ML Kit. ' +
      'If you are seeing this on Android, the native plugin failed to register!'
    );
  }

  async checkModelsReady(): Promise<{ ready: boolean }> {
    console.warn('⚠️  PassportScanner: Web fallback - models not available');
    return { ready: false };
  }
}
