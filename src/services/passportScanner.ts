// src/services/passportScanner.ts

import PassportScanner from '@/plugins/PassportScanner';
// The import for '@capacitor/camera' has been removed.
import type { PassportData, ScanResult } from '@/types/passport';

/**
 * The 'capturePassportImage' function has been completely deleted 
 * as per the remediation plan. The new native plugin will 
 * manage its own camera session.
 */

/**
 * Scans passport using NATIVE ML Kit plugin.
 * This function is updated to call the new 'scanPassport' native method
 * which handles the entire camera UI and live-stream analysis.
 */
export async function scanPassport(
  // The 'onProgress' callback is removed, as the new native 
  // Activity will provide its own UI and feedback.
): Promise<ScanResult> {
  const startTime = Date.now();

  try {
    console.log('=== Starting Native Passport Scan ===');

    // Step 1: Call the new, all-in-one native scanner method.
    // This single call replaces the old flow of:
    // 1. capturePassportImage()
    // 2. checkModelsReady()
    // 3. scanFromImage()
    console.log('Step 1: Calling native PassportScanner.scanPassport()...');

    const result = await PassportScanner.scanPassport(); // This is the new plugin method
    console.log('✓ Native scan result:', result);

    const processingTime = Date.now() - startTime;

    if (result.success && result.data) {
      console.log('✓✓✓ SUCCESS: Passport scanned successfully');
      return {
        success: true,
        data: result.data as PassportData,
        // 'image' field is removed from the successful result,
        // as the web layer no longer has access to the image path.
        processingTime
      };
    } else {
      console.error('✗✗✗ FAILED: Scan unsuccessful');
      console.error('  Error:', result.error);
      return {
        success: false,
        error: result.error || 'Scanning failed',
        // 'image' field is removed from the error result.
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
 *
 * WARNING: This function uses the old 'scanFromImage' method.
 * As per the remediation plan, the native 'scanFromImage' method 
 * in 'PassportScannerPlugin.java' will be removed.
 * This function will stop working once you complete the native-side changes.
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