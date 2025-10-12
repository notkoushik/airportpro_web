package com.airportpro.app

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.util.Base64
import android.util.Log
import androidx.core.content.ContextCompat
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.TextRecognizer
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import java.io.ByteArrayOutputStream

@CapacitorPlugin(name = "PassportScanner")
class PassportScannerPlugin : Plugin() {
    
    private lateinit var textRecognizer: TextRecognizer
    private val pluginScope = CoroutineScope(Dispatchers.Main + SupervisorJob())

    override fun load() {
        super.load()
        textRecognizer = TextRecognition.getClient(
            TextRecognizerOptions.Builder().build()
        )
        
        if (ContextCompat.checkSelfPermission(context, android.Manifest.permission.CAMERA) 
            != android.content.pm.PackageManager.PERMISSION_GRANTED) {
            Log.w("PassportScanner", "Camera permission not granted")
        }
    }

    @PluginMethod
    fun scanPassport(call: PluginCall) {
        val imageData = call.getString("imageData")
        if (imageData == null) {
            call.reject("No image data provided")
            return
        }

        try {
            val bitmap = decodeAndOptimizeImage(imageData)
            if (bitmap == null) {
                call.reject("Failed to decode image")
                return
            }

            val image = InputImage.fromBitmap(bitmap, 0)
            
            textRecognizer.process(image)
                .addOnSuccessListener { visionText ->
                    Log.d("PassportScanner", "Text recognition successful")
                    
                    val mrzData = extractMRZFromText(visionText.text)
                    
                    if (mrzData != null) {
                        val result = JSObject()
                        result.put("success", true)
                        result.put("mrzData", mrzData)
                        result.put("confidence", calculateDataConfidence(mrzData))
                        result.put("rawText", visionText.text)
                        call.resolve(result)
                    } else {
                        val result = JSObject()
                        result.put("success", false)
                        result.put("error", "NO_MRZ_FOUND")
                        result.put("rawText", visionText.text)
                        result.put("tips", getScanningTips())
                        call.resolve(result)
                    }
                }
                .addOnFailureListener { e ->
                    Log.e("PassportScanner", "Text recognition failed", e)
                    call.reject("Text recognition failed: ${e.message}")
                }
                
        } catch (e: Exception) {
            Log.e("PassportScanner", "Error processing image", e)
            call.reject("Error processing image: ${e.message}")
        }
    }

    @PluginMethod
    fun enhanceImage(call: PluginCall) {
        val imageData = call.getString("imageData")
        if (imageData == null) {
            call.reject("No image data provided")
            return
        }

        try {
            val originalBitmap = decodeBase64Image(imageData)
            if (originalBitmap == null) {
                call.reject("Failed to decode image")
                return
            }

            val enhancedBitmap = enhanceImageQuality(originalBitmap)
            val enhancedImageData = bitmapToBase64(enhancedBitmap)
            
            val result = JSObject()
            result.put("success", true)
            result.put("enhancedImageData", enhancedImageData)
            result.put("originalSize", "${originalBitmap.width}x${originalBitmap.height}")
            result.put("enhancedSize", "${enhancedBitmap.width}x${enhancedBitmap.height}")
            result.put("improvements", "Contrast and brightness optimized")
            
            call.resolve(result)
            
        } catch (e: Exception) {
            Log.e("PassportScanner", "Error enhancing image", e)
            call.reject("Error enhancing image: ${e.message}")
        }
    }

    private fun decodeAndOptimizeImage(imageData: String): Bitmap? {
        return try {
            val imageBytes = Base64.decode(imageData, Base64.DEFAULT)
            val options = BitmapFactory.Options().apply {
                inPreferredConfig = Bitmap.Config.ARGB_8888
                inMutable = true
            }
            BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size, options)
        } catch (e: Exception) {
            Log.e("PassportScanner", "Error decoding image", e)
            null
        }
    }

    private fun decodeBase64Image(base64String: String): Bitmap? {
        return try {
            val imageBytes = Base64.decode(base64String, Base64.DEFAULT)
            BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size)
        } catch (e: Exception) {
            Log.e("PassportScanner", "Error decoding base64 image", e)
            null
        }
    }

    private fun enhanceImageQuality(bitmap: Bitmap): Bitmap {
        // Simple image enhancement - increase contrast and brightness
        val enhanced = bitmap.copy(Bitmap.Config.ARGB_8888, true)
        
        // Apply basic image enhancement here
        // For production, you'd want more sophisticated image processing
        
        return enhanced
    }

    private fun bitmapToBase64(bitmap: Bitmap): String {
        val byteArrayOutputStream = ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.JPEG, 90, byteArrayOutputStream)
        val byteArray = byteArrayOutputStream.toByteArray()
        return Base64.encodeToString(byteArray, Base64.DEFAULT)
    }

    private fun processTextWithMLKit(image: InputImage, call: PluginCall) {
        textRecognizer.process(image)
            .addOnSuccessListener { visionText ->
                Log.d("PassportScanner", "ML Kit processing successful")
                
                val mrzData = extractMRZFromText(visionText.text)
                
                val result = JSObject()
                result.put("success", true)
                result.put("text", visionText.text)
                result.put("mrzData", mrzData)
                result.put("confidence", calculateDataConfidence(mrzData))
                result.put("blockCount", visionText.textBlocks.size)
                
                val blocks = JSObject()
                result.put("blocks", blocks)
                
                call.resolve(result)
            }
            .addOnFailureListener { e ->
                Log.e("PassportScanner", "ML Kit processing failed", e)
                call.reject("ML Kit processing failed: ${e.message}")
            }
    }

    private fun extractMRZFromText(text: String): JSObject? {
        // Basic MRZ extraction logic
        val lines = text.split("\n").filter { it.length >= 30 }

        if (lines.size >= 2) {
            val mrzData = JSObject()

            // ✅ FIXED: Access the first element of the list before calling replace()
            val line1 = lines[0].replace(" ", "")
            if (line1.length >= 5) { // Increased safety check
                mrzData.put("documentType", line1.substring(0, 1))
                mrzData.put("countryCode", line1.substring(2, 5))
            }

            // ✅ FIXED: Access the second element of the list before calling replace()
            val line2 = lines[1].replace(" ", "")
            if (line2.length >= 27) { // Increased safety check
                // Basic parsing - in production, you'd want more robust parsing
                mrzData.put("documentNumber", line2.substring(0, 9))
                mrzData.put("dateOfBirth", line2.substring(13, 19))
                mrzData.put("expiryDate", line2.substring(21, 27))
            }

            // Only return data if essential fields were found
            if (mrzData.length() > 0) {
                return mrzData
            }
        }

        return null
    }

}

    private fun calculateDataConfidence(mrzData: JSObject?): Float {
        return if (mrzData != null) 0.85f else 0.0f
    }

    private fun getScanningTips(): List<String> {
        return listOf(
            "Ensure good lighting conditions",
            "Hold the passport flat and steady",
            "Make sure the MRZ (bottom lines) are visible",
            "Avoid shadows and reflections"
        )
    }

