export interface MRZLine {
  line1: string;
  line2: string;
  line3?: string; // For ID cards (Type-1 MRZ)
}

export interface PassportData {
  // Document Type
  documentType: string; // 'P' for passport, 'ID' for ID card
  documentCode: string; // Full code (e.g., 'P<')

  // Personal Information
  surname: string;
  givenNames: string;
  fullName: string;

  // Document Details
  passportNumber: string;
  nationality: string;
  issuingCountry: string;

  // Dates
  dateOfBirth: string; // YYMMDD format
  dateOfBirthFormatted: string; // Human readable
  expiryDate: string; // YYMMDD format
  expiryDateFormatted: string; // Human readable

  // Additional Fields
  sex: 'M' | 'F' | 'X' | string;
  personalNumber?: string;
  optionalData?: string;

  // Validation
  checksumValid: boolean;
  checksumDetails: {
    passportNumberValid: boolean;
    dateOfBirthValid: boolean;
    expiryDateValid: boolean;
    personalNumberValid?: boolean;
    finalValid: boolean;
  };

  // Metadata
  rawMRZ: MRZLine;
  parsedAt: Date;
  confidence?: number; // OCR confidence score
}

export interface MRZParseResult {
  success: boolean;
  data?: PassportData;
  error?: string;
  rawText?: string;
}

export interface ScanResult {
  success: boolean;
  data?: PassportData;
  error?: string;
  image?: string; // Base64 encoded image
  processingTime?: number;
}

export enum DocumentType {
  PASSPORT = 'P',
  ID_CARD = 'ID',
  VISA = 'V',
  UNKNOWN = 'UNKNOWN'
}

export enum Gender {
  MALE = 'M',
  FEMALE = 'F',
  UNSPECIFIED = 'X'
}