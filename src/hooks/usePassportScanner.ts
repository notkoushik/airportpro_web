import { useState } from 'react';
import { registerPlugin } from '@capacitor/core';

interface PassportScannerPlugin {
  isNfcAvailable(): Promise<{available: boolean}>;
  scanPassport(options: {
    documentNumber: string;
    dateOfBirth: string;
    dateOfExpiry: string;
  }): Promise<{
    firstName: string;
    lastName: string;
    nationality: string;
    documentNumber: string;
    dateOfBirth: string;
    dateOfExpiry: string;
    gender: string;
    photo?: string;
  }>;
}

const PassportScanner = registerPlugin<PassportScannerPlugin>('PassportScanner');

export interface PassportData {
  firstName: string;
  lastName: string;
  nationality: string;
  documentNumber: string;
  dateOfBirth: string;
  dateOfExpiry: string;
  gender: string;
  photo?: string;
}

export const usePassportScanner = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<PassportData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkNfcAvailability = async (): Promise<boolean> => {
    try {
      const result = await PassportScanner.isNfcAvailable();
      return result.available;
    } catch (err) {
      console.error('NFC check failed:', err);
      return false;
    }
  };

  const scanPassport = async (
    documentNumber: string,
    dateOfBirth: string,
    dateOfExpiry: string
  ) => {
    setIsScanning(true);
    setError(null);
    setScanResult(null);

    try {
      const result = await PassportScanner.scanPassport({
        documentNumber,
        dateOfBirth,
        dateOfExpiry
      });

      setScanResult(result);
      return result;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to scan passport';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsScanning(false);
    }
  };

  return {
    isScanning,
    scanResult,
    error,
    scanPassport,
    checkNfcAvailability
  };
};
