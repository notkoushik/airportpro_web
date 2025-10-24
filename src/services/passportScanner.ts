// ✅ FIXED: Import only the TYPE for TypeScript
import type { LabelRecognizer as LabelRecognizerType } from 'dynamsoft-label-recognizer';
import type { PassportData, MRZData, ScanResult, ScannerConfig } from '../types/passport';
import { PassportScannerService as MRZParserService } from './PassportScannerService';

export class PassportScannerService {
  private recognizer: LabelRecognizerType | null = null;
  private config: ScannerConfig;
  private isInitializing = false;
  
  // Store the class reference
  private LabelRecognizerClass: any = null;

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
      
      // ✅ FIXED: Dynamic import at runtime
      if (!this.LabelRecognizerClass) {
        const DLR = await import('dynamsoft-label-recognizer');
        this.LabelRecognizerClass = DLR.LabelRecognizer || DLR.default;
      }
      
      if (this.config.licenseKey) {
        this.LabelRecognizerClass.license = this.config.licenseKey;
      }
      
      await this.LabelRecognizerClass.loadWasm();
      this.recognizer = await this.LabelRecognizerClass.createInstance();
      
      console.log('Passport scanner initialized successfully');
    } catch (error) {
      console.error('Failed to initialize passport scanner:', error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to initialize passport scanner: ${errorMsg}`);
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
      const errorMsg = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Scanning error: ${errorMsg}`,
        timestamp: new Date()
      };
    }
  }

  private parseMRZLines(results: any[]): MRZData {
    const sortedResults = results.sort((a, b) => a.location.y - b.location.y);
    const line1 = sortedResults.text;
    const line2 = sortedResults.text;
    const rawMRZ = `${line1}\n${line2}`;
    
    console.log('📄 Raw OCR result for parsing:', rawMRZ);
    
    const parsedResult = MRZParserService.parsePassportMRZ(rawMRZ);
    
    if (!parsedResult) {
      console.error('❌ New parser failed to extract data.');
      return { line1: '', line2: '', confidence: 0, parsed: {} as PassportData };
    }
    
    console.log('✅ New parser returned:', parsedResult);
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
