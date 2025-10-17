export interface PassportData {
  documentType: string;
  countryCode: string;
  surname: string;
  givenNames: string;
  passportNumber: string;
  nationality: string;
  dateOfBirth: string;
  dateOfExpiry:string;
  sex: string;
  personalNumber?: string;
  rawMRZ?: string;
  validations: {
    passportNumber: boolean;
    dateOfBirth: boolean;
    dateOfExpiry: boolean;
    personalNumber: boolean;
    finalCheck: boolean;
  };
}

/**
 * Parses the two-line Machine-Readable Zone (MRZ) from an ICAO 9303 compliant document.
 * @param mrzText The raw text containing the two MRZ lines.
 * @returns A PassportData object or null if parsing fails.
 */
export function parseICAOMRZ(mrzText: string): PassportData | null {
  try {
    console.log('🔍 Starting ICAO MRZ parsing...');
    // Step 1: Extract and clean MRZ lines
    const lines = mrzText
      .split('\n')
      .map(line => cleanMRZLine(line))
      .filter(line => line.length >= 44); // Standard MRZ lines are 44 chars

    if (lines.length < 2) {
      console.error('❌ Insufficient or invalid length MRZ lines found.');
      return null;
    }

    const line1 = lines[0].padEnd(44, '<');
    const line2 = lines[1].padEnd(44, '<');
    console.log('✅ Cleaned Line 1:', line1);
    console.log('✅ Cleaned Line 2:', line2);

    // Step 2: Parse Line 1 (Document type, country, names)
    const documentType = line1.charAt(0);
    const countryCode = line1.substring(2, 5).replace(/</g, '');
    const nameField = line1.substring(5, 44);
    const { surname, givenNames } = parseNameField(nameField);

    // Step 3: Parse Line 2 and extract check digits
    const passportNumber = extractField(line2, 0, 9);
    const passportNumberCheck = line2.charAt(9);
    const nationalityCode = extractField(line2, 10, 13);
    const birthDateRaw = line2.substring(13, 19);
    const birthDateCheck = line2.charAt(19);
    const sex = line2.charAt(20);
    const expiryDateRaw = line2.substring(21, 27);
    const expiryDateCheck = line2.charAt(27);
    const personalNumber = extractField(line2, 28, 42);
    const personalNumberCheck = line2.charAt(42);
    const finalCheckDigit = line2.charAt(43);

    // Step 4: Perform Checksum Validations
    const validations = {
      passportNumber: validateChecksum(passportNumber, passportNumberCheck),
      dateOfBirth: validateChecksum(birthDateRaw, birthDateCheck),
      dateOfExpiry: validateChecksum(expiryDateRaw, expiryDateCheck),
      personalNumber: validateChecksum(personalNumber, personalNumberCheck),
      finalCheck: validateChecksum(line2.substring(0, 10) + line2.substring(13, 20) + line2.substring(21, 43), finalCheckDigit)
    };

    // If any core validation fails, reject the entire MRZ.
    if (!validations.passportNumber || !validations.dateOfBirth || !validations.dateOfExpiry || !validations.finalCheck) {
      console.error('❌ MRZ checksum validation failed!', validations);
      return null;
    }

    // Step 5: Convert dates
    const dateOfBirth = convertMRZDate(birthDateRaw);
    const dateOfExpiry = convertMRZDate(expiryDateRaw);

    // Step 6: Return parsed data
    return {
      documentType,
      countryCode,
      surname,
      givenNames,
      passportNumber,
      nationality: getCountryName(nationalityCode || countryCode),
      dateOfBirth,
      dateOfExpiry,
      sex,
      personalNumber,
      validations
    };
  } catch (error) {
    console.error('❌ MRZ parsing error:', error);
    return null;
  }
}

// Helper: Clean MRZ line by removing spaces and fixing common OCR errors.
function validateChecksum(data: string, checkDigit: string): boolean {
  if (checkDigit === '<' && data.replace(/</g, '').length === 0) {
    return true; // Optional field that is empty is valid.
  }

  const weights = [7, 3, 1];
  let sum = 0;

  for (let i = 0; i < data.length; i++) {
    const char = data.charAt(i);
    const value = getCharValue(char);
    sum += value * weights[i % 3];
  }

  const calculatedCheckDigit = sum % 10;
  const expectedCheckDigit = parseInt(checkDigit, 10);

  return calculatedCheckDigit === expectedCheckDigit;
}

// Helper: Get the ICAO 9303 value for a character.
function getCharValue(char: string): number {
  if (char >= '0' && char <= '9') {
    return parseInt(char, 10);
  }
  if (char >= 'A' && char <= 'Z') {
    return char.charCodeAt(0) - 'A'.charCodeAt(0) + 10;
  }
  return 0; // '<' has a value of 0
}

function cleanMRZLine(line: string): string {
  return line
    .toUpperCase()
    .replace(/\s/g, '') // Remove all whitespace
    .replace(/O/g, '0') // Fix common OCR error: O -> 0
    .replace(/I/g, '1') // Fix common OCR error: I -> 1
    .replace(/G/g, 'C') // Fix common OCR error: G -> C
    .replace(/B/g, '8') // Fix common OCR error: B -> 8
    .replace(/[^A-Z0-9<]/g, ''); // Remove any remaining invalid characters
}

// Helper: Parse name field which is delimited by '<<'.
function parseNameField(nameField: string): { surname: string; givenNames: string } {
  const cleaned = nameField.replace(/<+$/, '');
  const parts = cleaned.split('<<');
  const surname = (parts[0] || '').replace(/</g, ' ').trim();
  const givenNames = (parts[1] || '').replace(/</g, ' ').trim();
  return {
    surname: surname || 'UNKNOWN',
    givenNames: givenNames || 'UNKNOWN'
  };
}

// Helper: Extract a field from a line and remove filler characters.
function extractField(line: string, start: number, end: number): string {
  if (start >= line.length) return '';
  const actualEnd = Math.min(end, line.length);
  return line.substring(start, actualEnd).replace(/</g, '').trim();
}

// Helper: Convert MRZ date (YYMMDD) to a standard DD/MM/YYYY format.
function convertMRZDate(mrzDate: string): string {
  if (mrzDate.length !== 6) return 'Invalid Date';
  try {
    const year = parseInt(mrzDate.substring(0, 2), 10);
    const month = parseInt(mrzDate.substring(2, 4), 10);
    const day = parseInt(mrzDate.substring(4, 6), 10);

    if (isNaN(year) || isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) {
      return 'Invalid Date';
    }

    // Determine the full year (YY > current year's last two digits is 19xx)
    const currentYearLastTwo = new Date().getFullYear() % 100;
    const fullYear = year > currentYearLastTwo ? 1900 + year : 2000 + year;

    return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${fullYear}`;
  } catch {
    return 'Invalid Date';
  }
}

// Helper: Get full country name from its 3-letter code.
function getCountryName(code: string): string {
  const countries: Record<string, string> = {
    'IND': 'India', 'USA': 'United States', 'GBR': 'United Kingdom',
    'CAN': 'Canada', 'AUS': 'Australia', 'DEU': 'Germany',
    'FRA': 'France', 'CHN': 'China', 'JPN': 'Japan',
  };
  return countries[code] || code || 'Unknown';
}