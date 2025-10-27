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
  issuingState: string;
  documentType?: string;
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
}

export interface PassportScanResult {
  success: boolean;
  data?: PassportData;
  error?: string;
  confidence?: number;
  suggestion?: string;
  rawLines?: { lines: string };
}

export interface PassportScannerPlugin {
  scanPassport(): Promise<PassportScanResult>;
  scanFromImage(options: { imagePath: string }): Promise<PassportScanResult>;
  checkModelsReady(): Promise<{ ready: boolean }>;
}

const PassportScanner = registerPlugin<PassportScannerPlugin>('PassportScanner', {
  web: () => import('./web').then(m => new m.PassportScannerWeb()),
});

export default PassportScanner;
