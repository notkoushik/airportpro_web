// src/services/PassportScannerService.ts
// Core MRZ parsing and validation logic

import { PassportData, MRZLine, MRZParseResult, DocumentType } from '@/types/passport';

/**
 * Validates MRZ checksum using check digit algorithm
 * According to ICAO Doc 9303 specifications
 */
function validateCheckDigit(input: string, checkDigit: string): boolean {
  const weights = [7, 3, 1];
  const charValues: { [key: string]: number } = {};
  
  // Build character value map
  for (let i = 0; i < 10; i++) {
    charValues[i.toString()] = i;
  }
  for (let i = 0; i < 26; i++) {
    charValues[String.fromCharCode(65 + i)] = 10 + i; // A=10, B=11, ...
  }
  charValues['<'] = 0;
  
  let sum = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    const value = charValues[char] || 0;
    sum += value * weights[i % 3];
  }
  
  const calculatedCheckDigit = (sum % 10).toString();
  return calculatedCheckDigit === checkDigit;
}

/**
 * Extracts name from MRZ format (SURNAME<<GIVENNAMES)
 */
function parseName(nameField: string): { surname: string; givenNames: string; fullName: string } {
  const parts = nameField.split('<<');
  const surname = (parts[0] || '').replace(/</g, ' ').trim();
  const givenNames = (parts[1] || '').replace(/</g, ' ').trim();
  const fullName = `${givenNames} ${surname}`.trim();
  
  return { surname, givenNames, fullName };
}

/**
 * Converts MRZ date format (YYMMDD) to human readable
 */
function formatDate(mrzDate: string): string {
  if (mrzDate.length !== 6) return mrzDate;
  
  const year = parseInt(mrzDate.substring(0, 2));
  const month = mrzDate.substring(2, 4);
  const day = mrzDate.substring(4, 6);
  
  // Handle century (assume 1900s for years > 50, 2000s otherwise)
  const fullYear = year > 50 ? 1900 + year : 2000 + year;
  
  return `${day}/${month}/${fullYear}`;
}

/**
 * Parse Type-3 MRZ (2 lines, 44 characters each) - Standard Passport
 */
function parseType3MRZ(line1: string, line2: string): MRZParseResult {
  try {
    if (line1.length !== 44 || line2.length !== 44) {
      return {
        success: false,
        error: `Invalid MRZ length. Expected 44 chars per line, got ${line1.length} and ${line2.length}`
      };
    }
    
    // Line 1: P<ISSSURNAME<<GIVENNAMES
    const documentCode = line1.substring(0, 2);
    const issuingCountry = line1.substring(2, 5).replace(/</g, '');
    const nameField = line1.substring(5, 44);
    const { surname, givenNames, fullName } = parseName(nameField);
    
    // Line 2: Passport#CheckDOBCheckExpCheckPersonal#CheckFinal
    const passportNumber = line2.substring(0, 9).replace(/</g, '');
    const passportCheckDigit = line2.substring(9, 10);
    const nationality = line2.substring(10, 13).replace(/</g, '');
    const dateOfBirth = line2.substring(13, 19);
    const dobCheckDigit = line2.substring(19, 20);
    const sex = line2.substring(20, 21);
    const expiryDate = line2.substring(21, 27);
    const expiryCheckDigit = line2.substring(27, 28);
    const personalNumber = line2.substring(28, 42).replace(/</g, '');
    const personalCheckDigit = line2.substring(42, 43);
    const finalCheckDigit = line2.substring(43, 44);
    
    // Validate checksums
    const passportNumberValid = validateCheckDigit(
      line2.substring(0, 9), 
      passportCheckDigit
    );
    const dateOfBirthValid = validateCheckDigit(dateOfBirth, dobCheckDigit);
    const expiryDateValid = validateCheckDigit(expiryDate, expiryCheckDigit);
    const personalNumberValid = personalNumber 
      ? validateCheckDigit(line2.substring(28, 42), personalCheckDigit)
      : true;
    
    // Final check digit validates entire line 2 (except final check digit itself)
    const compositeString = line2.substring(0, 10) + 
                           line2.substring(13, 20) + 
                           line2.substring(21, 43);
    const finalValid = validateCheckDigit(compositeString, finalCheckDigit);
    
    const checksumValid = passportNumberValid && 
                         dateOfBirthValid && 
                         expiryDateValid && 
                         personalNumberValid && 
                         finalValid;
    
    const data: PassportData = {
      documentType: documentCode,
      documentCode,
      surname,
      givenNames,
      fullName,
      passportNumber,
      nationality,
      issuingCountry,
      dateOfBirth,
      dateOfBirthFormatted: formatDate(dateOfBirth),
      expiryDate,
      expiryDateFormatted: formatDate(expiryDate),
      sex,
      personalNumber: personalNumber || undefined,
      checksumValid,
      checksumDetails: {
        passportNumberValid,
        dateOfBirthValid,
        expiryDateValid,
        personalNumberValid,
        finalValid
      },
      rawMRZ: { line1, line2 },
      parsedAt: new Date()
    };
    
    return {
      success: true,
      data,
      rawText: `${line1}\n${line2}`
    };
    
  } catch (error) {
    return {
      success: false,
      error: `MRZ parsing failed: ${error}`,
      rawText: `${line1}\n${line2}`
    };
  }
}

/**
 * Parse Type-1 MRZ (3 lines, 30 characters each) - ID Cards
 */
function parseType1MRZ(line1: string, line2: string, line3: string): MRZParseResult {
  try {
    if (line1.length !== 30 || line2.length !== 30 || line3.length !== 30) {
      return {
        success: false,
        error: `Invalid ID card MRZ length. Expected 30 chars per line`
      };
    }
    
    // Line 1: ISISSSDOCUMENT#CHECKOPT
    const documentCode = line1.substring(0, 2);
    const issuingCountry = line1.substring(2, 5).replace(/</g, '');
    const documentNumber = line1.substring(5, 14).replace(/</g, '');
    const docCheckDigit = line1.substring(14, 15);
    const optionalData = line1.substring(15, 30).replace(/</g, '');
    
    // Line 2: DOBCHECKGENDEREXPCHECKNAT
    const dateOfBirth = line2.substring(0, 6);
    const dobCheckDigit = line2.substring(6, 7);
    const sex = line2.substring(7, 8);
    const expiryDate = line2.substring(8, 14);
    const expiryCheckDigit = line2.substring(14, 15);
    const nationality = line2.substring(15, 18).replace(/</g, '');
    const optionalData2 = line2.substring(18, 29).replace(/</g, '');
    const finalCheckDigit = line2.substring(29, 30);
    
    // Line 3: SURNAME<<GIVENNAMES
    const nameField = line3;
    const { surname, givenNames, fullName } = parseName(nameField);
    
    // Validate checksums
    const documentNumberValid = validateCheckDigit(
      line1.substring(5, 14), 
      docCheckDigit
    );
    const dateOfBirthValid = validateCheckDigit(dateOfBirth, dobCheckDigit);
    const expiryDateValid = validateCheckDigit(expiryDate, expiryCheckDigit);
    
    const compositeString = line1.substring(5, 30) + line2.substring(0, 7) + line2.substring(8, 15) + line2.substring(18, 29);
    const finalValid = validateCheckDigit(compositeString, finalCheckDigit);
    
    const checksumValid = documentNumberValid && 
                         dateOfBirthValid && 
                         expiryDateValid && 
                         finalValid;
    
    const data: PassportData = {
      documentType: documentCode,
      documentCode,
      surname,
      givenNames,
      fullName,
      passportNumber: documentNumber,
      nationality,
      issuingCountry,
      dateOfBirth,
      dateOfBirthFormatted: formatDate(dateOfBirth),
      expiryDate,
      expiryDateFormatted: formatDate(expiryDate),
      sex,
      optionalData: `${optionalData} ${optionalData2}`.trim() || undefined,
      checksumValid,
      checksumDetails: {
        passportNumberValid: documentNumberValid,
        dateOfBirthValid,
        expiryDateValid,
        finalValid
      },
      rawMRZ: { line1, line2, line3 },
      parsedAt: new Date()
    };
    
    return {
      success: true,
      data,
      rawText: `${line1}\n${line2}\n${line3}`
    };
    
  } catch (error) {
    return {
      success: false,
      error: `ID card MRZ parsing failed: ${error}`,
      rawText: `${line1}\n${line2}\n${line3}`
    };
  }
}

/**
 * Main MRZ parsing function - auto-detects type
 */
export function parseMRZ(mrzText: string): MRZParseResult {
  const lines = mrzText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
  
  if (lines.length === 2) {
    // Type-3 MRZ (Passport)
    return parseType3MRZ(lines[0], lines[1]);
  } else if (lines.length === 3) {
    // Type-1 MRZ (ID Card)
    return parseType1MRZ(lines[0], lines[1], lines[2]);
  } else {
    return {
      success: false,
      error: `Invalid MRZ format. Expected 2 or 3 lines, got ${lines.length}`,
      rawText: mrzText
    };
  }
}

/**
 * Preprocesses MRZ text from OCR output
 * Cleans common OCR errors
 */
export function preprocessMRZText(ocrText: string): string {
  return ocrText
    .toUpperCase()
    .replace(/\s+/g, '') // Remove all whitespace
    .replace(/0/g, 'O') // Common OCR confusion: 0 -> O
    .replace(/1/g, 'I') // Common OCR confusion: 1 -> I (in some contexts)
    .replace(/8/g, 'B') // Common OCR confusion in some fonts
    .replace(/[^A-Z0-9<]/g, '<'); // Replace invalid chars with <
}

export const PassportScannerService = {
  parseMRZ,
  preprocessMRZText,
  validateCheckDigit,
  formatDate
};
