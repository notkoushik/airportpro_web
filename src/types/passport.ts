// src/types/passport.ts

export interface PassportData {
  givenNames: string;
  surname: string;
  nationality: string;
  documentNumber: string;
  dateOfBirth: string;
  expiryDate: string;
  photoBase64?: string; // The passport photo as a base64 string
  // Add any other fields you expect from the NFC scan result
  // e.g., issuingCountry, documentType, sex, etc.
}