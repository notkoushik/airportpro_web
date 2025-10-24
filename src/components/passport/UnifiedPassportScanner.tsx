import React, { useState } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  User, FileText, Globe, Calendar, CreditCard, CheckCircle,
  Camera as CameraIcon, AlertTriangle, XCircle, Eye, RotateCcw,
  Lightbulb, ShieldCheck, AlertCircle, Home
} from "lucide-react";
import Tesseract from 'tesseract.js';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================
export interface PassportData {
  documentType?: string;
  countryCode?: string;
  surname: string;
  givenNames: string;
  documentNumber: string;
  dateOfBirth: string;
  expiryDate: string;
  personalNumber?: string;
  nationality: string;
  sex?: string;
  rawMRZ?: string;
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

// =============================================================================
// HELPER: Detect Capacitor Environment
// =============================================================================
const isCapacitor = (): boolean => {
  return !!(window as any).Capacitor;
};

// =============================================================================
// MRZ CHECKSUM VALIDATION
// =============================================================================
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

// =============================================================================
// OCR ERROR CORRECTION
// =============================================================================
const correctOCRErrors = (text: string, context: 'numbers' | 'letters' | 'mixed'): string => {
  let corrected = text;
  if (context === 'numbers') {
    corrected = corrected
      .replace(/O/g, '0').replace(/o/g, '0')
      .replace(/I/g, '1').replace(/l/g, '1')
      .replace(/Z/g, '2')
      .replace(/S/g, '5')
      .replace(/B/g, '8');
  } else if (context === 'letters') {
    corrected = corrected
      .replace(/0/g, 'O')
      .replace(/1/g, 'I')
      .replace(/5/g, 'S')
      .replace(/8/g, 'B');
  }
  return corrected.toUpperCase();
};

// =============================================================================
// ENHANCED IMAGE PREPROCESSING WITH OTSU'S METHOD
// =============================================================================
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
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
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

  const roiHeight = Math.floor(canvas.height * 0.40);
  const roiY = canvas.height - roiHeight;

  setPreprocessingStage?.('Extracting MRZ region...');
  const imageData = ctx.getImageData(0, roiY, canvas.width, roiHeight);
  const data = imageData.data;

  setPreprocessingStage?.('Converting to grayscale...');
  const grayValues: number[] = [];
  for (let i = 0; i < data.length; i += 4) {
    const gray = Math.floor(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
    data[i] = data[i + 1] = data[i + 2] = gray;
    grayValues.push(gray);
  }

  setPreprocessingStage?.('Calculating optimal threshold...');
  const histogram = new Array(256).fill(0);
  grayValues.forEach(val => histogram[val]++);
  
  const total = grayValues.length;
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * histogram[i];
  
  let sumB = 0, wB = 0, wF = 0, maxVariance = 0, threshold = 0;
  
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

// =============================================================================
// FIXED MRZ EXTRACTION
// =============================================================================
const extractMRZLines = (text: string): string[] => {
  console.log('📝 Raw OCR text length:', text.length);
  
  const lines = text.split('\n');
  const mrzCandidates: Array<{ line: string; score: number; index: number }> = [];

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    let cleanLine = line.trim().toUpperCase().replace(/\s+/g, '');
    
    if (cleanLine.length < 42 || cleanLine.length > 46) continue;
    
    if (cleanLine.length < 44) {
      cleanLine = cleanLine.padEnd(44, '<');
    } else if (cleanLine.length > 44) {
      cleanLine = cleanLine.substring(0, 44);
    }
    
    cleanLine = cleanLine.replace(/[^A-Z0-9<]/g, '<');

    let score = 0;
    
    if (cleanLine.length === 44) score += 30;
    if (cleanLine.startsWith('P<')) score += 50;
    
    const digitCount = (cleanLine.match(/\d/g) || []).length;
    if (digitCount <= 3 && cleanLine.includes('<<')) score += 20;
    if (digitCount >= 14) score += 30;
    if (!cleanLine.startsWith('P<') && digitCount >= 14) score += 20;
    if (cleanLine.includes('<')) score += 10;
    if (/^[A-Z0-9<]{44}$/.test(cleanLine)) score += 15;

    if (score >= 40) {
      mrzCandidates.push({ line: cleanLine, score, index });
      console.log(`✅ MRZ candidate [${index}]: score=${score}, line="${cleanLine.substring(0, 20)}..."`);
    }
  }

  mrzCandidates.sort((a, b) => b.score - a.score);
  const topCandidates = mrzCandidates.slice(0, 3);
  
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
  }
  
  return result;
};

// =============================================================================
// ENHANCED MRZ PARSING
// =============================================================================
const parseEnhancedMRZ = (mrzLines: string[]): PassportData | null => {
  try {
    console.log('📝 Parsing MRZ lines:', mrzLines);
    if (mrzLines.length < 2) {
      console.error('❌ Invalid MRZ: need at least 2 lines');
      return null;
    }

    // ✅ CRITICAL FIX: Access array elements with [0] and [1]
    let line1 = mrzLines[0].padEnd(44, '<');
    let line2 = mrzLines[1].padEnd(44, '<');
    
    const documentType = line1.charAt(0) || 'P';
    const countryCode = line1.substring(2, 5);
    
    const nameParts = line1.substring(5).split('<<');
    const surname = (nameParts[0] || '').replace(/<+$/g, '').replace(/<+/g, ' ').trim() || 'UNKNOWN';
    const givenNames = (nameParts[1] || '').replace(/<+$/g, '').replace(/<+/g, ' ').trim() || 'UNKNOWN';
    
    const documentNumber = correctOCRErrors(line2.substring(0, 9).replace(/<+$/g, ''), 'mixed');
    const docNumCheck = line2.charAt(9);
    const nationality = line2.substring(10, 13);
    const birthDate = correctOCRErrors(line2.substring(13, 19), 'numbers');
    const birthDateCheck = line2.charAt(19);
    const gender = line2.charAt(20) || 'U';
    const expiryDate = correctOCRErrors(line2.substring(21, 27), 'numbers');
    const expiryDateCheck = line2.charAt(27);
    const personalNumber = line2.substring(28, 42).replace(/<+$/g, '');
    const personalNumCheck = line2.charAt(42);
    const compositeCheck = line2.charAt(43);

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
      expiryDate: formattedExpiryDate,
      personalNumber: personalNumber || '',
      nationality: nationalityName,
      sex: gender,
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
    'IND': 'India', 'USA': 'United States', 'GBR': 'United Kingdom',
    'CAN': 'Canada', 'AUS': 'Australia', 'DEU': 'Germany', 'FRA': 'France',
    'CHN': 'China', 'JPN': 'Japan', 'KOR': 'South Korea', 'SGP': 'Singapore',
    'ARE': 'United Arab Emirates', 'SAU': 'Saudi Arabia', 'NPL': 'Nepal',
    'BGD': 'Bangladesh', 'PAK': 'Pakistan', 'LKA': 'Sri Lanka',
    'ZAF': 'South Africa', 'NGA': 'Nigeria', 'KEN': 'Kenya', 'UNK': 'Unknown'
  };
  return countries[code] || code;
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================
const UnifiedPassportScanner: React.FC<UnifiedPassportScannerProps> = ({ 
  onScanSuccess, 
  onScanFailure 
}) => {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState('');
  const [preprocessingStage, setPreprocessingStage] = useState('');

  // ✅ Reset function to clear state
  const handleReset = () => {
    setResult(null);
    setError('');
    setPreprocessingStage('');
  };

  const handleScan = async () => {
    // ✅ CRITICAL FIX: Reset state at the START of scan
    setResult(null);
    setError('');
    
    setScanning(true);
    setPreprocessingStage('Starting scan...');
    
    try {
      const image = await Camera.getPhoto({
        quality: 100,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera
      });
      
      if (!image.dataUrl) {
        throw new Error('No image data received');
      }
      
      setPreprocessingStage('Preprocessing image...');
      const processedImage = await preprocessImage(image.dataUrl, setPreprocessingStage);
      
      setPreprocessingStage('Performing OCR...');
      const { data: { text } } = await Tesseract.recognize(processedImage, 'eng', {
        logger: info => console.log(info)
      });

      console.log('✅ OCR completed');
      
      setPreprocessingStage('Extracting MRZ...');
      const mrzLines = extractMRZLines(text);
      
      if (mrzLines.length < 2) {
        throw new Error('Could not find valid MRZ lines');
      }
      
      setPreprocessingStage('Parsing data...');
      const passportData = parseEnhancedMRZ(mrzLines);
      
      if (!passportData) {
        throw new Error('Failed to parse MRZ data');
      }
      
      const scanResult: ScanResult = {
        success: true,
        data: passportData,
        confidence: 0.95,
        timestamp: Date.now(),
        imageData: image.dataUrl,
        ocrMethod: 'Tesseract.js'
      };
      
      setResult(scanResult);
      onScanSuccess?.(scanResult);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      const failureResult: ScanResult = {
        success: false,
        data: {
          surname: '',
          givenNames: '',
          documentNumber: '',
          dateOfBirth: '',
          expiryDate: '',
          nationality: ''
        },
        confidence: 0,
        timestamp: Date.now(),
        ocrMethod: 'Tesseract.js'
      };
      onScanFailure?.(failureResult);
    } finally {
      setScanning(false);
      setPreprocessingStage('');
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Passport Scanner</CardTitle>
        <CardDescription>
          Scan your passport to extract information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!result && (
          <>
            <Button 
              onClick={handleScan} 
              disabled={scanning}
              className="w-full"
              size="lg"
            >
              {scanning ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-foreground"></div>
                  Scanning...
                </>
              ) : (
                <>
                  <CameraIcon className="mr-2 h-4 w-4" /> Scan Passport
                </>
              )}
            </Button>
            
            {preprocessingStage && (
              <div className="mt-2 text-sm text-muted-foreground text-center">
                {preprocessingStage}
              </div>
            )}
            
            {error && (
              <>
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {error}
                  </AlertDescription>
                </Alert>
                
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start">
                    <Lightbulb className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-semibold mb-1">Tips for better scanning:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Ensure good, even lighting</li>
                        <li>Hold passport flat and steady</li>
                        <li>Align the MRZ (bottom 2 lines) in frame</li>
                        <li>Avoid glare and shadows</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}
        
        {result && result.success && (
          <>
            <Alert className="border-green-500 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Passport scanned successfully!
              </AlertDescription>
            </Alert>
            
            <div className="space-y-4 p-4 bg-white rounded-lg border">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Name:</span>
                <span>{result.data.givenNames} {result.data.surname}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="font-semibold">Document:</span>
                <span>{result.data.documentNumber}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="font-semibold">Nationality:</span>
                <span>{result.data.nationality}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="font-semibold">Date of Birth:</span>
                <span>{result.data.dateOfBirth}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="font-semibold">Expiry:</span>
                <span>{result.data.expiryDate}</span>
              </div>
              
              {/* ✅ Navigation buttons */}
              <div className="flex gap-2 mt-4">
                <Button 
                  onClick={() => window.location.href = '/'}
                  className="flex-1"
                  variant="default"
                >
                  <Home className="mr-2 h-4 w-4" /> Go Home
                </Button>
                
                <Button 
                  onClick={handleReset}
                  className="flex-1"
                  variant="outline"
                >
                  <RotateCcw className="mr-2 h-4 w-4" /> Scan Another
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

// =============================================================================
// CRITICAL: DEFAULT EXPORT FOR LAZY LOADING
// =============================================================================
export default UnifiedPassportScanner;
