/// <reference types="vite/client" />

declare global {
  interface Window {
    Android?: {
      // new names
      startLivenessVerification?: () => void;
      startEnrollment?: () => void;

      // legacy names (present right now)
      openAuth?: () => void;
      openEnroll?: () => void;

      // utils
      toast?: (msg?: string) => void;

      getStatus?: () => string;
      close?: () => void;
      postMessage?: (msg: string) => void;
    };
  }
}