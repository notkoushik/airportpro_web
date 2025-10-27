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
  documentType?: string;
  
  // NEW: Checksum validation fields
  checksumValid: boolean;
  checksumDetails?: {
    passportNumber: boolean;
    dateOfBirth: boolean;
    expiryDate: boolean;
    personalNumber?: boolean;
  };
  
  raw: {
    line1: string;
    line2: string;
    line3?: string;
    format?: 'TD1' | 'TD2' | 'TD3';
  };
  
  confidence?: number;
  photoBase64?: string;
}

export interface PassportScanResult {
  success: boolean;
  data?: PassportData;
  error?: string;
  confidence?: number;
  suggestion?: string;
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
  web: async () => {
    const m = await import('./web');
    return new m.PassportScannerWeb();
  },
});

export default PassportScanner;
