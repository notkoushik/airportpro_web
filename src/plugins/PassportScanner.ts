import { registerPlugin } from '@capacitor/core';
// Import the application-level type definition
import type { PassportData as AppPassportData } from '@/types/passport';

// Define the plugin's PassportData by extending the application's definition.
// Assuming AppPassportData contains all the necessary fields,
// we might not need to re-declare them here unless the plugin adds specific extra fields.
// If the fields are identical, an empty extension is sufficient: export interface PassportData extends AppPassportData {}
// However, to be safe and match the structure returned by your current native code,
// let's keep the fields declared here for now, assuming AppPassportData might have MORE fields.
// Ideally, AppPassportData should be the single source of truth.
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
  // Potentially add any fields from AppPassportData if they are missing,
  // OR remove fields above if they are fully defined in AppPassportData
  // and make this: export interface PassportData extends AppPassportData {}
}

// Keep using PassportScanResult, it internally uses the PassportData defined above.
export interface PassportScanResult {
  success: boolean;
  data?: PassportData; // This now refers to the potentially extended PassportData
  error?: string;
  confidence?: number;
  suggestion?: string;
  rawLines?: { lines: string }; // Keep extra fields if your app logic uses them
}

export interface PassportScannerPlugin {
  // scanPassport method might be deprecated if only scanFromImage is used natively
  scanPassport(): Promise<PassportScanResult>;
  scanFromImage(options: { imagePath: string }): Promise<PassportScanResult>; // Return type remains PassportScanResult
  checkModelsReady(): Promise<{ ready: boolean }>;
}

// Register the plugin WITHOUT the web fallback
const PassportScanner = registerPlugin<PassportScannerPlugin>('PassportScanner');

export default PassportScanner;