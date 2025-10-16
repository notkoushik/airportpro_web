import { LabelRecognizer } from 'dynamsoft-label-recognizer';
import type { PassportData, MRZData, ScanResult, ScannerConfig } from '../types/passport';

export class PassportScannerService {
  private recognizer: LabelRecognizer | null = null;
  private config: ScannerConfig;
  private isInitializing = false;

  constructor(config: ScannerConfig = {}) {
    this.config = {
      licenseKey: config.licenseKey || import.meta.env.VITE_DYNAMSOFT_LICENSE_KEY || '',
      runtimeSettings: config.runtimeSettings || "video-mrz",
      ...config
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitializing || this.recognizer) return;
    
    this.isInitializing = true;
    try {
      console.log('Initializing Dynamsoft Label Recognizer...');
      
      if (this.config.licenseKey) {
        LabelRecognizer.license = this.config.licenseKey;
      }

      await LabelRecognizer.loadWasm();
      this.recognizer = await LabelRecognizer.createInstance();
      
      console.log('Passport scanner initialized successfully');
    } catch (error) {
      console.error('Failed to initialize passport scanner:', error);
      throw new Error(`Failed to initialize passport scanner: ${error}`);
    } finally {
      this.isInitializing = false;
    }
  }

  async scanPassportMRZ(imageElement: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement): Promise<ScanResult> {
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
    const sortedResults = results.sort((a, b) => a.location.y - b.location.y);
    const line1 = sortedResults[0].text.replace(/\s/g, '');
    const line2 = sortedResults[1].text.replace(/\s/g, '');
    
    console.log('Raw MRZ Line 1:', line1);
    console.log('Raw MRZ Line 2:', line2);

    const surname = this.extractName(line1.substring(5));
    const givenNames = this.extractGivenNames(line1.substring(5));

    const parsed: PassportData = {
      documentType: this.cleanMRZField(line1.substring(0, 2)),
      countryCode: this.cleanMRZField(line1.substring(2, 5)),
      surname: surname,
      givenNames: givenNames || this.extractGivenNames(surname), // Fallback for single name passports
      passportNumber: this.cleanMRZField(line2.substring(0, 9)),
      nationality: this.cleanMRZField(line2.substring(10, 13)),
      dateOfBirth: this.parseDate(line2.substring(13, 19)),
      sex: this.cleanMRZField(line2.substring(20, 21)),
      dateOfExpiry: this.parseDate(line2.substring(21, 27)),
      personalNumber: line2.length > 28 ? this.cleanMRZField(line2.substring(28, 42)) || undefined : undefined
    };

    return {
      line1,
      line2,
      parsed,
      confidence: this.calculateValidationScore(parsed)
    };
  }

  private cleanMRZField(field: string): string {
    return field.replace(/[^A-Z0-9<]/g, '').trim();
  }

  private extractName(nameField: string): string {
    const cleaned = nameField.replace(/<+/g, ' ').trim();
    const parts = cleaned.split(/\s+/);
    return parts[0] || '';
  }

  private extractGivenNames(nameField: string): string {
    const cleaned = nameField.replace(/<+/g, ' ').trim();
    const parts = cleaned.split(/\s+/);
    return parts.slice(1).join(' ').trim();
  }

  private parseDate(dateStr: string): string {
    if (dateStr.length !== 6) return dateStr;
    
    const year = parseInt(dateStr.substring(0, 2));
    const month = dateStr.substring(2, 4);
    const day = dateStr.substring(4, 6);
    const fullYear = year < 30 ? 2000 + year : 1900 + year;
    
    return `${fullYear}-${month}-${day}`;
  }

  private calculateValidationScore(data: PassportData): number {
    let score = 0;
    if (['P', 'V', 'I'].includes(data.documentType)) score += 0.2;
    if (data.countryCode.length === 3) score += 0.2;
    if (data.passportNumber.length > 0) score += 0.2;
    if (this.isValidDate(data.dateOfBirth)) score += 0.2;
    if (this.isValidDate(data.dateOfExpiry)) score += 0.2;
    return score;
  }

  private isValidDate(dateStr: string): boolean {
    const date = new Date(dateStr);
    return date instanceof Date && !isNaN(date.getTime());
  }

  async destroy(): Promise<void> {
    if (this.recognizer) {
      this.recognizer = null;
    }
    this.isInitializing = false;
  }

  isInitialized(): boolean {
    return this.recognizer !== null && !this.isInitializing;
  }
}
