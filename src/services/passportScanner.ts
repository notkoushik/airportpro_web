// src/services/passportScanner.ts
import PassportScanner from '@/plugins/PassportScanner';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import type { PassportData, ScanResult } from '@/types/passport';

/**
 * Captures passport image with optimal settings for MRZ scanning
 */
export async function capturePassportImage(): Promise<string> {
  try {
    const image = await Camera.getPhoto({
      quality: 100,
      width: 2400,
      height: 1600,
      allowEditing: false,
      source: CameraSource.Camera,
      resultType: CameraResultType.Uri,
      saveToGallery: false,
      correctOrientation: true,
      presentationStyle: 'fullscreen'
    });
    
    console.log('✓ Image captured:', image.path);
    return image.path || image.webPath || '';
    
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error('✗ Camera capture failed:', errorMsg);
    throw new Error(`Camera capture failed: ${errorMsg}`);
  }
}

/**
 * Scans passport using NATIVE ML Kit plugin
 */
export async function scanPassport(
  onProgress?: (progress: number, status: string) => void
): Promise<ScanResult> {
  const startTime = Date.now();
  
  try {
    console.log('=== Starting Native Passport Scan ===');
    onProgress?.(10, 'Preparing camera...');
    
    // Step 1: Capture high-quality image
    console.log('Step 1: Capturing image...');
    const imagePath = await capturePassportImage();
    console.log('✓ Image path:', imagePath);
    
    onProgress?.(30, 'Processing image...');
    
    // Step 2: Check if ML Kit models are ready
    console.log('Step 2: Checking ML Kit models...');
    const { ready } = await PassportScanner.checkModelsReady();
    console.log('✓ ML Kit ready:', ready);
    
    if (!ready) {
      onProgress?.(40, 'Downloading OCR model...');
      console.log('⏳ Waiting for ML Kit model download...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    onProgress?.(60, 'Scanning passport...');
    
    // Step 3: Scan using NATIVE ML Kit plugin
    console.log('Step 3: Calling native PassportScanner.scanFromImage()...');
    console.log('  Image path:', imagePath);
    
    const result = await PassportScanner.scanFromImage({ imagePath });
    console.log('✓ Native scan result:', result);
    
    const processingTime = Date.now() - startTime;
    
    onProgress?.(100, 'Complete!');
    
    if (result.success && result.data) {
      console.log('✓✓✓ SUCCESS: Passport scanned successfully');
      return {
        success: true,
        data: result.data as PassportData,
        image: imagePath,
        processingTime
      };
    } else {
      console.error('✗✗✗ FAILED: Scan unsuccessful');
      console.error('  Error:', result.error);
      return {
        success: false,
        error: result.error || 'Scanning failed',
        image: imagePath,
        processingTime
      };
    }
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);
    
    console.error('✗✗✗ EXCEPTION in scanPassport:');
    console.error('  Error:', errorMsg);
    console.error('  Stack:', error);
    
    return {
      success: false,
      error: `Scanning failed: ${errorMsg}`,
      processingTime
    };
  }
}

/**
 * Alternative: Direct image scan (for testing)
 */
export async function scanPassportFromImage(imagePath: string): Promise<ScanResult> {
  const startTime = Date.now();
  
  try {
    console.log('=== Direct Image Scan ===');
    console.log('Image path:', imagePath);
    
    const result = await PassportScanner.scanFromImage({ imagePath });
    console.log('Native scan result:', result);
    
    const processingTime = Date.now() - startTime;
    
    if (result.success && result.data) {
      return {
        success: true,
        data: result.data as PassportData,
        image: imagePath,
        processingTime
      };
    } else {
      return {
        success: false,
        error: result.error || 'Scanning failed',
        image: imagePath,
        processingTime
      };
    }
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);
    
    return {
      success: false,
      error: `Scanning failed: ${errorMsg}`,
      processingTime
    };
  }
}
