// src/plugins/web.ts
import { WebPlugin } from '@capacitor/core';
import type { PassportScannerPlugin, PassportScanResult } from './PassportScanner';
import Tesseract from 'tesseract.js';
import { parse } from 'mrz';

export class PassportScannerWeb extends WebPlugin implements PassportScannerPlugin {
  async scanPassport(): Promise<PassportScanResult> {
    // Web implementation using file input
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      
      input.onchange = async (e: Event) => {
        const target = e.target as HTMLInputElement;
        const file = target.files?.[0];
        
        if (!file) {
          resolve({
            success: false,
            error: 'No file selected'
          });
          return;
        }
        
        const result = await this.processImageFile(file);
        resolve(result);
      };
      
      input.click();
    });
  }

  async scanFromImage(options: { imagePath: string }): Promise<PassportScanResult> {
    try {
      const response = await fetch(options.imagePath);
      const blob = await response.blob();
      return await this.processImageFile(blob);
    } catch (error) {
      return {
        success: false,
        error: `Failed to load image: ${error}`
      };
    }
  }

  async checkModelsReady(): Promise<{ ready: boolean }> {
    return { ready: true };
  }

  private async processImageFile(file: Blob): Promise<PassportScanResult> {
    try {
      const { data: { text } } = await Tesseract.recognize(file, 'eng', {
        logger: info => console.log(info)
      });
      
      // Extract MRZ lines
      const lines = text.split('\n')
        .map(line => line.trim().toUpperCase().replace(/\s/g, ''))
        .filter(line => line.length >= 40 && /^[A-Z0-9<]+$/.test(line));
      
      if (lines.length < 2) {
        return {
          success: false,
          error: 'Could not detect MRZ. Please ensure passport is clearly visible.'
        };
      }
      
      // Parse MRZ using mrz library
      const mrzString = lines.slice(0, 2).join('\n');
      const parsed = parse(mrzString);
      
      if (!parsed.valid) {
        return {
          success: false,
          error: 'Invalid MRZ format detected'
        };
      }
      
      return {
        success: true,
        data: {
          documentNumber: parsed.fields.documentNumber || '',
          surname: parsed.fields.lastName || '',
          givenNames: parsed.fields.firstName || '',
          nationality: parsed.fields.nationality || '',
          dateOfBirth: this.formatDate(parsed.fields.birthDate || ''),
          sex: parsed.fields.sex || '',
          expiryDate: this.formatDate(parsed.fields.expirationDate || ''),
          personalNumber: parsed.fields.personalNumber || '',
          issuingState: parsed.fields.issuingState || '',
          raw: {
            line1: lines[0],
            line2: lines[1]
          }
        },
        confidence: 0.9
      };
      
    } catch (error) {
      return {
        success: false,
        error: `OCR processing failed: ${error}`
      };
    }
  }

  private formatDate(date: string): string {
    if (!date || date.length !== 6) return date;
    const yy = parseInt(date.substring(0, 2));
    const mm = date.substring(2, 4);
    const dd = date.substring(4, 6);
    const yyyy = yy >= 50 ? 1900 + yy : 2000 + yy;
    return `${yyyy}-${mm}-${dd}`;
  }
}
