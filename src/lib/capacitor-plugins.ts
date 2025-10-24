// src/lib/capacitor-plugins.ts
// Capacitor plugin registrations for native features

import { registerPlugin, Plugin } from '@capacitor/core';
import { PassportData } from '@/types/passport';

export { PassportData };

export interface LivenessPlugin {
  checkLiveness(options: { imageData: string }): Promise<LivenessResult>;
}

export interface LivenessResult {
  isLive: boolean;
  confidence: number;
  faceDetected: boolean;
  eyesOpen: boolean;
  headPose: boolean;
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
  scanPassportMRZ(imageData: string): Promise<{ success: boolean; data?: any; confidence?: number; error?: string }>;
}

export const AirportProPlugins = registerPlugin<AirportProPlugins>('AirportPro');
