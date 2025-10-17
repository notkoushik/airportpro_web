interface PassportData {
  documentType: string;
  countryCode: string;
  surname: string;
  givenNames: string;
  passportNumber: string;
  nationality: string;
  dateOfBirth: string;
  dateOfExpiry: string;
  sex: string;
  personalNumber?: string;
  rawMRZ: string;
}

interface MRZData {
  line1: string;
  line2: string;
  parsed: PassportData;
  confidence: number;
}

export class PassportScannerService {
  // 🔧 COMPLETELY REWRITTEN MRZ PARSING WITH CORRECT FIELD POSITIONS
  parseMRZFromText(mrzText: string): MRZData | null {
    try {
      console.log('🔍 Starting enhanced MRZ parsing...');
      console.log('Raw MRZ text:', mrzText);
      
      // Split and clean MRZ lines
      const lines = mrzText.split('\n')
        .map(line => this.cleanMRZLine(line))
        .filter(line => line.length >= 30); // MRZ lines should be at least 30 chars
      
      if (lines.length < 2) {
        console.error('❌ Insufficient MRZ lines found');
        return null;
      }
      
      const line1 = lines[0];
      const line2 = lines[1];
      
      console.log('✅ Cleaned Line 1:', line1);
      console.log('✅ Cleaned Line 2:', line2);
      
      // Parse using industry-standard MRZ positions
      const parsedData = this.parseStandardMRZ(line1, line2);
      
      if (!parsedData) {
        console.error('❌ Failed to parse MRZ data');
        return null;
      }
      
      return {
        line1,
        line2,
        parsed: parsedData,
        confidence: this.calculateMRZConfidence(parsedData)
      };
      
    } catch (error) {
      console.error('❌ MRZ parsing error:', error);
      return null;
    }
  }

  // 🔧 INDUSTRY STANDARD MRZ CLEANING
  private cleanMRZLine(line: string): string {
    return line
      .toUpperCase()
      .replace(/\s/g, '') // Remove all spaces
      .replace(/[^A-Z0-9<]/g, '<') // Replace invalid chars with <
      .replace(/0/g, 'O') // In names, 0 should be O
      .replace(/1/g, 'I') // In names, 1 should be I
      .padEnd(44, '<'); // Ensure 44 characters
  }

  // 🔧 STANDARD MRZ PARSING ACCORDING TO ICAO DOC 9303
  private parseStandardMRZ(line1: string, line2: string): PassportData | null {
    try {
      console.log('🔍 Parsing with ICAO DOC 9303 standard...');
      
      // LINE 1: P<ISOCOUNTRYCODE<SURNAME<<GIVENNAMES<<<<<<<<<<<<<<<
      // Position 0: Document type (P)
      // Position 1: Reserved (<)
      // Position 2-4: Issuing country (3 chars)
      // Position 5-43: Names (surname<<given names)
      
      const documentType = line1.charAt(0) || 'P';
      const countryCode = line1.substring(2, 5).replace(/</g, '');
      
      // Parse names from position 5 onwards
      const nameData = this.parseNameField(line1.substring(5));
      
      // LINE 2: PASSPORTNUMBER<DDDCOUNTRYDATE<SEXDATE<PERSONALNUMBER<<<D
      // Position 0-8: Passport number
      // Position 9: Check digit
      // Position 10-12: Nationality
      // Position 13-18: Date of birth (YYMMDD)
      // Position 19: Check digit
      // Position 20: Sex
      // Position 21-26: Date of expiry (YYMMDD)
      // Position 27: Check digit
      // Position 28-41: Personal number
      // Position 42: Check digit for personal number
      // Position 43: Composite check digit
      
      const passportNumber = this.extractField(line2, 0, 9);
      const nationalityCode = this.extractField(line2, 10, 13);
      const birthDateRaw = this.extractField(line2, 13, 19);
      const sex = this.extractField(line2, 20, 21);
      const expiryDateRaw = this.extractField(line2, 21, 27);
      const personalNumber = this.extractField(line2, 28, 42);
      
      // Convert dates
      const dateOfBirth = this.convertMRZDate(birthDateRaw);
      const dateOfExpiry = this.convertMRZDate(expiryDateRaw);
      
      // Get nationality name
      const nationality = this.getCountryName(nationalityCode || countryCode);
      
      const result: PassportData = {
        documentType,
        countryCode: countryCode || 'UNK',
        surname: nameData.surname,
        givenNames: nameData.givenNames,
        passportNumber: passportNumber || 'UNKNOWN',
        nationality,
        dateOfBirth,
        dateOfExpiry,
        sex: sex || 'U',
        personalNumber: personalNumber || undefined,
        rawMRZ: `${line1}\n${line2}`
      };
      
      console.log('✅ Successfully parsed MRZ:', result);
      return result;
      
    } catch (error) {
      console.error('❌ Error in standard MRZ parsing:', error);
      return null;
    }
  }

  // 🔧 ENHANCED NAME PARSING WITH PROPER MRZ FORMAT
  private parseNameField(nameField: string): { surname: string; givenNames: string } {
    console.log('🔍 Parsing name field:', nameField);
    
    // Remove trailing < characters
    const cleaned = nameField.replace(/<+$/, '');
    
    // Standard MRZ format: SURNAME<<GIVENNAME<GIVENNAME2
    if (cleaned.includes('<<')) {
      const parts = cleaned.split('<<');
      const surname = parts[0].replace(/</g, ' ').trim();
      const givenNamesRaw = parts[1] || '';
      const givenNames = givenNamesRaw.replace(/</g, ' ').replace(/\s+/g, ' ').trim();
      
      console.log('✅ Parsed with << separator:', { surname, givenNames });
      return {
        surname: surname || 'UNKNOWN',
        givenNames: givenNames || 'UNKNOWN'
      };
    }
    
    // Fallback: single < separator
    const parts = cleaned.split('<');
    if (parts.length >= 2) {
      const surname = parts[0].trim();
      const givenNames = parts.slice(1).join(' ').replace(/\s+/g, ' ').trim();
      
      console.log('✅ Parsed with single < separator:', { surname, givenNames });
      return {
        surname: surname || 'UNKNOWN',
        givenNames: givenNames || 'UNKNOWN'
      };
    }
    
    // Last resort: treat entire field as surname
    console.log('⚠️ Using entire field as surname');
    return {
      surname: cleaned.replace(/</g, ' ').trim() || 'UNKNOWN',
      givenNames: 'UNKNOWN'
    };
  }

  // 🔧 SAFE FIELD EXTRACTION WITH BOUNDS CHECKING
  private extractField(line: string, start: number, end: number): string {
    if (start >= line.length) return '';
    
    const actualEnd = Math.min(end, line.length);
    const field = line.substring(start, actualEnd);
    
    // Clean the field
    return field.replace(/</g, '').trim();
  }

  // 🔧 ROBUST DATE CONVERSION WITH VALIDATION
  private convertMRZDate(mrzDate: string): string {
    if (!mrzDate || mrzDate.length !== 6) {
      console.warn('⚠️ Invalid MRZ date format:', mrzDate);
      return 'Invalid Date';
    }
    
    try {
      const year = parseInt(mrzDate.substring(0, 2));
      const month = parseInt(mrzDate.substring(2, 4));
      const day = parseInt(mrzDate.substring(4, 6));
      
      // Validate components
      if (isNaN(year) || isNaN(month) || isNaN(day)) {
        console.warn('⚠️ Non-numeric date components:', { year, month, day });
        return 'Invalid Date';
      }
      
      if (month < 1 || month > 12 || day < 1 || day > 31) {
        console.warn('⚠️ Invalid date values:', { year, month, day });
        return 'Invalid Date';
      }
      
      // Determine full year (improved logic)
      let fullYear: number;
      const currentYear = new Date().getFullYear();
      const currentYearShort = currentYear % 100;
      
      if (year <= currentYearShort + 10) {
        // Recent or near-future years
        fullYear = 2000 + year;
      } else {
        // Past years
        fullYear = 1900 + year;
      }
      
      // Final validation
      const date = new Date(fullYear, month - 1, day);
      if (date.getFullYear() !== fullYear || 
          date.getMonth() !== month - 1 || 
          date.getDate() !== day) {
        console.warn('⚠️ Invalid date combination:', { fullYear, month, day });
        return 'Invalid Date';
      }
      
      // Return in DD/MM/YYYY format
      const result = `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${fullYear}`;
      console.log(`✅ Converted date ${mrzDate} -> ${result}`);
      return result;
      
    } catch (error) {
      console.error('❌ Date conversion error:', error);
      return 'Invalid Date';
    }
  }

  // 🔧 COMPREHENSIVE COUNTRY MAPPING
  private getCountryName(code: string): string {
    const countries: { [key: string]: string } = {
      // Major countries
      'IND': 'India',
      'USA': 'United States',
      'GBR': 'United Kingdom', 
      'CAN': 'Canada',
      'AUS': 'Australia',
      'DEU': 'Germany',
      'FRA': 'France',
      'CHN': 'China',
      'JPN': 'Japan',
      'KOR': 'South Korea',
      'SGP': 'Singapore',
      'ARE': 'United Arab Emirates',
      'SAU': 'Saudi Arabia',
      
      // South Asian countries
      'NPL': 'Nepal',
      'BGD': 'Bangladesh', 
      'PAK': 'Pakistan',
      'LKA': 'Sri Lanka',
      'BTN': 'Bhutan',
      'MDV': 'Maldives',
      'AFG': 'Afghanistan',
      
      // Southeast Asian countries
      'IDN': 'Indonesia',
      'THA': 'Thailand',
      'MYS': 'Malaysia',
      'PHL': 'Philippines',
      'VNM': 'Vietnam',
      'MMR': 'Myanmar',
      'KHM': 'Cambodia',
      'LAO': 'Laos',
      'BRN': 'Brunei',
      
      // Middle Eastern countries
      'IRN': 'Iran',
      'IRQ': 'Iraq',
      'ISR': 'Israel',
      'JOR': 'Jordan',
      'KWT': 'Kuwait',
      'LBN': 'Lebanon',
      'OMN': 'Oman',
      'QAT': 'Qatar',
      'SYR': 'Syria',
      'TUR': 'Turkey',
      'YEM': 'Yemen',
      
      // European countries
      'ITA': 'Italy',
      'ESP': 'Spain',
      'NLD': 'Netherlands',
      'BEL': 'Belgium',
      'CHE': 'Switzerland',
      'AUT': 'Austria',
      'SWE': 'Sweden',
      'NOR': 'Norway',
      'DNK': 'Denmark',
      'FIN': 'Finland',
      'POL': 'Poland',
      'CZE': 'Czech Republic',
      'HUN': 'Hungary',
      'ROU': 'Romania',
      'BGR': 'Bulgaria',
      'GRC': 'Greece',
      'PRT': 'Portugal',
      'IRL': 'Ireland',
      'RUS': 'Russia',
      'UKR': 'Ukraine',
      
      // African countries
      'ZAF': 'South Africa',
      'EGY': 'Egypt',
      'NGA': 'Nigeria',
      'KEN': 'Kenya',
      'ETH': 'Ethiopia',
      'GHA': 'Ghana',
      'TUN': 'Tunisia',
      'MAR': 'Morocco',
      'DZA': 'Algeria',
      'LBY': 'Libya',
      
      // American countries
      'MEX': 'Mexico',
      'BRA': 'Brazil',
      'ARG': 'Argentina',
      'CHL': 'Chile',
      'COL': 'Colombia',
      'PER': 'Peru',
      'VEN': 'Venezuela',
      'URY': 'Uruguay',
      'PRY': 'Paraguay',
      'BOL': 'Bolivia',
      'ECU': 'Ecuador',
      
      // Oceanian countries
      'NZL': 'New Zealand',
      'FJI': 'Fiji',
      'PNG': 'Papua New Guinea',
      'VUT': 'Vanuatu',
      'TON': 'Tonga',
      'WSM': 'Samoa',
      'PLW': 'Palau',
      'MHL': 'Marshall Islands',
      'FSM': 'Micronesia',
      'KIR': 'Kiribati',
      'NRU': 'Nauru',
      'TUV': 'Tuvalu'
    };
    
    const cleanCode = code.replace(/[^A-Z]/g, '');
    return countries[cleanCode] || cleanCode || 'Unknown';
  }

  // 🔧 ENHANCED CONFIDENCE CALCULATION
  private calculateMRZConfidence(data: PassportData): number {
    let score = 0;
    const maxScore = 8;
    
    // Document type (10 points)
    if (['P', 'V', 'I'].includes(data.documentType)) score += 1;
    
    // Country code (10 points)
    if (data.countryCode && data.countryCode.length === 3 && /^[A-Z]{3}$/.test(data.countryCode)) score += 1;
    
    // Names (20 points)
    if (data.surname && data.surname !== 'UNKNOWN' && data.surname.length > 1) score += 1;
    if (data.givenNames && data.givenNames !== 'UNKNOWN' && data.givenNames.length > 1) score += 1;
    
    // Passport number (10 points)
    if (data.passportNumber && data.passportNumber !== 'UNKNOWN' && data.passportNumber.length >= 6) score += 1;
    
    // Dates (30 points)
    if (this.isValidFormattedDate(data.dateOfBirth)) score += 1;
    if (this.isValidFormattedDate(data.dateOfExpiry)) score += 1;
    
    // Sex (10 points)
    if (['M', 'F', 'X'].includes(data.sex)) score += 1;
    
    const confidence = score / maxScore;
    console.log(`✅ MRZ confidence calculated: ${(confidence * 100).toFixed(1)}% (${score}/${maxScore})`);
    return confidence;
  }

  // 🔧 DATE VALIDATION HELPER
  private isValidFormattedDate(dateStr: string): boolean {
    if (!dateStr || dateStr === 'Invalid Date') return false;
    
    try {
      // Check DD/MM/YYYY format
      const parts = dateStr.split('/');
      if (parts.length !== 3) return false;
      
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]);
      const year = parseInt(parts[2]);
      
      if (isNaN(day) || isNaN(month) || isNaN(year)) return false;
      
      const date = new Date(year, month - 1, day);
      return date.getFullYear() === year &&
             date.getMonth() === month - 1 &&
             date.getDate() === day &&
             year >= 1900 && year <= 2100;
    } catch {
      return false;
    }
  }

  // 🔧 PUBLIC METHOD FOR EASY INTEGRATION
  public static parsePassportMRZ(mrzText: string): MRZData | null {
    const scanner = new PassportScannerService();
    return scanner.parseMRZFromText(mrzText);
  }
}