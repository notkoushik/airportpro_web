// Augment Capacitor's PluginRegistry with our custom plugins
declare module "@capacitor/core" {
  interface PluginRegistry {
    // Liveness Plugin
    LivenessPlugin: {
      checkLiveness(options: { imageData: string }): Promise<{
        isLive: boolean;
        confidence: number;
        faceDetected: boolean;
        eyesOpen: boolean;
        headPose: boolean;
        faceCount: number;
        details: string;
        timestamp: number;
      }>;
    };

    // Passport Scanner Plugin
    PassportScannerPlugin: {
      scanPassportMRZ(options: { imageData: string }): Promise<{
        success: boolean;
        data?: any;
        confidence?: number;
        rawText?: string;
        error?: string;
        suggestions?: string[];
      }>;
      preprocessImage(options: { imageData: string }): Promise<{
        success: boolean;
        processedImage: string;
      }>;
    };

    // NFC Passport Reader Plugin
    NFCPassportReaderPlugin: {
      readNFCPassport(options: {
        documentNumber: string;
        dateOfBirth: string;
        dateOfExpiry: string;
      }): Promise<{
        success: boolean;
        data?: any;
        readingTime?: number;
        timestamp?: number;
        error?: string;
      }>;
      checkNFCSupport(): Promise<{
        supported: boolean;
        enabled: boolean;
        available: boolean;
        error?: string;
      }>;
    };

    // SmartScanner Plugin (NEW)
    SmartScannerPlugin: {
      executeScanner(options: {
        action: 'START_SCANNER' | 'READ_NFC';
        options: {
          mode?: 'mrz';
          mrzFormat?: 'MRTD_TD3';
          mrz?: any; // MRZ data from previous scan for NFC
        };
      }): Promise<{
        success: boolean;
        data?: any; // This 'any' should ideally be a more specific type based on plugin docs
        error?: string;
      }>;
    };
  }
}

// Keep existing Android bridge declarations
declare global {
  interface Window {
    Android?: { 
      startLiveness: () => void;
      startLivenessVerification?: () => void;
      startEnrollment?: () => void;
      openAuth?: () => void;
      openEnroll?: () => void;
      toast?: (msg: string) => void;
      getStatus?: () => string;
      close?: () => void;
      postMessage?: (msg: string) => void;
    };
    onLivenessResult?: (res: { ok: boolean; score: number }) => void;
    CapacitorCustomNative?: {
      checkLiveness: (params: { imageData: string }) => Promise<{
        isLive: boolean;
        confidence: number;
        faceDetected: boolean;
        eyesOpen: boolean;
        headPose: boolean;
      }>;
    };
  }
}

export {};
