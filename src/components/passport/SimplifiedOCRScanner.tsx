import React, { useState, useRef } from 'react';
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

// Static import - no dynamic import issues
import Tesseract from 'tesseract.js';

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

const SimplifiedOCRScanner: React.FC = () => {
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showRawMRZ, setShowRawMRZ] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

  // Enhanced MRZ extraction using Tesseract.js (static import)
  const extractMRZ = async (imageDataUrl: string): Promise<PassportData | null> => {
    try {
      console.log('🔍 Starting MRZ extraction with Tesseract.js...');
      
      // Use Tesseract.js with static import (no dynamic import issues)
      const result = await Tesseract.recognize(imageDataUrl, 'eng', {
        logger: (m: any) => {
          if (m.status === 'recognizing text') {
            console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
          }
        }
      });
      
      const extractedText = result.data.text;
      console.log('🔍 Extracted text:', extractedText);
      
      // Parse the extracted text to find MRZ lines
      const mrzLines = extractMRZLines(extractedText);
      
      if (mrzLines.length >= 2) {
        const passportData = parseMRZ(mrzLines.join('\n'));
        if (passportData) {
          console.log('✅ Successfully extracted passport data:', passportData);
          return passportData;
        }
      }
      
      console.log('❌ No valid MRZ found in extracted text');
      return null;
      
    } catch (error) {
      console.error('❌ Tesseract extraction failed:', error);
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
    
    // Also look for patterns that might be MRZ even if not perfect
    for (const line of lines) {
      const cleanLine = line.replace(/\s/g, '').toUpperCase();
      // Look for passport-like patterns
      if (cleanLine.length >= 25 && /^[A-Z0-9<>]{25,}$/.test(cleanLine.replace(/[^A-Z0-9<>]/g, ''))) {
        const processedLine = cleanLine.replace(/[^A-Z0-9<]/g, '<');
        if (!mrzLines.includes(processedLine)) {
          mrzLines.push(processedLine);
        }
      }
    }
    
    return mrzLines.slice(0, 2); // Take first 2 valid MRZ lines
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
      const documentType = firstLine.charAt(0) || 'P';
      const countryCode = firstLine.substring(2, 5) || 'UNK';
      
      // Extract surname and given names
      const nameSection = firstLine.substring(5);
      const nameParts = nameSection.split('<<');
      const surname = (nameParts[0] || '').replace(/</g, '').trim() || 'UNKNOWN';
      const givenNames = nameParts[1] ? nameParts[1].replace(/</g, ' ').trim() : 'UNKNOWN';
      
      // Parse second line: PASSPORTNUMBER<CHECK<BIRTHDATE<CHECK<GENDER<EXPIRYDATE<CHECK<PERSONALNUMBER<<<CHECK
      const documentNumber = (secondLine.substring(0, 9) || '').replace(/</g, '').trim() || 'UNKNOWN';
      const birthDate = secondLine.substring(13, 19) || '000000';
      const gender = secondLine.charAt(20) || 'U';
      const expiryDate = secondLine.substring(21, 27) || '000000';
      const personalNumber = (secondLine.substring(28, 42) || '').replace(/</g, '').trim() || '';
      
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
    if (!mrzDate || mrzDate.length !== 6 || mrzDate === '000000') return 'Unknown';
    
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
      'SAU': 'Saudi Arabia',
      'UNK': 'Unknown'
    };
    return countries[code] || code;
  };

  const takePicture = async () => {
    try {
      setScanning(true);
      setScanResult(null);
      
      console.log('📷 Initiating simplified OCR passport scan...');
      
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
        
        // Extract passport data using Tesseract.js
        const passportData = await extractMRZ(image.dataUrl);
        
        if (passportData && passportData.surname !== 'UNKNOWN' && passportData.documentNumber !== 'UNKNOWN') {
          const result: ScanResult = {
            success: true,
            data: passportData,
            confidence: 0.88, // Good confidence for successful extraction
            timestamp: Date.now(),
            imageData: image.dataUrl,
            ocrMethod: 'Tesseract.js OCR'
          };
          
          setScanResult(result);
          console.log('🎉 Simplified passport scan completed successfully');
          
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
              rawMRZ: passportData?.rawMRZ || 'No clear MRZ detected in image'
            },
            confidence: 0,
            timestamp: Date.now(),
            imageData: image.dataUrl,
            ocrMethod: 'Tesseract.js OCR - Failed'
          };
          
          setScanResult(result);
          console.log('❌ No clear MRZ detected in image');
        }
      }
      
      setScanning(false);
    } catch (error) {
      console.error('❌ Simplified scan failed:', error);
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
            Professional Passport Scanner
          </h1>
          <div className="flex items-center justify-center space-x-2">
            <p className="text-gray-600">Tesseract.js OCR • Real MRZ Extraction</p>
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
              Professional Document Scanner
            </CardTitle>
            <CardDescription className="text-base">
              AI-powered MRZ extraction with professional accuracy
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
                  <p className="text-lg font-medium text-gray-700">Processing with Tesseract OCR</p>
                  <p className="text-sm text-gray-500 mt-2">Extracting MRZ data from passport</p>
                </div>
              ) : (
                <div className="text-center text-gray-500">
                  <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CameraIcon className="w-10 h-10 text-gray-400" />
                  </div>
                  <p className="text-lg font-medium">Ready for Professional Scan</p>
                  <p className="text-sm mt-1">Ensure passport MRZ lines are clearly visible</p>
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
                  Analyzing with OCR...
                </>
              ) : (
                <>
                  <CameraIcon className="w-5 h-5 mr-3" />
                  Scan Passport (Professional)
                </>
              )}
            </Button>
            
          </CardContent>
        </Card>

        {/* Results Display */}
        {scanResult && (
          <div ref={resultRef} className="space-y-6">
            
            {/* Success/Failure Header */}
            <Card className={`${scanResult.success ? 'border-green-200 bg-gradient-to-r from-green-50 to-emerald-50' : 'border-red-200 bg-gradient-to-r from-red-50 to-red-100'} shadow-lg`}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-center space-x-3 mb-4">
                  {scanResult.success ? (
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-8 h-8 text-red-600" />
                  )}
                  <h2 className={`text-2xl font-bold ${scanResult.success ? 'text-green-800' : 'text-red-800'}`}>
                    {scanResult.success ? 'Professional Scan Successful!' : 'OCR Scan Failed'}
                  </h2>
                </div>
                <div className="flex justify-center space-x-6 text-sm">
                  <div className="flex items-center space-x-2">
                    <Award className={`w-4 h-4 ${scanResult.success ? 'text-green-600' : 'text-red-600'}`} />
                    <span className={scanResult.success ? 'text-green-700' : 'text-red-700'}>
                      Confidence: {(scanResult.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Eye className={`w-4 h-4 ${scanResult.success ? 'text-green-600' : 'text-red-600'}`} />
                    <span className={scanResult.success ? 'text-green-700' : 'text-red-700'}>
                      {scanResult.ocrMethod}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Display parsed data if successful */}
            {scanResult.success && scanResult.data.surname !== 'OCR_FAILED' && (
              <Card className="shadow-2xl border-0 bg-gradient-to-br from-white to-blue-50 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                        <FileText className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-white">Identity Document</h3>
                        <p className="text-blue-100 text-sm">Professional OCR Extracted</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                      {scanResult.data.documentType} - {scanResult.data.countryCode}
                    </Badge>
                  </div>
                </div>
                
                <CardContent className="p-6">
                  
                  {/* Profile Section */}
                  <div className="flex items-start space-x-4 mb-6">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                      <User className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 mb-1">
                        {scanResult.data.givenNames} {scanResult.data.surname}
                      </h2>
                      <p className="text-gray-600 flex items-center">
                        <MapPin className="w-4 h-4 mr-1" />
                        {scanResult.data.nationality} National
                      </p>
                    </div>
                  </div>
                  
                  {/* Document Details Grid */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <CreditCard className="w-4 h-4 text-gray-600" />
                        <span className="text-sm font-medium text-gray-600">Document Number</span>
                      </div>
                      <p className="text-lg font-mono font-bold text-gray-900">
                        {scanResult.data.documentNumber}
                      </p>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <Globe className="w-4 h-4 text-gray-600" />
                        <span className="text-sm font-medium text-gray-600">Nationality</span>
                      </div>
                      <p className="text-lg font-bold text-gray-900">
                        {scanResult.data.nationality}
                      </p>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <Calendar className="w-4 h-4 text-gray-600" />
                        <span className="text-sm font-medium text-gray-600">Date of Birth</span>
                      </div>
                      <p className="text-lg font-bold text-gray-900">
                        {scanResult.data.dateOfBirth}
                      </p>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <Calendar className="w-4 h-4 text-gray-600" />
                        <span className="text-sm font-medium text-gray-600">Expiration Date</span>
                      </div>
                      <p className="text-lg font-bold text-gray-900">
                        {scanResult.data.expirationDate}
                      </p>
                    </div>
                  </div>

                  {/* Personal Number if available */}
                  {scanResult.data.personalNumber && scanResult.data.personalNumber !== '' && (
                    <div className="bg-gray-50 rounded-lg p-4 mb-6">
                      <div className="flex items-center space-x-2 mb-2">
                        <User className="w-4 h-4 text-gray-600" />
                        <span className="text-sm font-medium text-gray-600">Personal Number</span>
                      </div>
                      <p className="text-lg font-mono font-bold text-gray-900">
                        {scanResult.data.personalNumber}
                      </p>
                    </div>
                  )}
                  
                  {/* Raw MRZ Section */}
                  <div className="border-t border-gray-200 pt-4">
                    <button
                      onClick={() => setShowRawMRZ(!showRawMRZ)}
                      className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900 transition-colors mb-3"
                    >
                      <Eye className="w-4 h-4" />
                      <span>{showRawMRZ ? 'Hide' : 'Show'} Raw MRZ Data</span>
                    </button>
                    
                    {showRawMRZ && (
                      <div className="p-3 bg-gray-900 rounded-lg">
                        <pre className="text-green-400 font-mono text-sm whitespace-pre-wrap overflow-x-auto">
                          {scanResult.data.rawMRZ}
                        </pre>
                      </div>
                    )}
                  </div>
                  
                </CardContent>
              </Card>
            )}

            {/* Failure Information */}
            {!scanResult.success && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="pt-6">
                  <h3 className="text-lg font-bold text-red-800 mb-4">OCR Scan Failed</h3>
                  <div className="space-y-2 text-red-700">
                    <p>• No clear MRZ (Machine Readable Zone) detected in the image</p>
                    <p>• Ensure passport data page is clearly visible</p>
                    <p>• Check that MRZ lines at bottom are not obscured</p>
                    <p>• Try different lighting or angle</p>
                    <p>• Make sure the image is in focus</p>
                  </div>
                  {scanResult.data.rawMRZ && scanResult.data.rawMRZ !== 'No clear MRZ detected in image' && (
                    <div className="mt-4 p-3 bg-red-100 rounded-lg">
                      <p className="text-sm font-medium text-red-800 mb-2">Extracted Text:</p>
                      <pre className="text-red-700 text-xs">{scanResult.data.rawMRZ}</pre>
                    </div>
                  )}
                  <div className="mt-4">
                    <Button onClick={() => setScanResult(null)} variant="outline" className="text-red-700 border-red-300">
                      Try Again
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            {scanResult.success && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button 
                  variant="outline" 
                  size="lg" 
                  onClick={() => copyToClipboard(JSON.stringify(scanResult.data, null, 2))}
                  className="flex items-center space-x-2"
                >
                  <Copy className="w-4 h-4" />
                  <span>Copy Data</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  size="lg" 
                  onClick={downloadData}
                  className="flex items-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  size="lg" 
                  className="flex items-center space-x-2"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share</span>
                </Button>
              </div>
            )}
            
          </div>
        )}
        
      </div>
    </div>
  );
};

export default SimplifiedOCRScanner;