import LabelRecognizer from 'dynamsoft-label-recognizer';

import type { PassportData, MRZData, ScanResult, ScannerConfig } from '../types/passport';
import { PassportScannerService as MRZParserService } from './PassportScannerService'; // Import the new parser

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

  // 🔧 REPLACED: Using the new, more robust PassportScannerService for parsing
  private parseMRZLines(results: any[]): MRZData {
    const sortedResults = results.sort((a, b) => a.location.y - b.location.y);
    const line1 = sortedResults[0].text;
    const line2 = sortedResults[1].text;
    const rawMRZ = `${line1}\n${line2}`;
    
    console.log('📄 Raw OCR result for parsing:', rawMRZ);
    
    // Use the static method from the new service for parsing
    const parsedResult = MRZParserService.parsePassportMRZ(rawMRZ);
    
    if (!parsedResult) {
      console.error('❌ New parser failed to extract data.');
      // Return a default error structure
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