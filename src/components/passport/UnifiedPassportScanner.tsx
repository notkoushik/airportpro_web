import React, { useState, useRef } from 'react';
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
  Lightbulb
} from "lucide-react";
import Tesseract from 'tesseract.js';

// Type Definitions
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
// IMAGE PREPROCESSING FUNCTION
// =====================================================
const preprocessImage = async (imageDataUrl: string): Promise<string> => {
  const img = new Image();
  img.src = imageDataUrl;
  
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
  });

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  // Resize if needed for performance
  const MAX_WIDTH = 1600;
  let scale = 1;
  if (img.width > MAX_WIDTH) {
    scale = MAX_WIDTH / img.width;
  }
  canvas.width = img.width * scale;
  canvas.height = img.height * scale;

  // 1. Draw scaled image
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  // 2. Convert to grayscale
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    data[i] = data[i + 1] = data[i + 2] = gray;
  }
  ctx.putImageData(imageData, 0, 0);

  // 3. Increase contrast
  const contrastFactor = 1.5;
  const contrastImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const contrastData = contrastImageData.data;
  const intercept = 128 * (1 - contrastFactor);
  for (let i = 0; i < contrastData.length; i += 4) {
    contrastData[i] = Math.max(0, Math.min(255, contrastData[i] * contrastFactor + intercept));
    contrastData[i + 1] = Math.max(0, Math.min(255, contrastData[i + 1] * contrastFactor + intercept));
    contrastData[i + 2] = Math.max(0, Math.min(255, contrastData[i + 2] * contrastFactor + intercept));
  }
  ctx.putImageData(contrastImageData, 0, 0);

  // 4. Binarization/Thresholding
  const thresholdImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const thresholdData = thresholdImageData.data;
  const threshold = 135;
  for (let i = 0; i < thresholdData.length; i += 4) {
    const value = thresholdData[i] > threshold ? 255 : 0;
    thresholdData[i] = thresholdData[i + 1] = thresholdData[i + 2] = value;
  }
  ctx.putImageData(thresholdImageData, 0, 0);

  console.log('🖼️ Image preprocessing complete.');
  return canvas.toDataURL('image/png');
};

// =====================================================
// MRZ EXTRACTION AND PARSING FUNCTIONS
// =====================================================
const extractMRZLines = (text: string): string[] => {
  const lines = text.split('\n');
  const mrzLines: string[] = [];

  for (const line of lines) {
    let cleanLine = line.trim().toUpperCase();
    
    // Replace invalid chars with <
    cleanLine = cleanLine
      .replace(/[^A-Z0-9<]/g, '<')
      .replace(/\s+/g, '');

    // Look for MRZ patterns (length 44 typically, contains < symbols)
    if (cleanLine.length >= 36 && cleanLine.includes('<')) {
      if (cleanLine.startsWith('P<') || /^[A-Z0-9<]{36,}$/.test(cleanLine)) {
        mrzLines.push(cleanLine);
      }
    }
  }

  return mrzLines.slice(0, 2);
};

const parseEnhancedMRZ = (mrzLines: string[]): PassportData | null => {
  try {
    console.log('📝 Parsing MRZ lines:', mrzLines);

    if (mrzLines.length < 2) {
      console.error('❌ Invalid MRZ: need at least 2 lines');
      return null;
    }

    const line1 = mrzLines[0];
    const line2 = mrzLines[1];

    // Parse first line - P<COUNTRY<SURNAME<<GIVENNAMES
    const documentType = line1.charAt(0) || 'P';
    const countryCode = line1.substring(2, 5) || 'UNK';

    // Extract names from first line
    const nameParts = line1.substring(5).split('<<');
    const surname = (nameParts[0] || '').replace(/<+$/g, '').replace(/</g, ' ').trim() || 'UNKNOWN';
    const givenNames = (nameParts[1] || '').replace(/<+$/g, '').replace(/</g, ' ').trim() || 'UNKNOWN';

    // Parse second line with correct field positions
    let documentNumber = '';
    let birthDate = '';
    let gender = '';
    let expiryDate = '';
    let personalNumber = '';

    if (line2.length >= 44) {
      documentNumber = line2.substring(0, 9).replace(/<+$/g, '');
      birthDate = line2.substring(13, 19);
      gender = line2.charAt(20) || 'U';
      expiryDate = line2.substring(21, 27);
      personalNumber = line2.substring(28, 42).replace(/<+$/g, '');
    }

    // Format dates
    const formattedBirthDate = formatMRZDateEnhanced(birthDate);
    const formattedExpiryDate = formatMRZDateEnhanced(expiryDate);

    // Get nationality
    const nationality = getEnhancedCountryName(countryCode);

    const passportData: PassportData = {
      documentType,
      countryCode,
      surname,
      givenNames,
      documentNumber: documentNumber || 'UNKNOWN',
      dateOfBirth: formattedBirthDate,
      expirationDate: formattedExpiryDate,
      personalNumber: personalNumber || '',
      nationality,
      gender,
      rawMRZ: mrzLines.join('\n')
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
  const resultRef = useRef<HTMLDivElement>(null);

  const takePicture = async () => {
    try {
      setScanning(true);
      setScanResult(null);
      setError(null);

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

        // Preprocess image
        const preprocessedImage = await preprocessImage(image.dataUrl);

        console.log('🔍 Running Tesseract OCR...');
        // Run Tesseract OCR
        const result = await Tesseract.recognize(preprocessedImage, 'eng', {
          logger: (m: any) => {
            if (m.status === 'recognizing text') {
              console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
            }
          }
        });

        const extractedText = result.data.text;
        console.log('🔍 Raw extracted text:', extractedText);

        // Extract MRZ lines
        const mrzLines = extractMRZLines(extractedText);
        console.log('🔍 Detected MRZ lines:', mrzLines);

        if (mrzLines.length >= 2) {
          const passportData = parseEnhancedMRZ(mrzLines);

          if (passportData && passportData.surname !== 'UNKNOWN' && passportData.documentNumber !== 'UNKNOWN') {
            const scanResult: ScanResult = {
              success: true,
              data: passportData,
              confidence: 0.92,
              timestamp: Date.now(),
              imageData: image.dataUrl,
              ocrMethod: 'Unified Tesseract.js OCR'
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
          throw new Error('No valid MRZ detected in image');
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
        ocrMethod: 'Unified OCR - Failed'
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
                  Unified Passport Scanner
                </CardTitle>
                <CardDescription>
                  Advanced OCR • Enhanced MRZ Extraction • High Accuracy
                </CardDescription>
              </div>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <CheckCircle className="w-3 h-3 mr-1" />
                OCR Ready
              </Badge>
            </div>
          </CardHeader>
        </Card>

        {/* Scanner Card */}
        <Card>
          <CardHeader>
            <CardTitle>Professional Document Scanner</CardTitle>
            <CardDescription>
              AI-powered MRZ extraction with enhanced preprocessing
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
                  <p className="text-lg font-medium">Processing with Unified OCR</p>
                  <p className="text-sm text-slate-300">Enhanced MRZ extraction in progress</p>
                </div>
              ) : (
                <div className="text-center text-white">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-slate-400" />
                  <p className="text-lg font-medium">Ready for Unified Scan</p>
                  <p className="text-sm text-slate-300">Ensure passport MRZ lines are clearly visible</p>
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
                    <li>• Ensure good lighting without shadows or glare</li>
                    <li>• Keep passport flat and parallel to camera</li>
                    <li>• Make sure MRZ lines (bottom two lines) are clearly visible</li>
                    <li>• Avoid any obstructions or fingers covering the text</li>
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
                    <Badge variant="secondary">
                      {scanResult.ocrMethod}
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {scanResult.success && scanResult.data.surname !== 'SCAN_FAILED' && (
                  <>
                    {/* Profile Section */}
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
                        Confirm Data
                      </Button>
                    </div>
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
                          <li>• Check that MRZ lines are not obscured</li>
                          <li>• Try different lighting or angle</li>
                          <li>• Make sure the image is in focus</li>
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
