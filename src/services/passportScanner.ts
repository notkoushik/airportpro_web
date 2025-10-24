// src/services/passportScanner.ts
// OCR-based passport scanning using Tesseract.js

import { createWorker, PSM } from 'tesseract.js';
import { PassportScannerService } from './PassportScannerService';
import { ScanResult } from '@/types/passport';

/**
 * Preprocesses image for better MRZ detection
 * Uses Otsu's method for binarization
 */
async function preprocessImageForMRZ(imageData: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }
      
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Convert to grayscale
      for (let i = 0; i < data.length; i += 4) {
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        data[i] = data[i + 1] = data[i + 2] = gray;
      }
      
      // Apply Otsu's thresholding
      const threshold = calculateOtsuThreshold(data);
      
      for (let i = 0; i < data.length; i += 4) {
        const binary = data[i] > threshold ? 255 : 0;
        data[i] = data[i + 1] = data[i + 2] = binary;
      }
      
      ctx.putImageData(imageData, 0, 0);
      
      canvas.toBlob(blob => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob from canvas'));
        }
      }, 'image/png');
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageData;
  });
}

/**
 * Calculates Otsu's threshold for binarization
 */
function calculateOtsuThreshold(data: Uint8ClampedArray): number {
  const histogram = new Array(256).fill(0);
  
  // Build histogram
  for (let i = 0; i < data.length; i += 4) {
    histogram[data[i]]++;
  }
  
  const total = data.length / 4;
  let sum = 0;
  for (let i = 0; i < 256; i++) {
    sum += i * histogram[i];
  }
  
  let sumB = 0;
  let wB = 0;
  let wF = 0;
  let maxVariance = 0;
  let threshold = 0;
  
  for (let i = 0; i < 256; i++) {
    wB += histogram[i];
    if (wB === 0) continue;
    
    wF = total - wB;
    if (wF === 0) break;
    
    sumB += i * histogram[i];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const variance = wB * wF * (mB - mF) * (mB - mF);
    
    if (variance > maxVariance) {
      maxVariance = variance;
      threshold = i;
    }
  }
  
  return threshold;
}

/**
 * Scans passport and extracts MRZ data
 */
export async function scanPassport(
  imageData: string,
  onProgress?: (progress: number, status: string) => void
): Promise<ScanResult> {
  const startTime = Date.now();
  
  try {
    onProgress?.(10, 'Preprocessing image...');
    
    // Preprocess image
    const processedBlob = await preprocessImageForMRZ(imageData);
    
    onProgress?.(30, 'Initializing OCR engine...');
    
    // Create Tesseract worker
    const worker = await createWorker('eng', 1, {
      logger: m => {
        if (m.status === 'recognizing text') {
          const progress = 30 + (m.progress * 50);
          onProgress?.(progress, 'Recognizing text...');
        }
      }
    });
    
    // Configure for MRZ recognition
    await worker.setParameters({
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<',
      tessedit_pageseg_mode: PSM.SINGLE_BLOCK,
    });
    
    onProgress?.(80, 'Extracting MRZ data...');
    
    // Perform OCR
    const { data: { text, confidence } } = await worker.recognize(processedBlob);
    
    await worker.terminate();
    
    onProgress?.(90, 'Parsing MRZ...');
    
    // Preprocess and parse MRZ
    const cleanedText = PassportScannerService.preprocessMRZText(text);
    const parseResult = PassportScannerService.parseMRZ(cleanedText);
    
    const processingTime = Date.now() - startTime;
    
    if (parseResult.success && parseResult.data) {
      onProgress?.(100, 'Complete!');
      
      return {
        success: true,
        data: {
          ...parseResult.data,
          confidence: confidence / 100
        },
        image: imageData,
        processingTime
      };
    } else {
      return {
        success: false,
        error: parseResult.error || 'Failed to parse MRZ data',
        image: imageData,
        processingTime
      };
    }
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    return {
      success: false,
      error: `Scanning failed: ${error}`,
      processingTime
    };
  }
}

/**
 * Captures image from camera/file input
 */
export function capturePassportImage(): Promise<string> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment'; // Use rear camera on mobile
    
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) {
        reject(new Error('No file selected'));
        return;
      }
      
      const reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result as string);
      };
      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };
      reader.readAsDataURL(file);
    };
    
    input.click();
  });
}
