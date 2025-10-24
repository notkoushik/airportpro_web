// ⚠️ DYNAMSOFT TEMPORARILY DISABLED - Using stub implementation
// import type { LabelRecognizer as LabelRecognizerType } from 'dynamsoft-label-recognizer';
import type { PassportData, MRZData, ScanResult, ScannerConfig } from '../types/passport';
import { PassportScannerService as MRZParserService } from './PassportScannerService';

export class PassportScannerService {
  private recognizer: any | null = null;
  private config: ScannerConfig;
  private isInitializing = false;

  constructor(config: ScannerConfig = {}) {
    this.config = {
      licenseKey: config.licenseKey || import.meta.env.VITE_DYNAMSOFT_LICENSE_KEY || '',
      runtimeSettings: config.runtimeSettings || "video-mrz",
      ...config
    };
    console.warn('⚠️ PassportScannerService: Dynamsoft integration disabled');
  }

  async initialize(): Promise<void> {
    if (this.isInitializing || this.recognizer) return;
    
    this.isInitializing = true;
    try {
      console.log('⚠️ PassportScannerService: Using stub mode (Dynamsoft disabled)');
      
      // Create a stub recognizer that always throws
      this.recognizer = {
        recognize: async () => {
          throw new Error('Dynamsoft not available. Use UnifiedPassportScanner with Tesseract.js instead.');
        }
      };
      
      console.log('Passport scanner initialized (stub mode)');
    } catch (error) {
      console.error('Failed to initialize passport scanner:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to initialize passport scanner: ${errorMsg}`);
    } finally {
      this.isInitializing = false;
    }
  }

  async scanPassportMRZ(imageElement: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement): Promise<ScanResult> {
    console.warn('⚠️ Dynamsoft scanning not available. Use UnifiedPassportScanner instead.');
    
    return {
      success: false,
      error: 'Dynamsoft scanning disabled. Use UnifiedPassportScanner (Tesseract.js) for MRZ scanning.',
      timestamp: new Date()
    };
  }

  private parseMRZLines(results: any[]): MRZData {
    const sortedResults = results.sort((a, b) => a.location.y - b.location.y);
    const line1 = sortedResults[0].text;
    const line2 = sortedResults[1].text;

    const rawMRZ = `${line1}\n${line2}`;
    
    console.log('📄 Raw OCR result for parsing:', rawMRZ);
    
    const parsedResult = MRZParserService.parsePassportMRZ(rawMRZ);
    
    if (!parsedResult) {
      console.error('❌ Parser failed to extract data.');
      return { line1: '', line2: '', confidence: 0, parsed: {} as PassportData };
    }
    
    console.log('✅ Parser returned:', parsedResult);
    return parsedResult;
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
