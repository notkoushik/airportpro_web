// android/app/src/main/java/com/airportpro/app/PassportScannerPlugin.kt
@CapacitorPlugin(name = "PassportScannerPlugin")
class PassportScannerPlugin : Plugin() {
    
    private lateinit var recognizer: TextRecognizer
    private val pluginScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    
    companion object {
        private const val TAG = "PassportScannerPlugin"
        private const val MAX_IMAGE_SIZE = 2048
        private const val MIN_CONFIDENCE_SCORE = 0.7f
    }
    
    override fun load() {
        // Initialize with optimized settings for passport MRZ
        recognizer = TextRecognition.getClient(
            TextRecognizerOptions.Builder()
                .setExecutor(ContextCompat.getMainExecutor(context))
                .build()
        )
        Log.i(TAG, "PassportScannerPlugin initialized with enhanced ML Kit")
    }
    
    @PluginMethod
    fun scanPassportMRZ(call: PluginCall) {
        val imageData = call.getString("imageData")
        if (imageData.isNullOrBlank()) {
            call.reject("No image data provided")
            return
        }
        
        pluginScope.launch {
            try {
                val bitmap = decodeAndOptimizeImage(imageData)
                if (bitmap == null) {
                    call.reject("Failed to decode image - Invalid format or too large")
                    return@launch
                }
                
                // Enhanced preprocessing for better OCR
                val enhancedBitmap = enhanceImageForOCR(bitmap)
                val image = InputImage.fromBitmap(enhancedBitmap, 0)
                
                processTextRecognition(image, call)
            } catch (e: Exception) {
                Log.e(TAG, "Error processing passport scan", e)
                call.reject("Error processing passport: ${e.localizedMessage}")
            }
        }
    }
    
    @PluginMethod
    fun preprocessImage(call: PluginCall) {
        val imageData = call.getString("imageData")
        if (imageData.isNullOrBlank()) {
            call.reject("No image data provided")
            return
        }
        
        pluginScope.launch {
            try {
                val originalBitmap = decodeBase64Image(imageData)
                if (originalBitmap == null) {
                    call.reject("Failed to decode image")
                    return@launch
                }
                
                // Apply advanced image preprocessing
                val enhancedBitmap = enhanceImageForOCR(originalBitmap)
                val enhancedBase64 = bitmapToBase64(enhancedBitmap)
                
                val result = JSObject().apply {
                    put("success", true)
                    put("processedImage", enhancedBase64)
                    put("originalWidth", originalBitmap.width)
                    put("originalHeight", originalBitmap.height)
                    put("processedWidth", enhancedBitmap.width)
                    put("processedHeight", enhancedBitmap.height)
                }
                
                call.resolve(result)
            } catch (e: Exception) {
                Log.e(TAG, "Error preprocessing image", e)
                call.reject("Error preprocessing image: ${e.localizedMessage}")
            }
        }
    }
    
    private fun enhanceImageForOCR(bitmap: Bitmap): Bitmap {
        val width = bitmap.width
        val height = bitmap.height
        val pixels = IntArray(width * height)
        bitmap.getPixels(pixels, 0, width, 0, 0, width, height)
        
        // Advanced image enhancement for better OCR
        for (i in pixels.indices) {
            val pixel = pixels[i]
            val r = (pixel shr 16) and 0xff
            val g = (pixel shr 8) and 0xff
            val b = pixel and 0xff
            
            // Convert to grayscale with weighted average
            val gray = (0.299 * r + 0.587 * g + 0.114 * b).toInt()
            
            // Apply adaptive thresholding for better text contrast
            val enhanced = if (gray > 128) 255 else 0
            pixels[i] = (0xff shl 24) or (enhanced shl 16) or (enhanced shl 8) or enhanced
        }
        
        val enhancedBitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        enhancedBitmap.setPixels(pixels, 0, width, 0, 0, width, height)
        
        return enhancedBitmap
    }
    
    private fun processTextRecognition(image: InputImage, call: PluginCall) {
        recognizer.processImage(image)
            .addOnSuccessListener { visionText ->
                try {
                    val recognizedText = visionText.text
                    Log.d(TAG, "Recognized ${recognizedText.length} characters")
                    
                    // Parse MRZ from recognized text
                    val passportData = extractMRZFromText(recognizedText)
                    
                    val result = if (passportData != null) {
                        JSObject().apply {
                            put("success", true)
                            put("data", passportData.toJSObject())
                            put("confidence", calculateDataConfidence(passportData))
                            put("rawText", recognizedText)
                            put("processingTime", System.currentTimeMillis())
                        }
                    } else {
                        JSObject().apply {
                            put("success", false)
                            put("error", "Could not extract valid MRZ data from image")
                            put("rawText", recognizedText)
                            put("suggestions", getScanningTips())
                        }
                    }
                    
                    call.resolve(result)
                } catch (e: Exception) {
                    Log.e(TAG, "Error processing text recognition result", e)
                    call.reject("Error processing text: ${e.localizedMessage}")
                }
            }
            .addOnFailureListener { exception ->
                Log.e(TAG, "ML Kit text recognition failed", exception)
                call.reject("Text recognition failed: ${exception.localizedMessage}")
            }
    }
    
    // ... Additional methods for MRZ parsing, validation, etc.
    // [Include the complete MRZ parsing logic from the file analysis]
}
