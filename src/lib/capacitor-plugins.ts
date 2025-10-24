// src/lib/capacitor-plugins.ts
import { Capacitor } from '@capacitor/core';

// ============ CORRECTED PASSPORT DATA INTERFACE ============
// This MUST match src/plugins/PassportScanner.ts exactly
export interface PassportData {
  documentNumber: string;
  surname: string;
  givenNames: string;
  nationality: string;
  dateOfBirth: string;      // ✅ FIXED: was "birthDate"
  sex: string;              // ✅ FIXED: was "gender"
  expiryDate: string;       // ✅ FIXED: was "expirationDate"
  personalNumber?: string;
  issuingState: string;
  raw: {
    line1: string;
    line2: string;
    line3?: string;
  };
  photoBase64?: string;
  
  // Optional legacy fields for backward compatibility
  countryCode?: string;
  documentType?: string;
}

// Rest of interfaces remain the same
export interface LivenessResult {
  isLive: boolean;
  confidence: number;
  faceDetected: boolean;
  eyesOpen: boolean;
  headPose: boolean;
  faceCount: number;
  details: string;
  timestamp: number;
}

export interface PassportScanResult {
  success: boolean;
  data?: PassportData;
  confidence?: number;
  rawText?: string;
  error?: string;
  suggestions?: string[];
}

export interface NFCResult {
  success: boolean;
  data?: any;
  readingTime?: number;
  timestamp?: number;
}

// Plugin registrations
const LivenessPlugin = Capacitor.registerPlugin<any>('LivenessPlugin');
const PassportScannerPlugin = Capacitor.registerPlugin<any>('PassportScannerPlugin');
const NFCPassportReaderPlugin = Capacitor.registerPlugin<any>('NFCPassportReaderPlugin');

// Exported functions for React components
export const AirportProPlugins = {
  // Liveness Detection
  async checkLiveness(imageBase64: string): Promise<LivenessResult> {
    if (!Capacitor.isNativePlatform()) {
      return {
        isLive: true,
        confidence: 0.85,
        faceDetected: true,
        eyesOpen: true,
        headPose: true,
        faceCount: 1,
        details: 'Web fallback - use device for real liveness detection',
        timestamp: Date.now()
      };
    }
    try {
      const result = await LivenessPlugin.checkLiveness({ imageData: imageBase64 });
      return result as LivenessResult;
    } catch (error) {
  const errorMsg = error instanceof Error ? error.message : String(error);
  throw new Error(`Liveness check failed: ${errorMsg}`);
}
  },
  // Passport MRZ Scanning
  async scanPassportMRZ(imageBase64: string): Promise<PassportScanResult> {
    if (!Capacitor.isNativePlatform()) {
      // Mock data for web testing with CORRECT property names
      return {
        success: true,
        data: {
          documentNumber: '123456789',
          surname: 'DOE',
          givenNames: 'JOHN',
          nationality: 'USA',
          dateOfBirth: '01/01/1990',     // ✅ FIXED property name
          sex: 'M',                       // ✅ FIXED property name
          expiryDate: '01/12/2030',       // ✅ FIXED property name
          issuingState: 'USA',
          raw: {
            line1: 'P<USADOE<<JOHN<<<<<<<<<<<<<<<<<<<<<<<<<<<<',
            line2: '1234567890USA9001011M3012011<<<<<<<<<<<<<<06'
          }
        },
        confidence: 0.95
      };
    }
    try {
      const result = await PassportScannerPlugin.scanPassportMRZ({ imageData: imageBase64 });
      return result as PassportScanResult;
    } catch (error) {
  const errorMsg = error instanceof Error ? error.message : String(error);
  throw new Error(`Passport scan failed: ${errorMsg}`);
}

  },

  // NFC Passport Reading - FIXED PARAMETER NAMES
  async readNFCPassport(
    documentNumber: string, 
    dateOfBirth: string,        // ✅ FIXED: was different in calls
    expiryDate: string          // ✅ FIXED: was "dateOfExpiry" in some calls
  ): Promise<NFCResult> {
    if (!Capacitor.isNativePlatform()) {
      return {
        success: true,
        data: { message: 'NFC reading requires physical device' },
        timestamp: Date.now()
      };
    }
    try {
      const result = await NFCPassportReaderPlugin.readNFCPassport({
        documentNumber,
        dateOfBirth,
        dateOfExpiry: expiryDate  // Convert parameter name for native plugin
      });
      return result as NFCResult;
    } catch (error) {
  const errorMsg = error instanceof Error ? error.message : String(error);
  throw new Error(`NFC reading failed: ${errorMsg}`);
}

  },

  // NFC Support Check
  async checkNFCSupport() {
    if (!Capacitor.isNativePlatform()) {
      return { supported: false, enabled: false, available: false };
    }
    try {
      return await NFCPassportReaderPlugin.checkNFCSupport();
    } catch (error) {
  const errorMsg = error instanceof Error ? error.message : String(error);
  return { supported: false, enabled: false, available: false, error: errorMsg };
}
  },

  // Image Preprocessing
  async preprocessImage(imageBase64: string) {
    if (!Capacitor.isNativePlatform()) {
      return { success: true, processedImage: imageBase64 };
    }
    try {
      return await PassportScannerPlugin.preprocessImage({ imageData: imageBase64 });
    } catch (error) {
  const errorMsg = error instanceof Error ? error.message : String(error);
  throw new Error(`Image preprocessing failed: ${errorMsg}`);
}

  }
};
