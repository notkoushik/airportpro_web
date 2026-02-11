// src/types/global.d.ts
/// <reference types="vite/client" />

// Extend global Window interface
declare global {
  interface Window {
    Capacitor?: any;
    Android?: {
      startLivenessVerification?: () => void;
      startEnrollment?: () => void;
      openAuth?: () => void;
      openEnroll?: () => void;
      toast?: (msg?: string) => void;
      getStatus?: () => string;
      close?: () => void;
      postMessage?: (msg?: string) => void;
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
    Camera?: any;
    LivenessPlugin?: any;
    PassportScannerPlugin?: any;
    NFCPassportReaderPlugin?: any;
  }
}

// Module augmentation for imports
declare module '*.png';
declare module '*.jpg';
declare module '*.jpeg';
declare module '*.svg';
declare module '*.gif';

export {};