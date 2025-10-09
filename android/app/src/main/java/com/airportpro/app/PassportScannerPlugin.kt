package com.airportpro.app

import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.JSObject
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.TextRecognizer
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Matrix
import android.util.Base64
import android.util.Log
import kotlinx.coroutines.*
import java.util.regex.Pattern

@CapacitorPlugin(name = "PassportScannerPlugin")
class PassportScannerPlugin : Plugin() {

    companion object {
        private const val TAG = "PassportScannerPlugin"
        private const val MRZ_LINE_LENGTH = 44
        private const val MIN_CONFIDENCE_SCORE = 0.7f
        private const val MAX_IMAGE_SIZE = 2048
    }

    private lateinit var recognizer: TextRecognizer
    private val pluginScope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    override fun load() {
        // Initialize text recognizer optimized for Latin characters
        recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
        Log.i(TAG, "PassportScannerPlugin initialized with ML Kit Text Recognition")
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

                // Process image with text recognition
                val image = InputImage.fromBitmap(bitmap, 0)
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

                // Apply image preprocessing for better OCR results
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

    private fun decodeAndOptimizeImage(imageData: String): Bitmap? {
        val bitmap = decodeBase64Image(imageData) ?: return null
        
        // Resize if image is too large for optimal processing
        return if (bitmap.width > MAX_IMAGE_SIZE || bitmap.height > MAX_IMAGE_SIZE) {
            resizeBitmap(bitmap, MAX_IMAGE_SIZE)
        } else {
            bitmap
        }
    }

    private fun decodeBase64Image(imageData: String): Bitmap? {
        return try {
            val base64Image = if (imageData.contains(",")) {
                imageData.split(",")[1]
            } else {
                imageData
            }
            
            val decodedBytes = Base64.decode(base64Image, Base64.DEFAULT)
            BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.size)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to decode base64 image", e)
            null
        }
    }

    private fun resizeBitmap(bitmap: Bitmap, maxSize: Int): Bitmap {
        val width = bitmap.width
        val height = bitmap.height
        
        val scale = minOf(maxSize.toFloat() / width, maxSize.toFloat() / height)
        
        val matrix = Matrix()
        matrix.postScale(scale, scale)
        
        return Bitmap.createBitmap(bitmap, 0, 0, width, height, matrix, true)
    }

    private fun enhanceImageForOCR(bitmap: Bitmap): Bitmap {
        // Apply basic image enhancements for better OCR
        // In a production app, you might want more sophisticated image processing
        
        val width = bitmap.width
        val height = bitmap.height
        val pixels = IntArray(width * height)
        
        bitmap.getPixels(pixels, 0, width, 0, 0, width, height)
        
        // Simple contrast enhancement
        for (i in pixels.indices) {
            val pixel = pixels[i]
            val r = (pixel shr 16) and 0xff
            val g = (pixel shr 8) and 0xff
            val b = pixel and 0xff
            
            // Convert to grayscale with weighted average
            val gray = (0.299 * r + 0.587 * g + 0.114 * b).toInt()
            
            // Apply simple thresholding for better text contrast
            val enhanced = if (gray > 128) 255 else 0
            
            pixels[i] = (0xff shl 24) or (enhanced shl 16) or (enhanced shl 8) or enhanced
        }
        
        val enhancedBitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        enhancedBitmap.setPixels(pixels, 0, width, 0, 0, width, height)
        
        return enhancedBitmap
    }

    private fun bitmapToBase64(bitmap: Bitmap): String {
        val outputStream = java.io.ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.JPEG, 90, outputStream)
        val byteArray = outputStream.toByteArray()
        return Base64.encodeToString(byteArray, Base64.NO_WRAP)
    }

    private fun processTextRecognition(image: InputImage, call: PluginCall) {
        recognizer.process(image)
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

    private fun extractMRZFromText(text: String): PassportData? {
        if (text.isBlank()) return null

        // Clean text and split into lines
        val lines = preprocessTextForMRZ(text)
        Log.d(TAG, "Processing ${lines.size} lines for MRZ extraction")

        // Try to find complete MRZ first
        val mrzPair = findCompleteMRZ(lines)
        if (mrzPair != null) {
            return PassportData(mrzPair.first, mrzPair.second)
        }

        // Fallback to partial extraction
        return extractPartialMRZData(lines)
    }

    private fun preprocessTextForMRZ(text: String): List<String> {
        return text
            .replace(Regex("\\s+"), " ")
            .replace(Regex("[^A-Z0-9<\\n\\r ]"), "")
            .split(Regex("\\r?\\n"))
            .map { it.trim().replace(Regex("\\s"), "").uppercase() }
            .filter { it.length > 10 } // Filter out very short lines
    }

    private fun findCompleteMRZ(lines: List<String>): Pair<String, String>? {
        for (i in lines.indices) {
            val line = lines[i]
            
            // Check for passport MRZ first line pattern
            if (isMRZLine1(line)) {
                // Look for corresponding second line
                for (j in i + 1 until minOf(i + 3, lines.size)) {
                    val nextLine = lines[j]
                    if (isMRZLine2(nextLine)) {
                        Log.d(TAG, "Found complete MRZ: Line1=${line}, Line2=${nextLine}")
                        return Pair(line, nextLine)
                    }
                }
            }
        }
        return null
    }

    private fun isMRZLine1(line: String): Boolean {
        // First line: P<COUNTRY<SURNAME<<GIVENNAMES
        return line.matches(Regex("P<[A-Z]{3}<[A-Z<]+")) && 
               line.length >= 40
    }

    private fun isMRZLine2(line: String): Boolean {
        // Second line: DOCNUM+CHECK+COUNTRY+BIRTH+CHECK+SEX+EXP+CHECK+PERSONAL+CHECK
        return line.matches(Regex("[A-Z0-9<]{9}[0-9][A-Z]{3}[0-9]{6}[0-9][MF][0-9]{6}[0-9][A-Z0-9<]{14}[0-9]")) &&
               line.length >= 40
    }

    private fun extractPartialMRZData(lines: List<String>): PassportData? {
        val partialData = PassportData()
        var foundData = false

        for (line in lines) {
            // Extract document number
            if (partialData.documentNumber.isNullOrBlank()) {
                val docNum = extractDocumentNumber(line)
                if (docNum != null) {
                    partialData.documentNumber = docNum
                    foundData = true
                }
            }

            // Extract dates
            val dates = extractDates(line)
            dates.forEach { date ->
                when {
                    partialData.birthDate.isNullOrBlank() && isReasonableBirthDate(date) -> {
                        partialData.birthDate = date
                        foundData = true
                    }
                    partialData.expirationDate.isNullOrBlank() && isReasonableExpiryDate(date) -> {
                        partialData.expirationDate = date
                        foundData = true
                    }
                }
            }

            // Extract country code
            if (partialData.countryCode.isNullOrBlank()) {
                val country = extractCountryCode(line)
                if (country != null) {
                    partialData.countryCode = country
                    foundData = true
                }
            }
        }

        return if (foundData) partialData else null
    }

    private fun extractDocumentNumber(line: String): String? {
        // Look for document number patterns
        val patterns = listOf(
            Pattern.compile("([A-Z]{1,2}[0-9]{6,8})"),
            Pattern.compile("([0-9]{8,9})")
        )

        for (pattern in patterns) {
            val matcher = pattern.matcher(line)
            if (matcher.find()) {
                return matcher.group(1)
            }
        }
        return null
    }

    private fun extractDates(line: String): List<String> {
        val dates = mutableListOf<String>()
        val datePattern = Pattern.compile("([0-9]{6})")
        val matcher = datePattern.matcher(line)
        
        while (matcher.find()) {
            val dateStr = matcher.group(1)
            if (isValidDateFormat(dateStr)) {
                dates.add(dateStr)
            }
        }
        
        return dates
    }

    private fun extractCountryCode(line: String): String? {
        // Look for 3-letter country codes
        val pattern = Pattern.compile("P<([A-Z]{3})")
        val matcher = pattern.matcher(line)
        return if (matcher.find()) matcher.group(1) else null
    }

    private fun isValidDateFormat(dateStr: String): Boolean {
        if (dateStr.length != 6) return false
        
        return try {
            val year = dateStr.substring(0, 2).toInt()
            val month = dateStr.substring(2, 4).toInt()
            val day = dateStr.substring(4, 6).toInt()
            
            month in 1..12 && day in 1..31
        } catch (e: NumberFormatException) {
            false
        }
    }

    private fun isReasonableBirthDate(dateStr: String): Boolean {
        if (!isValidDateFormat(dateStr)) return false
        
        val year = dateStr.substring(0, 2).toInt()
        val currentYear = java.util.Calendar.getInstance().get(java.util.Calendar.YEAR) % 100
        
        // Reasonable birth year range (18-100 years old)
        return when {
            year <= currentYear -> (currentYear - year) in 18..99
            year > currentYear -> (currentYear + 100 - year) in 18..99
            else -> false
        }
    }

    private fun isReasonableExpiryDate(dateStr: String): Boolean {
        if (!isValidDateFormat(dateStr)) return false
        
        val year = dateStr.substring(0, 2).toInt()
        val currentYear = java.util.Calendar.getInstance().get(java.util.Calendar.YEAR) % 100
        
        // Expiry should be in future, within reasonable range (1-15 years)
        return when {
            year >= currentYear -> (year - currentYear) in 0..15
            year < currentYear -> (year + 100 - currentYear) in 0..15
            else -> false
        }
    }

    private fun calculateDataConfidence(data: PassportData): Float {
        val weights = mapOf(
            "documentType" to 0.05f,
            "documentNumber" to 0.25f,
            "countryCode" to 0.15f,
            "surname" to 0.15f,
            "givenNames" to 0.15f,
            "nationality" to 0.10f,
            "birthDate" to 0.05f,
            "gender" to 0.05f,
            "expirationDate" to 0.05f
        )

        var totalConfidence = 0.0f
        
        if (!data.documentType.isNullOrBlank()) totalConfidence += weights["documentType"]!!
        if (!data.documentNumber.isNullOrBlank()) totalConfidence += weights["documentNumber"]!!
        if (!data.countryCode.isNullOrBlank()) totalConfidence += weights["countryCode"]!!
        if (!data.surname.isNullOrBlank()) totalConfidence += weights["surname"]!!
        if (!data.givenNames.isNullOrBlank()) totalConfidence += weights["givenNames"]!!
        if (!data.nationality.isNullOrBlank()) totalConfidence += weights["nationality"]!!
        if (!data.birthDate.isNullOrBlank()) totalConfidence += weights["birthDate"]!!
        if (!data.gender.isNullOrBlank()) totalConfidence += weights["gender"]!!
        if (!data.expirationDate.isNullOrBlank()) totalConfidence += weights["expirationDate"]!!

        return minOf(totalConfidence, 1.0f)
    }

    private fun getScanningTips(): List<String> {
        return listOf(
            "Ensure good lighting without shadows",
            "Keep passport flat and parallel to camera",
            "Include the entire information page",
            "Avoid glare on the page",
            "Make sure MRZ lines at bottom are clearly visible",
            "Hold camera steady while capturing"
        )
    }

    override fun handleOnDestroy() {
        super.handleOnDestroy()
        pluginScope.cancel()
    }

    private data class PassportData(
        var documentType: String? = "P",
        var countryCode: String? = null,
        var surname: String? = null,
        var givenNames: String? = null,
        var documentNumber: String? = null,
        var nationality: String? = null,
        var birthDate: String? = null,
        var gender: String? = null,
        var expirationDate: String? = null,
        var personalNumber: String? = null
    ) {
        
        constructor(line1: String, line2: String) : this() {
            parseMRZLine1(line1)
            parseMRZLine2(line2)
        }

        private fun parseMRZLine1(line: String) {
            if (line.length < 44) return
            
            try {
                documentType = "P"
                countryCode = line.substring(2, 5).replace("<", "")
                
                val namesPart = line.substring(5)
                val names = namesPart.split("<<")
                
                if (names.isNotEmpty()) {
                    surname = names[0].replace("<", " ").trim()
                }
                if (names.size >= 2) {
                    givenNames = names[1].replace("<", " ").trim()
                }
            } catch (e: Exception) {
                Log.w(TAG, "Error parsing MRZ line 1: $line", e)
            }
        }

        private fun parseMRZLine2(line: String) {
            if (line.length < 44) return
            
            try {
                documentNumber = line.substring(0, 9).replace("<", "")
                nationality = line.substring(10, 13)
                birthDate = line.substring(13, 19)
                gender = line.substring(20, 21)
                expirationDate = line.substring(21, 27)
                personalNumber = line.substring(28, 42).replace("<", "")
            } catch (e: Exception) {
                Log.w(TAG, "Error parsing MRZ line 2: $line", e)
            }
        }

        fun toJSObject(): JSObject {
            return JSObject().apply {
                put("documentType", documentType ?: "P")
                put("countryCode", countryCode ?: "")
                put("surname", surname ?: "")
                put("givenNames", givenNames ?: "")
                put("documentNumber", documentNumber ?: "")
                put("nationality", nationality ?: "")
                put("birthDate", birthDate ?: "")
                put("gender", gender ?: "")
                put("expirationDate", expirationDate ?: "")
                put("personalNumber", personalNumber ?: "")
            }
        }

        override fun toString(): String {
            return "PassportData(docType='$documentType', country='$countryCode', " +
                   "surname='$surname', given='$givenNames', docNum='$documentNumber', " +
                   "nationality='$nationality', birth='$birthDate', gender='$gender', exp='$expirationDate')"
        }
    }
}