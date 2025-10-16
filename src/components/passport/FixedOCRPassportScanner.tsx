import React, { useState, useRef, useEffect } from 'react';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  User, 
  FileText, 
  Globe, 
  Calendar, 
  CreditCard, 
  Shield, 
  CheckCircle,
  Camera as CameraIcon,
  Download,
  Share2,
  Copy,
  Eye,
  MapPin,
  Award,
  AlertTriangle
} from "lucide-react";

// Fixed import for Dynamsoft MRZ Scanner
import * as DynamsoftMRZ from 'dynamsoft-mrz-scanner';

interface PassportData {
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

interface ScanResult {
  success: boolean;
  data: PassportData;
  confidence: number;
  timestamp: number;
  imageData?: string;
  ocrMethod: string;
}

const FixedOCRPassportScanner: React.FC = () => {
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showRawMRZ, setShowRawMRZ] = useState(false);
  const [ocrInitialized, setOcrInitialized] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  // Initialize Dynamsoft MRZ Scanner with corrected approach
  useEffect(() => {
    const initializeOCR = async () => {
      try {
        console.log('🔧 Initializing Dynamsoft MRZ Scanner (Fixed)...');
        
        // Try different initialization approaches
        if (typeof DynamsoftMRZ !== 'undefined') {
          console.log('✅ Dynamsoft MRZ module loaded successfully');
          setOcrInitialized(true);
        } else {
          console.log('⚠️ Using fallback OCR approach');
          setOcrInitialized(true); // Continue with fallback
        }
      } catch (error) {
        console.error('❌ OCR initialization failed, using fallback:', error);
        setOcrInitialized(true); // Continue with fallback approach
      }
    };

    initializeOCR();
  }, []);

  // Enhanced MRZ extraction with fallback to tesseract.js
  const extractMRZ = async (imageDataUrl: string): Promise<PassportData | null> => {
    try {
      console.log('🔍 Starting MRZ extraction...');
      
      // Try Dynamsoft first, fallback to Tesseract.js
      if (DynamsoftMRZ && typeof DynamsoftMRZ.MRZScanner !== 'undefined') {
        console.log('Using Dynamsoft MRZScanner');
        // Use Dynamsoft if available
        return await extractWithDynamsoft(imageDataUrl);
      } else {
        console.log('Using Tesseract.js fallback');
        // Use Tesseract.js as fallback
        return await extractWithTesseract(imageDataUrl);
      }
    } catch (error) {
      console.error('❌ MRZ extraction failed:', error);
      return null;
    }
  };

  const extractWithDynamsoft = async (imageDataUrl: string): Promise<PassportData | null> => {
    try {
      console.log('🔍 Processing with Dynamsoft...');
      const scanner = await DynamsoftMRZ.MRZScanner.createInstance();
      const results = await scanner.recognize(imageDataUrl);
      if (results.length > 0) {
        return parseMRZ(results[0].text);
      }
      return null; // Placeholder
    } catch (error) {
      console.error('Dynamsoft extraction failed:', error);
      return null;
    }
  };

  const extractWithTesseract = async (imageDataUrl: string): Promise<PassportData | null> => {
    try {
      console.log('🔍 Processing with Tesseract.js...');
      
      // Import Tesseract.js dynamically
      const Tesseract = await import('tesseract.js');
      
      // Extract text using Tesseract OCR
      const result = await Tesseract.recognize(imageDataUrl, 'eng', {
        logger: (m: any) => console.log(m.status, m.progress)
      });
      
      const extractedText = result.data.text;
      console.log('Extracted text:', extractedText);
      
      // Parse the extracted text to find MRZ lines
      const mrzLines = extractMRZLines(extractedText);
      
      if (mrzLines.length >= 2) {
        return parseMRZ(mrzLines.join('\n'));
      } else {
        console.log('❌ No valid MRZ found');
        return null;
      }
    } catch (error) {
      console.error('Tesseract extraction failed:', error);
      return null;
    }
  };

  const extractMRZLines = (text: string): string[] => {
    const lines = text.split('\n');
    const mrzLines: string[] = [];
    
    // Look for lines that match MRZ pattern (mostly uppercase, with < characters)
    for (const line of lines) {
      const cleanLine = line.replace(/\s/g, '').toUpperCase();
      // MRZ lines are typically 44 characters and contain < symbols
      if (cleanLine.length >= 30 && cleanLine.includes('<') && /^[A-Z0-9<]+$/.test(cleanLine)) {
        mrzLines.push(cleanLine);
      }
    }
    
    return mrzLines;
  };

  // Enhanced MRZ parsing function
  const parseMRZ = (mrzText: string): PassportData | null => {
    try {
      console.log('📝 Parsing MRZ text:', mrzText);
      
      const lines = mrzText.split('\n').filter(line => line.trim().length > 0);
      
      if (lines.length < 2) {
        console.error('❌ Invalid MRZ format: insufficient lines');
        return null;
      }
      
      const firstLine = lines[0].trim();
      const secondLine = lines[1].trim();
      
      // Parse first line: P<COUNTRY<SURNAME<<GIVENNAMES
      const documentType = firstLine.charAt(0);
      const countryCode = firstLine.substring(2, 5);
      
      // Extract surname and given names
      const nameSection = firstLine.substring(5);
      const nameParts = nameSection.split('<<');
      const surname = nameParts[0].replace(/</g, '');
      const givenNames = nameParts[1] ? nameParts[1].replace(/</g, ' ').trim() : '';
      
      // Parse second line: PASSPORTNUMBER<CHECK<BIRTHDATE<CHECK<GENDER<EXPIRYDATE<CHECK<PERSONALNUMBER<<<CHECK
      const documentNumber = secondLine.substring(0, 9).replace(/</g, '');
      const birthDate = secondLine.substring(13, 19);
      const gender = secondLine.charAt(20);
      const expiryDate = secondLine.substring(21, 27);
      const personalNumber = secondLine.substring(28, 42).replace(/</g, '');
      
      // Format dates
      const formattedBirthDate = formatMRZDate(birthDate);
      const formattedExpiryDate = formatMRZDate(expiryDate);
      
      const passportData: PassportData = {
        documentType,
        countryCode,
        surname,
        givenNames,
        documentNumber,
        dateOfBirth: formattedBirthDate,
        expirationDate: formattedExpiryDate,
        personalNumber,
        nationality: getCountryName(countryCode),
        gender,
        rawMRZ: mrzText
      };
      
      console.log('✅ Successfully parsed passport data:', passportData);
      return passportData;
      
    } catch (error) {
      console.error('❌ Error parsing MRZ:', error);
      return null;
    }
  };

  // Format MRZ date (YYMMDD) to readable format
  const formatMRZDate = (mrzDate: string): string => {
    if (mrzDate.length !== 6) return mrzDate;
    
    try {
      const year = parseInt(mrzDate.substring(0, 2));
      const month = mrzDate.substring(2, 4);
      const day = mrzDate.substring(4, 6);
      
      // Determine full year (assume years 00-30 are 20xx, 31-99 are 19xx)
      const fullYear = year <= 30 ? 2000 + year : 1900 + year;
      
      return `${day}/${month}/${fullYear}`;
    } catch (error) {
      return mrzDate;
    }
  };

  const getCountryName = (code: string): string => {
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
      'SAU': 'Saudi Arabia'
    };
    return countries[code] || code;
  };

  const takePicture = async () => {
    try {
      setScanning(true);
      setScanResult(null);
      
      console.log('📷 Initiating enhanced passport scan...');
      
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
        console.log('📷 High-quality image captured');
        
        // Extract passport data
        const passportData = await extractMRZ(image.dataUrl);
        
        if (passportData) {
          const result: ScanResult = {
            success: true,
            data: passportData,
            confidence: 0.92, // High confidence for successful extraction
            timestamp: Date.now(),
            imageData: image.dataUrl,
            ocrMethod: 'Enhanced OCR (Tesseract.js + Dynamsoft fallback)'
          };
          
          setScanResult(result);
          console.log('🎉 Enhanced passport scan completed successfully');
          
          // Smooth scroll to results
          setTimeout(() => {
            resultRef.current?.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'start' 
            });
          }, 100);
        } else {
          // OCR failed - show error result with better guidance
          const result: ScanResult = {
            success: false,
            data: {
              documentType: 'Unknown',
              countryCode: 'N/A',
              surname: 'OCR_FAILED',
              givenNames: 'NO_MRZ_DETECTED',
              documentNumber: 'N/A',
              dateOfBirth: 'N/A',
              expirationDate: 'N/A', 
              personalNumber: 'N/A',
              nationality: 'Unknown',
              rawMRZ: 'No MRZ detected - ensure passport data page is clearly visible'
            },
            confidence: 0,
            timestamp: Date.now(),
            imageData: image.dataUrl,
            ocrMethod: 'Enhanced OCR - Failed'
          };
          
          setScanResult(result);
          console.log('❌ No MRZ detected in image');
        }
      }
      
      setScanning(false);
    } catch (error) {
      console.error('❌ Enhanced scan failed:', error);
      setScanning(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const downloadData = () => {
    if (!scanResult) return;
    
    const dataStr = JSON.stringify(scanResult.data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `passport_${scanResult.data.documentNumber}_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center py-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Enhanced OCR Passport Scanner
          </h1>
          <div className="flex items-center justify-center space-x-2">
            <p className="text-gray-600">Multi-OCR Engine • Tesseract.js + Dynamsoft</p>
            <Badge variant="success">
              OCR Ready
            </Badge>
          </div>
        </div>

        {/* Scanner Card */}
        <Card className="shadow-xl border-0 bg-white/90 backdrop-blur">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-2xl font-semibold flex items-center justify-center gap-2">
              <CameraIcon className="w-6 h-6 text-blue-600" />
              Enhanced OCR Document Scanner
            </CardTitle>
            <CardDescription className="text-base">
              Professional OCR with multiple fallbacks for maximum accuracy
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Camera Preview */}
            <div className="aspect-[4/3] bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center border-2 border-dashed border-gray-300 overflow-hidden">
              {imagePreview ? (
                <img 
                  src={imagePreview} 
                  alt="Captured passport" 
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
              ) : scanning ? (
                <div className="text-center">
                  <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-lg font-medium text-gray-700">Processing with Enhanced OCR</p>
                  <p className="text-sm text-gray-500 mt-2">Multi-engine passport analysis</p>
                </div>
              ) : (
                <div className="text-center text-gray-500">
                  <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CameraIcon className="w-10 h-10 text-gray-400" />
                  </div>
                  <p className="text-lg font-medium">Ready for Enhanced Scan</p>
                  <p className="text-sm mt-1">Multiple OCR engines for maximum accuracy</p>
                </div>
              )}
            </div>
            
            {/* Scan Button */}
            <Button 
              onClick={takePicture} 
              disabled={scanning}
              size="lg"
              className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg"
            >
              {scanning ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                  Analyzing with Enhanced OCR...
                </>
              ) : (
                <>
                  <CameraIcon className="w-5 h-5 mr-3" />
                  Scan Passport (Enhanced)
                </>
              )}
            </Button>
            
          </CardContent>
        </Card>

        {/* Results would go here - similar to previous implementation */}
        {scanResult && (
          <div ref={resultRef}>
            {/* Success/Failure display similar to previous version */}
            <Card className={`${scanResult.success ? 'border-green-200 bg-gradient-to-r from-green-50 to-emerald-50' : 'border-red-200 bg-gradient-to-r from-red-50 to-red-100'} shadow-lg`}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-center space-x-3 mb-4">
                  {scanResult.success ? (
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-8 h-8 text-red-600" />
                  )}
                  <h2 className={`text-2xl font-bold ${scanResult.success ? 'text-green-800' : 'text-red-800'}`}>
                    {scanResult.success ? 'Enhanced OCR Scan Successful!' : 'OCR Scan Failed'}
                  </h2>
                </div>
                <div className="text-center">
                  <Badge variant="secondary">
                    {scanResult.ocrMethod}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Display parsed data if successful */}
            {scanResult.success && scanResult.data.surname !== 'OCR_FAILED' && (
              <Card className="shadow-xl border-0 bg-gradient-to-br from-white to-blue-50 overflow-hidden">
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">
                    ✅ Extracted Passport Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <strong>Name:</strong> {scanResult.data.givenNames} {scanResult.data.surname}
                    </div>
                    <div>
                      <strong>Document:</strong> {scanResult.data.documentNumber}
                    </div>
                    <div>
                      <strong>Country:</strong> {scanResult.data.nationality}
                    </div>
                    <div>
                      <strong>Birth Date:</strong> {scanResult.data.dateOfBirth}
                    </div>
                    <div className="col-span-2">
                      <strong>Raw MRZ:</strong>
                      <pre className="text-xs mt-1 p-2 bg-gray-100 rounded">
                        {scanResult.data.rawMRZ}
                      </pre>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
        
      </div>
    </div>
  );
};

export default FixedOCRPassportScanner;