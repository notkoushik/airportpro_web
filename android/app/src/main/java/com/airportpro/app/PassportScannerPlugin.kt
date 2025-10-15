package com.airportpro.app

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.util.Base64
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

// Fixed imports for ML Kit
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions

@CapacitorPlugin(name = "PassportScannerPlugin")
class PassportScannerPlugin : Plugin() {

    @PluginMethod
    fun scanPassportMRZ(call: PluginCall) {
        val base64Image = call.getString("imageData")
        if (base64Image == null) {
            call.reject("Missing image data")
            return
        }

        try {
            // Decode base64 image
            val decodedBytes = Base64.decode(base64Image, Base64.DEFAULT)
            val bitmap = BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.size)
            
            if (bitmap == null) {
                call.reject("Failed to decode image")
                return
            }

            // Process with ML Kit
            processImageWithMLKit(bitmap, call)

        } catch (e: Exception) {
            call.reject("Error processing image: ${e.message}")
        }
    }

    @PluginMethod
    fun preprocessImage(call: PluginCall) {
        // Image preprocessing implementation
        val base64Image = call.getString("imageData")
        if (base64Image == null) {
            call.reject("Missing image data")
            return
        }

        try {
            // Basic preprocessing - can be enhanced
            val decodedBytes = Base64.decode(base64Image, Base64.DEFAULT)
            val bitmap = BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.size)
            
            // Return preprocessed image
            val processedBase64 = bitmapToBase64(bitmap)
            val result = JSObject()
            result.put("processedImage", processedBase64)
            call.resolve(result)
            
        } catch (e: Exception) {
            call.reject("Error preprocessing image: ${e.message}")
        }
    }

    private fun processImageWithMLKit(bitmap: Bitmap, call: PluginCall) {
        val image = InputImage.fromBitmap(bitmap, 0)
        val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)

        recognizer.process(image)
            .addOnSuccessListener { visionText ->
                val recognizedText = visionText.text
                val mrzData = parseMRZ(recognizedText)
                
                if (mrzData != null) {
                    val result = JSObject()
                    result.put("success", true)
                    result.put("mrz", mrzData)
                    result.put("rawText", recognizedText)
                    call.resolve(result)
                } else {
                    call.reject("Could not parse MRZ data")
                }
            }
            .addOnFailureListener { e ->
                call.reject("ML Kit text recognition failed: ${e.message}")
            }
    }

    private fun parseMRZ(text: String): JSObject? {
        try {
            val lines = text.split('\n').filter { it.trim().length >= 30 }
            
            if (lines.size < 2) {
                return null
            }

            // Parse MRZ lines (simplified version)
            val line1 = lines[0].replace(" ", "").take(44)
            val line2 = lines[1].replace(" ", "").take(44)

            if (line1.length < 44 || line2.length < 44) {
                return null
            }

            val result = JSObject()
            
            // Parse line 1: P<COUNTRY<<SURNAME<<GIVEN_NAMES<<<<<<<
            val documentType = line1.substring(0, 1)
            val issuingCountry = line1.substring(2, 5)
            val nameSection = line1.substring(5)
            val names = nameSection.split("<<")
            
            result.put("documentType", documentType)
            result.put("issuingCountry", issuingCountry)
            if (names.isNotEmpty()) result.put("surname", names[0].replace("<", " ").trim())
            if (names.size > 1) result.put("givenNames", names[1].replace("<", " ").trim())

            // Parse line 2: DOCNUM<COUNTRY<BIRTHDATE<GENDER<EXPIRY<PERSONAL<<<CHECKSUM
            val passportNumber = line2.substring(0, 9).replace("<", "")
            val nationality = line2.substring(10, 13)
            val birthDate = line2.substring(13, 19)
            val gender = line2.substring(20, 21)
            val expiryDate = line2.substring(21, 27)
            
            result.put("passportNumber", passportNumber)
            result.put("nationality", nationality)
            result.put("birthDate", formatDate(birthDate))
            result.put("gender", gender)
            result.put("expiryDate", formatDate(expiryDate))

            return result
            
        } catch (e: Exception) {
            return null
        }
    }

    private fun formatDate(mrzDate: String): String {
        return if (mrzDate.length == 6) {
            val year = "20" + mrzDate.substring(0, 2)
            val month = mrzDate.substring(2, 4)
            val day = mrzDate.substring(4, 6)
            "$year-$month-$day"
        } else {
            mrzDate
        }
    }

    private fun bitmapToBase64(bitmap: Bitmap): String {
        val outputStream = java.io.ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.PNG, 100, outputStream)
        val byteArray = outputStream.toByteArray()
        return Base64.encodeToString(byteArray, Base64.DEFAULT)
    }
}