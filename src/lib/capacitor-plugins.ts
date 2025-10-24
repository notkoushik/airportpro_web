// src/lib/capacitor-plugins.ts
// Capacitor plugin registrations for native features

import { registerPlugin, Plugin } from '@capacitor/core';
import type { PassportData } from '@/types/passport'; // ✅ FIXED: Use 'type' import

// ✅ FIXED: Use 'export type' instead of 'export'
export type { PassportData };

export interface LivenessResult {
  isLive: boolean;
  confidence: number;
  faceDetected: boolean;
  eyesOpen: boolean;
  headPose: boolean;
  // ✅ REMOVED 'details' property
}

export interface LivenessPlugin {
  checkLiveness(options: { imageData: string }): Promise<LivenessResult>;
}

export interface PassportScannerPlugin {
  scanPassport(): Promise<{ success: boolean; data: string }>;
  scanNFC(params: { passportNumber: string; dateOfBirth: string; expiryDate: string }): Promise<{ success: boolean; data: string }>;
}

export interface NFCReaderPlugin {
  isAvailable(): Promise<{ available: boolean }>;
  readPassportChip(params: { bac: { passportNumber: string; dateOfBirth: string; expiryDate: string } }): Promise<{ success: boolean; data: any }>;
}

export interface AirportProPlugins extends Plugin {
  checkLiveness(imageData: string): Promise<LivenessResult>;
  preprocessImage(imageData: string): Promise<{ success: boolean; processedImage: string }>;
  scanPassportMRZ(imageData: string): Promise<{ success: boolean; data?: PassportData; confidence?: number; error?: string }>;
  
  // ✅ ADDED: Missing methods
  checkNFCSupport(): Promise<{ available: boolean }>;
  readNFCPassport(documentNumber: string, dateOfBirth: string, expiryDate: string): Promise<{ success: boolean; data?: any; error?: string }>;
}

export const AirportProPlugins = registerPlugin<AirportProPlugins>('AirportPro');
