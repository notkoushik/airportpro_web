// src/lib/capacitor-plugins.ts
import { Capacitor } from '@capacitor/core';

// Define plugin interfaces
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

export interface PassportData {
  documentType: string;
  countryCode: string;
  surname: string;
  givenNames: string;
  documentNumber: string;
  nationality: string;
  birthDate: string;
  gender: string;
  expirationDate: string;
  personalNumber?: string;
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
const LivenessPlugin = Capacitor.registerPlugin('LivenessPlugin');
const PassportScannerPlugin = Capacitor.registerPlugin('PassportScannerPlugin');
const NFCPassportReaderPlugin = Capacitor.registerPlugin('NFCPassportReaderPlugin');

// Exported functions for React components
export const AirportProPlugins = {
  // Liveness Detection
  async checkLiveness(imageBase64: string): Promise<LivenessResult> {
    if (!Capacitor.isNativePlatform()) {
      // Fallback for web/browser testing
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
      throw new Error(`Liveness check failed: ${error}`);
    }
  },

  // Passport MRZ Scanning
  async scanPassportMRZ(imageBase64: string): Promise<PassportScanResult> {
    if (!Capacitor.isNativePlatform()) {
      // Mock data for web testing
      return {
        success: true,
        data: {
          documentType: 'P',
          countryCode: 'USA',
          surname: 'DOE',
          givenNames: 'JOHN',
          documentNumber: '123456789',
          nationality: 'USA',
          birthDate: '900101',
          gender: 'M',
          expirationDate: '301201',
        },
        confidence: 0.95
      };
    }

    try {
      const result = await PassportScannerPlugin.scanPassportMRZ({ imageData: imageBase64 });
      return result as PassportScanResult;
    } catch (error) {
      throw new Error(`Passport scan failed: ${error}`);
    }
  },

  // NFC Passport Reading
  async readNFCPassport(documentNumber: string, dateOfBirth: string, dateOfExpiry: string): Promise<NFCResult> {
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
        dateOfExpiry
      });
      return result as NFCResult;
    } catch (error) {
      throw new Error(`NFC reading failed: ${error}`);
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
      return { supported: false, enabled: false, available: false, error: error.toString() };
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
      throw new Error(`Image preprocessing failed: ${error}`);
    }
  }
};