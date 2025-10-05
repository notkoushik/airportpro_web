// src/types/passport.ts
export interface PassportData {
  documentType: string;
  countryCode: string;
  surname: string;
  givenNames: string;
  passportNumber: string;
  nationality: string;
  dateOfBirth: string;
  sex: string;
  dateOfExpiry: string;
  personalNumber?: string;
}

export interface MRZData {
  line1: string;
  line2: string;
  parsed: PassportData;
  confidence: number;
}

export interface ScanResult {
  success: boolean;
  data?: MRZData;
  error?: string;
  timestamp: Date;
}
