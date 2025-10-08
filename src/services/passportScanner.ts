// src/services/passportScanner.ts
import { LabelRecognizer } from 'dynamsoft-label-recognizer'; // CORRECTED: Named import
import type { PassportData, MRZData, ScanResult, ScannerConfig } from '../types/passport';

export class PassportScannerService {
  private recognizer: LabelRecognizer | null = null;
  private config: ScannerConfig;

  constructor(config: ScannerConfig = {}) {
    this.config = {
      licenseKey: config.licenseKey || import.meta.env.VITE_DYNAMSOFT_LICENSE_KEY || 'DLS2eyJvcmdhbml6YXRpb25JRCI6IjIwMDAwMSIsInByb2R1Y3RzIjpbeyJwcm9kdWN0SWQiOiI1In0seyJwcm9kdWN0SWQiOiI0In1dLCJjaGVja0NvZGUiOiI3NzU4NzMwOTQifQ==', // Demo license
      runtimeSettings: config.runtimeSettings || "video-mrz",
      ...config
    };
  }

  async initialize(): Promise<void> {
    try {
      // Set license key if available
      if (this.config.licenseKey) {
        LabelRecognizer.license = this.config.licenseKey;
      }

      // Initialize Dynamsoft Label Recognizer
      this.recognizer = await LabelRecognizer.createInstance();
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
      confidence: 0.95
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

  destroy(): void {
    if (this.recognizer) {
      this.recognizer = null;
    }
  }
}
