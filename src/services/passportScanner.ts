// src/services/passportScanner.ts
// Change your import to this (CORRECT)
import LabelRecognizer from 'dynamsoft-label-recognizer';
export class PassportScannerService {
  private recognizer: LabelRecognizer | null = null;

  async initialize(): Promise<void> {
    try {
      // Initialize Dynamsoft Label Recognizer
      this.recognizer = await LabelRecognizer.createInstance({
        runtimeSettings: "passportMRZ"
      });
    } catch (error) {
      throw new Error(`Failed to initialize passport scanner: ${error}`);
    }
  }

  async scanPassportMRZ(imageElement: HTMLImageElement): Promise<ScanResult> {
    if (!this.recognizer) {
      throw new Error('Scanner not initialized');
    }

    try {
      const results = await this.recognizer.recognize(imageElement);
      
      if (results.length >= 2) {
        const mrzData = this.parseMRZLines(results);
        return {
          success: true,
          data: mrzData,
          timestamp: new Date()
        };
      }
      
      return {
        success: false,
        error: 'Could not detect valid MRZ data',
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        error: `Scanning error: ${error}`,
        timestamp: new Date()
      };
    }
  }

  private parseMRZLines(results: any[]): MRZData {
    const line1 = results[0].text;
    const line2 = results[1].text;
    
    // Parse according to ICAO Doc 9303 standard
    const parsed: PassportData = {
      documentType: line1.substring(0, 2),
      countryCode: line1.substring(2, 5),
      surname: this.extractName(line1.substring(5)),
      givenNames: this.extractGivenNames(line1.substring(5)),
      passportNumber: line2.substring(0, 9),
      nationality: line2.substring(10, 13),
      dateOfBirth: this.parseDate(line2.substring(13, 19)),
      sex: line2.substring(20, 21),
      dateOfExpiry: this.parseDate(line2.substring(21, 27)),
      personalNumber: line2.substring(28, 42).replace(/</g, '') || undefined
    };

    return {
      line1,
      line2,
      parsed,
      confidence: 0.95 // Calculate actual confidence based on results
    };
  }

  private extractName(nameField: string): string {
    return nameField.split('<<')[0].replace(/</g, ' ').trim();
  }

  private extractGivenNames(nameField: string): string {
    const parts = nameField.split('<<');
    return parts.length > 1 ? parts[1].replace(/</g, ' ').trim() : '';
  }

  private parseDate(dateStr: string): string {
    if (dateStr.length !== 6) return dateStr;
    const year = parseInt(dateStr.substring(0, 2));
    const month = dateStr.substring(2, 4);
    const day = dateStr.substring(4, 6);
    const fullYear = year < 50 ? 2000 + year : 1900 + year;
    return `${fullYear}-${month}-${day}`;
  }
}
