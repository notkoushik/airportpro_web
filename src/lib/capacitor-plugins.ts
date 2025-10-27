import { registerPlugin } from '@capacitor/core';

export interface LivenessPlugin {
  startLiveness(): Promise<{ success: boolean; score: number }>;
  stopLiveness(): Promise<void>;
}

export interface PassportScannerPlugin {
  scanPassport(): Promise<{ success: boolean; data: string }>;
  scanNFC(params: { passportNumber: string; dateOfBirth: string; expiryDate: string }): Promise<{ success: boolean; data: string }>;
}

export interface NFCReaderPlugin {
  isAvailable(): Promise<{ available: boolean }>;
  readPassportChip(params: { bac: { passportNumber: string; dateOfBirth: string; expiryDate: string } }): Promise<{ success: boolean; data: any }>;
}

// Register plugins with fallbacks for web
export const LivenessPluginNative = registerPlugin<LivenessPlugin>('LivenessPlugin', {
  web: () => ({
    startLiveness: async () => ({ success: false, score: 0 }),
    stopLiveness: async () => {}
  })
});

export const PassportScannerPluginNative = registerPlugin<PassportScannerPlugin>('PassportScannerPlugin', {
  web: () => ({
    scanPassport: async () => ({ success: false, data: '' }),
    scanNFC: async () => ({ success: false, data: '' })
  })
});

export const NFCReaderPluginNative = registerPlugin<NFCReaderPlugin>('NFCReaderPlugin', {
  web: () => ({
    isAvailable: async () => ({ available: false }),
    readPassportChip: async () => ({ success: false, data: null })
  })
});
