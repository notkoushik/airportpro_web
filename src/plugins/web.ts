import { WebPlugin } from '@capacitor/core';
import type { PassportScannerPlugin, PassportScanResult } from './PassportScanner';

export class PassportScannerWeb extends WebPlugin implements PassportScannerPlugin {

  async scanPassport(): Promise<PassportScanResult> {
    // Return a consistent PassportScanResult on web by indicating failure
    return { success: false, error: 'Passport scanning is only available on native platforms.' };
  }
  async scanFromImage(options: { imagePath: string }): Promise<PassportScanResult> {
    console.log(options);
    // Return a consistent PassportScanResult on web by indicating failure
    return { success: false, error: 'Passport scanning is only available on native platforms.' };
  }

  async checkModelsReady(): Promise<{ ready: boolean }> {
    return { ready: true };
  }
}