// src/plugins/PassportScanner.ts
import { registerPlugin } from '@capacitor/core';

export interface PassportData {
  documentNumber: string;
  surname: string;
  givenNames: string;
  nationality: string;
  dateOfBirth: string;
  sex: string;
  expiryDate: string;
  personalNumber?: string;
  issueDate?: string;
  issuingState: string;
  raw: {
    line1: string;
    line2: string;
    line3?: string;
  };
  photoBase64?: string; // The base64 encoded passport photo
}

export interface PassportScanResult {
  success: boolean;
  data?: PassportData;
  error?: string;
  confidence?: number;
}

export interface PassportScannerPlugin {
  /**
   * Scan passport MRZ using camera
   */
  scanPassport(): Promise<PassportScanResult>;
  
  /**
   * Scan passport MRZ from image file
   */
  scanFromImage(options: { imagePath: string }): Promise<PassportScanResult>;
  
  /**
   * Check if ML Kit models are downloaded
   */
  checkModelsReady(): Promise<{ ready: boolean }>;
}

const PassportScanner = registerPlugin<PassportScannerPlugin>('PassportScanner', {
  web: () => import('./web').then(m => new m.PassportScannerWeb()),
});

export default PassportScanner;
