import React, { useState, useRef } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  User, FileText, Globe, Calendar, CreditCard, CheckCircle,
  Camera as CameraIcon, AlertTriangle, XCircle, Eye, RotateCcw,
  Lightbulb, ShieldCheck, AlertCircle
} from "lucide-react";
import Tesseract from 'tesseract.js';

// =====================================================
// TYPE DEFINITIONS
// =====================================================
export interface PassportData {
  documentType: string;
  countryCode: string;
  surname: string;
  givenNames: string;
  documentNumber: string;
  dateOfBirth: string;
  expirationDate: string;
  personalNumber: string;
  nationality: string;
  gender?: string;
  rawMRZ: string;
  checksumValid?: {
    documentNumber: boolean;
    dateOfBirth: boolean;
    expirationDate: boolean;
    composite: boolean;
  };
}

export interface ScanResult {
  success: boolean;
  data: PassportData;
  confidence: number;
  timestamp: number;
  imageData?: string;
  ocrMethod: string;
  performanceMetrics?: {
    capture: number;
    preprocessing: number;
    ocr: number;
    parsing: number;
    total: number;
  };
}

interface UnifiedPassportScannerProps {
  onScanSuccess?: (result: ScanResult) => void;
  onScanFailure?: (result: ScanResult) => void;
}

// =====================================================
// HELPER: Detect Capacitor Environment
// =====================================================
const isCapacitor = (): boolean => {
  return !!(window as any).Capacitor;
};

// =====================================================
// MRZ CHECKSUM VALIDATION
// =====================================================
const calculateCheckDigit = (data: string): number => {
  const weights = [7, 3, 1];
  let sum = 0;

  for (let i = 0; i < data.length; i++) {
    const char = data[i];
    let value: number;

    if (char >= '0' && char <= '9') {
      value = parseInt(char);
    } else if (char >= 'A' && char <= 'Z') {
      value = char.charCodeAt(0) - 'A'.charCodeAt(0) + 10;
    } else if (char === '<') {
      value = 0;
    } else {
      value = 0;
    }

    sum += value * weights[i % 3];
  }

  return sum % 10;
};

const validateCheckDigit = (data: string, checkDigit: string): boolean => {
  if (!checkDigit || checkDigit === '<') return false;
  const expected = calculateCheckDigit(data);
  const actual = parseInt(checkDigit);
  return expected === actual;
};

// =====================================================
// OCR ERROR CORRECTION
// =====================================================
const correctOCRErrors = (text: string, context: 'numbers' | 'letters' | 'mixed'): string => {
  let corrected = text;

  if (context === 'numbers') {
    // Correct common OCR errors in number fields
    corrected = corrected
      .replace(/O/g, '0')  // O → 0
      .replace(/o/g, '0')
      .replace(/I/g, '1')  // I → 1
      .replace(/l/g, '1')
      .replace(/Z/g, '2')  // Z → 2
      .replace(/S/g, '5')  // S → 5
      .replace(/B/g, '8'); // B → 8
  } else if (context === 'letters') {
    // Correct common OCR errors in letter fields
    corrected = corrected
      .replace(/0/g, 'O')  // 0 → O
      .replace(/1/g, 'I')  // 1 → I
      .replace(/5/g, 'S')  // 5 → S
      .replace(/8/g, 'B'); // 8 → B
  }

  return corrected.toUpperCase();
};

// =====================================================
// ENHANCED IMAGE PREPROCESSING WITH OTSU'S METHOD
// =====================================================
const preprocessImage = async (
  imageDataUrl: string,
  setPreprocessingStage?: (stage: string) => void
): Promise<string> => {
  const perfStart = performance.now();
  
  const img = new Image();
  img.src = imageDataUrl;

  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
  });

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { 
    willReadFrequently: true
  });
  if (!ctx) throw new Error('Could not get canvas context');

  const isMobile = isCapacitor() || /Android|iPhone/i.test(navigator.userAgent);
  const MAX_WIDTH = isMobile ? 1400 : 1800;
  let scale = 1;
  if (img.width > MAX_WIDTH) {
    scale = MAX_WIDTH / img.width;
  }
  canvas.width = img.width * scale;
  canvas.height = img.height * scale;

  setPreprocessingStage?.('Scaling image...');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  // INCREASED: Focus on MRZ region (bottom 40%)
  const roiHeight = Math.floor(canvas.height * 0.40);
  const roiY = canvas.height - roiHeight;

  setPreprocessingStage?.('Extracting MRZ region...');
  const imageData = ctx.getImageData(0, roiY, canvas.width, roiHeight);
  const data = imageData.data;

  setPreprocessingStage?.('Converting to grayscale...');
  
  // First pass: Grayscale conversion
  const grayValues: number[] = [];
  for (let i = 0; i < data.length; i += 4) {
    const gray = Math.floor(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
    data[i] = data[i + 1] = data[i + 2] = gray;
    grayValues.push(gray);
  }

  // Calculate Otsu's threshold
  setPreprocessingStage?.('Calculating optimal threshold...');
  const histogram = new Array(256).fill(0);
  grayValues.forEach(val => histogram[val]++);
  
  const total = grayValues.length;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * histogram[i];
  
  let sumB = 0;
  let wB = 0;
  let wF = 0;
  let maxVariance = 0;
  let threshold = 0;
  
  for (let t = 0; t < 256; t++) {
    wB += histogram[t];
    if (wB === 0) continue;
    
    wF = total - wB;
    if (wF === 0) break;
    
    sumB += t * histogram[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const variance = wB * wF * (mB - mF) * (mB - mF);
    
    if (variance > maxVariance) {
      maxVariance = variance;
      threshold = t;
    }
  }

  console.log(`📊 Otsu's threshold: ${threshold}`);

  setPreprocessingStage?.('Applying enhancements...');
  
  // Apply contrast enhancement and threshold
  const contrastFactor = 1.8;
  const intercept = 128 * (1 - contrastFactor);

  for (let i = 0; i < data.length; i += 4) {
    let value = data[i] * contrastFactor + intercept;
    value = Math.max(0, Math.min(255, value));
    value = value > threshold ? 255 : 0;
    data[i] = data[i + 1] = data[i + 2] = value;
  }

  const roiCanvas = document.createElement('canvas');
  roiCanvas.width = canvas.width;
  roiCanvas.height = roiHeight;
  const roiCtx = roiCanvas.getContext('2d');
  if (!roiCtx) throw new Error('Could not get ROI context');
  
  roiCtx.putImageData(imageData, 0, 0);

  const processingTime = performance.now() - perfStart;
  console.log(`🖼️ Enhanced preprocessing: ${processingTime.toFixed(0)}ms`);
  setPreprocessingStage?.('Preprocessing complete');
  
  return roiCanvas.toDataURL('image/png');
};

// =====================================================
// FIXED MRZ EXTRACTION
// =====================================================
const extractMRZLines = (text: string): string[] => {
  console.log('📝 Raw OCR text length:', text.length);
  
  const lines = text.split('\n');
  const mrzCandidates: Array<{ line: string; score: number; index: number }> = [];

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    let cleanLine = line.trim().toUpperCase();
    
    // Basic cleanup
    cleanLine = cleanLine.replace(/\s+/g, '');
    
    // CRITICAL: Must be exactly or close to 44 characters
    if (cleanLine.length < 42 || cleanLine.length > 46) continue;
    
    // Normalize to 44 characters
    if (cleanLine.length < 44) {
      cleanLine = cleanLine.padEnd(44, '<');
    } else if (cleanLine.length > 44) {
      cleanLine = cleanLine.substring(0, 44);
    }
    
    // Replace non-MRZ characters with <
    cleanLine = cleanLine.replace(/[^A-Z0-9<]/g, '<');

    let score = 0;
    
    // Length scoring (critical)
    if (cleanLine.length === 44) score += 30;
    
    // Line 1 indicators (name line)
    if (cleanLine.startsWith('P<')) score += 50; // Strong indicator
    const digitCount = (cleanLine.match(/\d/g) || []).length;
    if (digitCount <= 3 && cleanLine.includes('<<')) score += 20; // Name line has few digits
    
    // Line 2 indicators (data line)
    if (digitCount >= 14) score += 30; // Data line has many digits
    if (!cleanLine.startsWith('P<') && digitCount >= 14) score += 20;
    
    // Must have angle brackets
    if (cleanLine.includes('<')) score += 10;
    
    // Valid MRZ structure
    if (/^[A-Z0-9<]{44}$/.test(cleanLine)) score += 15;

    if (score >= 40) {
      mrzCandidates.push({ line: cleanLine, score, index });
      console.log(`✅ MRZ candidate [${index}]: score=${score}, line="${cleanLine.substring(0, 20)}..."`);
    }
  }

  // Sort by score (best first)
  mrzCandidates.sort((a, b) => b.score - a.score);
  
  // Take top 3 candidates
  const topCandidates = mrzCandidates.slice(0, 3);
  
  // Identify line1 (P<...) and line2 (digits)
  const line1Candidate = topCandidates.find(c => c.line.startsWith('P<'));
  const line2Candidate = topCandidates.find(c => {
    const digits = (c.line.match(/\d/g) || []).length;
    return !c.line.startsWith('P<') && digits >= 14;
  });
  
  const result: string[] = [];
  if (line1Candidate) {
    result.push(line1Candidate.line);
    console.log('✅ Line 1 (Names):', line1Candidate.line);
  }
  if (line2Candidate) {
    result.push(line2Candidate.line);
    console.log('✅ Line 2 (Data):', line2Candidate.line);
  }
  
  if (result.length < 2) {
    console.error('❌ Could not find 2 valid MRZ lines');
    console.log('Candidates found:', topCandidates.map(c => ({ 
      score: c.score, 
      line: c.line.substring(0, 30) 
    })));
  }
  
  return result;
};

// =====================================================
// ENHANCED MRZ PARSING
// =====================================================
const parseEnhancedMRZ = (mrzLines: string[]): PassportData | null => {
  try {
    console.log('📝 Parsing MRZ lines:', mrzLines);

    if (mrzLines.length < 2) {
      console.error('❌ Invalid MRZ: need at least 2 lines');
      return null;
    }

    let line1 = mrzLines[0].padEnd(44, '<');
    let line2 = mrzLines[1].padEnd(44, '<');

    // Parse first line - P<COUNTRY<SURNAME<<GIVENNAMES
    const documentType = line1.charAt(0) || 'P';
    const countryCode = line1.substring(2, 5);

    // Extract names
    const nameParts = line1.substring(5).split('<<');
    const surname = (nameParts[0] || '')
      .replace(/<+$/g, '')
      .replace(/</g, ' ')
      .trim() || 'UNKNOWN';
    const givenNames = (nameParts[1] || '')
      .replace(/<+$/g, '')
      .replace(/</g, ' ')
      .trim() || 'UNKNOWN';

    // Parse second line with OCR correction for specific fields
    const documentNumber = correctOCRErrors(
      line2.substring(0, 9).replace(/<+$/g, ''),
      'mixed'
    );
    const docNumCheck = line2.charAt(9);
    
    const nationality = line2.substring(10, 13);
    
    // Dates should be numbers only
    const birthDate = correctOCRErrors(line2.substring(13, 19), 'numbers');
    const birthDateCheck = line2.charAt(19);
    
    const gender = line2.charAt(20) || 'U';
    
    const expiryDate = correctOCRErrors(line2.substring(21, 27), 'numbers');
    const expiryDateCheck = line2.charAt(27);
    
    const personalNumber = line2.substring(28, 42).replace(/<+$/g, '');
    const personalNumCheck = line2.charAt(42);
    const compositeCheck = line2.charAt(43);

    // Validate checksums
    const checksumValid = {
      documentNumber: validateCheckDigit(documentNumber, docNumCheck),
      dateOfBirth: validateCheckDigit(birthDate, birthDateCheck),
      expirationDate: validateCheckDigit(expiryDate, expiryDateCheck),
      composite: false
    };

    const compositeData = documentNumber + docNumCheck + birthDate + birthDateCheck + 
                         expiryDate + expiryDateCheck + personalNumber + personalNumCheck;
    checksumValid.composite = validateCheckDigit(compositeData, compositeCheck);

    console.log('✅ Checksum validation:', checksumValid);

    const formattedBirthDate = formatMRZDateEnhanced(birthDate);
    const formattedExpiryDate = formatMRZDateEnhanced(expiryDate);
    const nationalityName = getEnhancedCountryName(nationality);

    const passportData: PassportData = {
      documentType,
      countryCode,
      surname,
      givenNames,
      documentNumber: documentNumber || 'UNKNOWN',
      dateOfBirth: formattedBirthDate,
      expirationDate: formattedExpiryDate,
      personalNumber: personalNumber || '',
      nationality: nationalityName,
      gender,
      rawMRZ: mrzLines.join('\n'),
      checksumValid
    };

    console.log('✅ Enhanced parsing result:', passportData);
    return passportData;

  } catch (error) {
    console.error('❌ Error in enhanced MRZ parsing:', error);
    return null;
  }
};

const formatMRZDateEnhanced = (mrzDate: string): string => {
  if (!mrzDate || mrzDate.length !== 6) return 'Invalid Date';

  try {
    const year = mrzDate.substring(0, 2);
    const month = mrzDate.substring(2, 4);
    const day = mrzDate.substring(4, 6);

    const yearNum = parseInt(year);
    const monthNum = parseInt(month);
    const dayNum = parseInt(day);

    if (isNaN(yearNum) || isNaN(monthNum) || isNaN(dayNum)) {
      return 'Invalid Date';
    }

    if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) {
      return 'Invalid Date';
    }

    const fullYear = yearNum <= 30 ? 2000 + yearNum : 1900 + yearNum;

    return `${String(dayNum).padStart(2, '0')}/${String(monthNum).padStart(2, '0')}/${fullYear}`;
  } catch (error) {
    console.error('Date formatting error:', error);
    return 'Invalid Date';
  }
};

const getEnhancedCountryName = (code: string): string => {
  const countries: { [key: string]: string } = {
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
    'NPL': 'Nepal',
    'BGD': 'Bangladesh',
    'PAK': 'Pakistan',
    'LKA': 'Sri Lanka',
    'ZAF': 'South Africa',
    'NGA': 'Nigeria',
    'KEN': 'Kenya',
    'UNK': 'Unknown'
  };
  return countries[code] || code;
};
