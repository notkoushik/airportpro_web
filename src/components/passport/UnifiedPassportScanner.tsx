import React, { useState, useRef, useEffect } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  User,
  FileText,
  Globe,
  Calendar,
  CreditCard,
  CheckCircle,
  Camera as CameraIcon,
  AlertTriangle,
  XCircle,
  Eye,
  RotateCcw,
  Lightbulb,
  ShieldCheck,
  AlertCircle
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
}

interface UnifiedPassportScannerProps {
  onScanSuccess?: (result: ScanResult) => void;
  onScanFailure?: (result: ScanResult) => void;
}

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
// ADVANCED IMAGE PREPROCESSING
// =====================================================
const preprocessImage = async (
  imageDataUrl: string,
  setPreprocessingStage?: (stage: string) => void
): Promise<string> => {
  const img = new Image();
  img.src = imageDataUrl;

  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
  });

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  // Resize for optimal OCR performance
  const MAX_WIDTH = 1600;
  let scale = 1;
  if (img.width > MAX_WIDTH) {
    scale = MAX_WIDTH / img.width;
  }
  canvas.width = img.width * scale;
  canvas.height = img.height * scale;

  setPreprocessingStage?.('Scaling image...');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  // Focus on bottom 35% (MRZ region)
  const roiHeight = Math.floor(canvas.height * 0.35);
  const roiY = canvas.height - roiHeight;
  const roiImageData = ctx.getImageData(0, roiY, canvas.width, roiHeight);

  // Create new canvas for ROI
  const roiCanvas = document.createElement('canvas');
  roiCanvas.width = canvas.width;
  roiCanvas.height = roiHeight;
  const roiCtx = roiCanvas.getContext('2d');
  if (!roiCtx) throw new Error('Could not get ROI context');
  roiCtx.putImageData(roiImageData, 0, 0);

  setPreprocessingStage?.('Converting to grayscale...');
  // Grayscale conversion
  const grayImageData = roiCtx.getImageData(0, 0, roiCanvas.width, roiCanvas.height);
  const data = grayImageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    data[i] = data[i + 1] = data[i + 2] = gray;
  }
  roiCtx.putImageData(grayImageData, 0, 0);

  setPreprocessingStage?.('Applying noise reduction...');
  // Simple noise reduction (3x3 box blur)
  const blurImageData = roiCtx.getImageData(0, 0, roiCanvas.width, roiCanvas.height);
  const blurData = blurImageData.data;
  const width = roiCanvas.width;
  const height = roiCanvas.height;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let sum = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const idx = ((y + dy) * width + (x + dx)) * 4;
          sum += data[idx];
        }
      }
      const idx = (y * width + x) * 4;
      const avg = sum / 9;
      blurData[idx] = blurData[idx + 1] = blurData[idx + 2] = avg;
    }
  }
  roiCtx.putImageData(blurImageData, 0, 0);

  setPreprocessingStage?.('Enhancing contrast...');
  // Enhanced contrast
  const contrastFactor = 1.6;
  const contrastImageData = roiCtx.getImageData(0, 0, roiCanvas.width, roiCanvas.height);
  const contrastData = contrastImageData.data;
  const intercept = 128 * (1 - contrastFactor);
  
  for (let i = 0; i < contrastData.length; i += 4) {
    contrastData[i] = Math.max(0, Math.min(255, contrastData[i] * contrastFactor + intercept));
    contrastData[i + 1] = Math.max(0, Math.min(255, contrastData[i + 1] * contrastFactor + intercept));
    contrastData[i + 2] = Math.max(0, Math.min(255, contrastData[i + 2] * contrastFactor + intercept));
  }
  roiCtx.putImageData(contrastImageData, 0, 0);

  setPreprocessingStage?.('Applying adaptive thresholding...');
  // Adaptive thresholding (Otsu's method approximation)
  const histImageData = roiCtx.getImageData(0, 0, roiCanvas.width, roiCanvas.height);
  const histData = histImageData.data;
  
  // Calculate histogram
  const histogram = new Array(256).fill(0);
  for (let i = 0; i < histData.length; i += 4) {
    histogram[histData[i]]++;
  }

  // Calculate optimal threshold
  const totalPixels = roiCanvas.width * roiCanvas.height;
  let sum = 0;
  for (let i = 0; i < 256; i++) {
    sum += i * histogram[i];
  }

  let sumB = 0;
  let wB = 0;
  let wF = 0;
  let maxVariance = 0;
  let threshold = 0;

  for (let t = 0; t < 256; t++) {
    wB += histogram[t];
    if (wB === 0) continue;
    
    wF = totalPixels - wB;
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

  console.log(`📊 Adaptive threshold calculated: ${threshold}`);

  // Apply threshold
  for (let i = 0; i < histData.length; i += 4) {
    const value = histData[i] > threshold ? 255 : 0;
    histData[i] = histData[i + 1] = histData[i + 2] = value;
  }
  roiCtx.putImageData(histImageData, 0, 0);

  setPreprocessingStage?.('Preprocessing complete');
  console.log('🖼️ Advanced preprocessing complete with adaptive thresholding.');
  return roiCanvas.toDataURL('image/png');
};

// =====================================================
// MRZ EXTRACTION AND PARSING
// =====================================================
const extractMRZLines = (text: string): string[] => {
  const lines = text.split('\n');
  const mrzCandidates: Array<{ line: string; score: number }> = [];

  for (const line of lines) {
    let cleanLine = line.trim().toUpperCase();
    
    // Replace common OCR errors
    cleanLine = cleanLine
      .replace(/[^A-Z0-9<]/g, '<')
      .replace(/\s+/g, '')
      .replace(/O/g, '0') // Common OCR error
      .replace(/I/g, '1'); // Common OCR error

    // Score each line based on MRZ characteristics
    let score = 0;
    
    if (cleanLine.length >= 44 && cleanLine.length <= 45) score += 10;
    if (cleanLine.includes('<')) score += 5;
    if (cleanLine.startsWith('P<')) score += 15;
    if (/^[A-Z0-9<]{44}$/.test(cleanLine)) score += 10;
    
    // Count digits (MRZ second line has many digits)
    const digitCount = (cleanLine.match(/\d/g) || []).length;
    if (digitCount >= 8) score += 5;

    if (score >= 10) {
      mrzCandidates.push({ line: cleanLine, score });
    }
  }

  // Sort by score and take top 2
  mrzCandidates.sort((a, b) => b.score - a.score);
  const topLines = mrzCandidates.slice(0, 2).map(c => c.line);

  console.log('🔍 MRZ candidate lines with scores:', mrzCandidates.slice(0, 3));
  
  return topLines;
};

const parseEnhancedMRZ = (mrzLines: string[]): PassportData | null => {
  try {
    console.log('📝 Parsing MRZ lines:', mrzLines);

    if (mrzLines.length < 2) {
      console.error('❌ Invalid MRZ: need at least 2 lines');
      return null;
    }

    const line1 = mrzLines[0].padEnd(44, '<');
    const line2 = mrzLines[1].padEnd(44, '<');

    // Parse first line - P<COUNTRY<SURNAME<<GIVENNAMES
    const documentType = line1.charAt(0) || 'P';
    const countryCode = line1.substring(2, 5) || 'UNK';

    // Extract names
    const nameParts = line1.substring(5).split('<<');
    const surname = (nameParts[0] || '').replace(/<+$/g, '').replace(/</g, ' ').trim() || 'UNKNOWN';
    const givenNames = (nameParts[1] || '').replace(/<+$/g, '').replace(/</g, ' ').trim() || 'UNKNOWN';

    // Parse second line with checksum validation
    const documentNumber = line2.substring(0, 9).replace(/<+$/g, '');
    const docNumCheck = line2.charAt(9);
    const nationality = line2.substring(10, 13);
    const birthDate = line2.substring(13, 19);
    const birthDateCheck = line2.charAt(19);
    const gender = line2.charAt(20) || 'U';
    const expiryDate = line2.substring(21, 27);
    const expiryDateCheck = line2.charAt(27);
    const personalNumber = line2.substring(28, 42).replace(/<+$/g, '');
    const personalNumCheck = line2.charAt(42);
    const compositeCheck = line2.charAt(43);

    // Validate checksums
    const checksumValid = {
      documentNumber: validateCheckDigit(documentNumber, docNumCheck),
      dateOfBirth: validateCheckDigit(birthDate, birthDateCheck),
      expirationDate: validateCheckDigit(expiryDate, expiryDateCheck),
      composite: false // Complex composite check
    };

    // Composite check validation
    const compositeData = documentNumber + docNumCheck + birthDate + birthDateCheck + 
                         expiryDate + expiryDateCheck + personalNumber + personalNumCheck;
    checksumValid.composite = validateCheckDigit(compositeData, compositeCheck);

    console.log('✅ Checksum validation results:', checksumValid);

    // Format dates
    const formattedBirthDate = formatMRZDateEnhanced(birthDate);
    const formattedExpiryDate = formatMRZDateEnhanced(expiryDate);

    // Get nationality name
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

    // Determine full year (00-30 = 20xx, 31-99 = 19xx)
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
    'UNK': 'Unknown'
  };
  return countries[code] || code;
};

// =====================================================
// MAIN COMPONENT
// =====================================================
const UnifiedPassportScanner: React.FC<UnifiedPassportScannerProps> = ({
  onScanSuccess,
  onScanFailure
}) => {
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showRawMRZ, setShowRawMRZ] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preprocessingStage, setPreprocessingStage] = useState<string>('');
  const [ocrProgress, setOcrProgress] = useState<number>(0);
  const resultRef = useRef<HTMLDivElement>(null);

  // Detect if running in Capacitor/Android
  const isCapacitor = () => {
    return !!(window as any).Capacitor;
  };

  // FIXED: Configure Tesseract with correct CDN paths
  const configureTesseract = () => {
    if (isCapacitor()) {
      console.log('⚡ Capacitor environment detected. Using CDN paths for Tesseract.');
      return {
        workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js',
        langPath: 'https://tessdata.projectnaptha.com/4.0.0_best',
        corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5/tesseract-core.wasm.js',
      };
    }
    return {};
  };

  const takePicture = async () => {
    try {
      setScanning(true);
      setScanResult(null);
      setError(null);
      setOcrProgress(0);
      setPreprocessingStage('');

      console.log('📷 Starting unified passport scan...');

      const image = await Camera.getPhoto({
        quality: 95,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        width: 1600,
        height: 1200
      });

      if (image.dataUrl) {
        setImagePreview(image.dataUrl);
        console.log('📷 Image captured, preprocessing...');

        // Advanced preprocessing with progress updates
        const preprocessedImage = await preprocessImage(image.dataUrl, setPreprocessingStage);
        console.log('✅ Preprocessing completed');

        setPreprocessingStage('Running OCR...');
        console.log('🔍 Starting Tesseract OCR with optimized parameters...');

        // FIXED: Use 'eng' with optimized parameters
        const result = await Tesseract.recognize(preprocessedImage, 'eng', {
          logger: (m: any) => {
            if (m.status === 'recognizing text') {
              const progress = Math.round(m.progress * 100);
              setOcrProgress(progress);
              console.log(`OCR Progress: ${progress}%`);
            }
          },
          tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
          tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<',
          ...configureTesseract()
        });

        console.log('✅ Tesseract OCR completed');

        const extractedText = result.data.text;
        const confidence = result.data.confidence / 100;
        console.log(`🔍 Extracted ${extractedText.length} characters (Confidence: ${confidence.toFixed(2)})`);
        console.log('Raw text:', extractedText);

        // Extract MRZ lines
        const mrzLines = extractMRZLines(extractedText);
        console.log('🔍 Detected MRZ lines:', mrzLines);

        if (mrzLines.length >= 2) {
          const passportData = parseEnhancedMRZ(mrzLines);

          if (passportData && passportData.surname !== 'UNKNOWN' && passportData.documentNumber !== 'UNKNOWN') {
            const scanResult: ScanResult = {
              success: true,
              data: passportData,
              confidence: confidence,
              timestamp: Date.now(),
              imageData: image.dataUrl,
              ocrMethod: 'Advanced Tesseract.js OCR with Checksums'
            };

            setScanResult(scanResult);
            onScanSuccess?.(scanResult);
            console.log('🎉 Unified scan completed successfully');

            // Scroll to results
            setTimeout(() => {
              resultRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
              });
            }, 100);
          } else {
            throw new Error('Failed to parse valid passport data from MRZ');
          }
        } else {
          throw new Error('No valid MRZ detected in image. Please ensure MRZ lines are clearly visible.');
        }
      }

      setScanning(false);
    } catch (error) {
      console.error('❌ Unified scan error:', error);
      setError(error instanceof Error ? error.message : 'Scan failed');

      const failureResult: ScanResult = {
        success: false,
        data: {
          documentType: 'Unknown',
          countryCode: 'N/A',
          surname: 'SCAN_FAILED',
          givenNames: 'NO_DATA_EXTRACTED',
          documentNumber: 'N/A',
          dateOfBirth: 'N/A',
          expirationDate: 'N/A',
          personalNumber: 'N/A',
          nationality: 'Unknown',
          rawMRZ: 'No clear MRZ detected'
        },
        confidence: 0,
        timestamp: Date.now(),
        imageData: imagePreview || undefined,
        ocrMethod: 'Advanced OCR - Failed'
      };

      setScanResult(failureResult);
      onScanFailure?.(failureResult);
      setScanning(false);
    }
  };

  const resetScanner = () => {
    setScanResult(null);
    setImagePreview(null);
    setError(null);
    setShowRawMRZ(false);
    setPreprocessingStage('');
    setOcrProgress(0);
  };

  // Helper to check if checksums are valid
  const hasValidChecksums = (data: PassportData): boolean => {
    if (!data.checksumValid) return false;
    return data.checksumValid.documentNumber && 
           data.checksumValid.dateOfBirth && 
           data.checksumValid.expirationDate;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <FileText className="w-6 h-6" />
                  Professional Passport Scanner
                </CardTitle>
                <CardDescription>
                  Advanced OCR • Checksum Validation • Adaptive Processing
                </CardDescription>
              </div>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <CheckCircle className="w-3 h-3 mr-1" />
                Production Ready
              </Badge>
            </div>
          </CardHeader>
        </Card>

        {/* Scanner Card */}
        <Card>
          <CardHeader>
            <CardTitle>Document Scanner</CardTitle>
            <CardDescription>
              AI-powered MRZ extraction with enhanced security validation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Camera Preview */}
            <div className="relative aspect-video bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center">
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="Captured passport"
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
              ) : scanning ? (
                <div className="text-center text-white">
                  <CameraIcon className="w-16 h-16 mx-auto mb-4 animate-pulse" />
                  <p className="text-lg font-medium">{preprocessingStage || 'Processing...'}</p>
                  {ocrProgress > 0 && (
                    <div className="mt-4 w-64 mx-auto">
                      <div className="bg-slate-700 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${ocrProgress}%` }}
                        />
                      </div>
                      <p className="text-sm text-slate-300 mt-2">OCR Progress: {ocrProgress}%</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-white">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-slate-400" />
                  <p className="text-lg font-medium">Ready for Professional Scan</p>
                  <p className="text-sm text-slate-300">Position MRZ lines at bottom of frame</p>
                </div>
              )}
            </div>

            {/* Scanning Tips */}
            {!scanResult && (
              <Alert>
                <Lightbulb className="h-4 w-4" />
                <AlertDescription>
                  <strong>For best results:</strong>
                  <ul className="mt-2 space-y-1 text-sm">
                    <li>• Ensure excellent lighting without shadows or glare</li>
                    <li>• Keep passport completely flat and parallel to camera</li>
                    <li>• MRZ lines (bottom two lines) must be sharp and clear</li>
                    <li>• Avoid any obstructions covering the text</li>
                    <li>• Hold steady until processing completes</li>
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Scan Button */}
            <Button
              onClick={takePicture}
              disabled={scanning}
              className="w-full h-12 text-lg"
              size="lg"
            >
              {scanning ? (
                <>
                  <RotateCcw className="w-5 h-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CameraIcon className="w-5 h-5 mr-2" />
                  Scan Passport
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results Display */}
        {scanResult && (
          <div ref={resultRef}>
            <Card className={scanResult.success ? "border-green-200" : "border-red-200"}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {scanResult.success ? (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-600" />
                    )}
                    <CardTitle>
                      {scanResult.success ? 'Scan Successful!' : 'Scan Failed'}
                    </CardTitle>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline">
                      Confidence: {(scanResult.confidence * 100).toFixed(1)}%
                    </Badge>
                    {scanResult.success && scanResult.data.checksumValid && (
                      <Badge 
                        variant={hasValidChecksums(scanResult.data) ? "default" : "destructive"}
                        className="flex items-center gap-1"
                      >
                        {hasValidChecksums(scanResult.data) ? (
                          <>
                            <ShieldCheck className="w-3 h-3" />
                            Verified
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3 h-3" />
                            Check Failed
                          </>
                        )}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {scanResult.success && scanResult.data.surname !== 'SCAN_FAILED' && (
                  <>
                    {/* Profile Section */}
                    {(() => {
                      const isValidChecksum = hasValidChecksums(scanResult.data);
                      return (
                        <>
                          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-lg">
                            <div className="flex items-center gap-4">
                              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="w-8 h-8 text-primary" />
                              </div>
                              <div>
                                <h3 className="text-2xl font-bold">
                                  {scanResult.data.givenNames} {scanResult.data.surname}
                                </h3>
                                <p className="text-muted-foreground flex items-center gap-1">
                                  <Globe className="w-4 h-4" />
                                  {scanResult.data.nationality} National
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Checksum Status */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {Object.entries(scanResult.data.checksumValid || {}).map(([key, valid]) => (
                          <div 
                            key={key}
                            className={`p-2 rounded-lg border ${valid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}
                          >
                            <p className="text-xs font-medium text-center">
                              {key.replace(/([A-Z])/g, ' $1').trim()}
                            </p>
                            <p className="text-center mt-1">
                              {valid ? '✓' : '✗'}
                            </p>
                          </div>
                        ))}
                          </div>

                          {/* Document Details Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-muted-foreground">
                          <CreditCard className="w-4 h-4" />
                          <span className="text-sm">Document Number</span>
                        </div>
                        <p className="text-lg font-semibold">{scanResult.data.documentNumber}</p>
                      </div>

                      <div className="space-y-2">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Globe className="w-4 h-4" />
                          <span className="text-sm">Nationality</span>
                        </div>
                        <p className="text-lg font-semibold">{scanResult.data.nationality}</p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-muted-foreground">
                                <Calendar className="w-4 h-4" />
                                <span className="text-sm">Date of Birth</span>
                        </div>
                        <p className="text-lg font-semibold">{scanResult.data.dateOfBirth}</p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                                <span className="text-sm">Expiration Date</span>
                              </div>
                        <p className="text-lg font-semibold">{scanResult.data.expirationDate}</p>
                      </div>
                    </div>

                    {/* Raw MRZ Section */}
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowRawMRZ(!showRawMRZ)}
                        className="w-full"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        {showRawMRZ ? 'Hide' : 'Show'} Raw MRZ
                      </Button>

                      {showRawMRZ && (
                        <pre className="bg-slate-900 text-green-400 p-4 rounded-lg text-xs font-mono overflow-x-auto">
                          {scanResult.data.rawMRZ}
                        </pre>
                      )}
                    </div>

                          {/* Action Buttons */}
                          <div className="flex gap-2">
                            <Button variant="outline" className="flex-1" onClick={resetScanner}>
                              <RotateCcw className="w-4 h-4 mr-2" />
                              Scan Again
                            </Button>
                            <Button className="flex-1">
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Confirm & Continue
                            </Button>
                          </div>
                        </>
                      );
                    })()}
                  </>
                )}

                {/* Failure Information */}
                {!scanResult.success && (
                  <div className="space-y-4">
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>Scan Failed</strong>
                        <p className="mt-2">{error || 'Unable to extract passport data'}</p>
                        <ul className="mt-2 space-y-1 text-sm">
                          <li>• Ensure passport data page is clearly visible</li>
                          <li>• Check that MRZ lines are not obscured or blurry</li>
                          <li>• Try different lighting or reduce glare</li>
                          <li>• Make sure the image is in sharp focus</li>
                          <li>• Keep the passport flat without curves</li>
                        </ul>
                      </AlertDescription>
                    </Alert>

                    <Button variant="outline" className="w-full" onClick={resetScanner}>
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Try Again
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default UnifiedPassportScanner;
