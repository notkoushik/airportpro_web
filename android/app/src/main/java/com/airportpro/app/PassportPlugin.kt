package com.airportpro.app

import android.graphics.Bitmap
import android.graphics.BitmapFactory  
import android.util.Base64
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.JSObject

// Fixed imports for ML Kit
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.TextRecognizer
import com.google.mlkit.vision.text.latin.TextRecognizerOptions

@CapacitorPlugin(name = "PassportPlugin")
class PassportPlugin : Plugin() {

    private lateinit var textRecognizer: TextRecognizer

    override fun load() {
        super.load()
        
        // Initialize text recognizer
        textRecognizer = TextRecognition.getClient(
            TextRecognizerOptions.Builder().build()
        )
    }

    @PluginMethod
    fun scanDocument(call: PluginCall) {
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
            val image = InputImage.fromBitmap(bitmap, 0)
            processTextWithMLKit(image, call)

        } catch (e: Exception) {
            call.reject("Error scanning document: ${e.message}")
        }
    }

    @PluginMethod
    fun extractMRZ(call: PluginCall) {
        val text = call.getString("text")
        if (text == null) {
            call.reject("Missing text data")
            return
        }

        try {
            val mrzData = extractMRZFromText(text)
            if (mrzData != null) {
                call.resolve(mrzData)
            } else {
                call.reject("Could not extract MRZ data")
            }
        } catch (e: Exception) {
            call.reject("Error extracting MRZ: ${e.message}")
        }
    }

    @PluginMethod
    fun validateDocument(call: PluginCall) {
        val documentData = call.getObject("documentData")
        if (documentData == null) {
            call.reject("Missing document data")
            return
        }

        try {
            val isValid = validateDocumentData(documentData)
            val result = JSObject()
            result.put("isValid", isValid)
            result.put("validationMessage", if (isValid) "Document is valid" else "Document validation failed")
            call.resolve(result)
        } catch (e: Exception) {
            call.reject("Error validating document: ${e.message}")
        }
    }

    private fun processTextWithMLKit(image: InputImage, call: PluginCall) {
        textRecognizer.process(image)
            .addOnSuccessListener { visionText ->
                val recognizedText = visionText.text
                val result = JSObject()
                result.put("success", true)
                result.put("text", recognizedText)
                result.put("blocks", extractTextBlocks(visionText))
                call.resolve(result)
            }
            .addOnFailureListener { e ->
                call.reject("Text recognition failed: ${e.message}")
            }
    }

    private fun extractTextBlocks(visionText: com.google.mlkit.vision.text.Text): JSArray {
        val blocks = JSArray()
        
        for (block in visionText.textBlocks) {
            val blockObj = JSObject()
            blockObj.put("text", block.text)
            blockObj.put("boundingBox", block.boundingBox?.let { 
                val bounds = JSObject()
                bounds.put("left", it.left)
                bounds.put("top", it.top)
                bounds.put("right", it.right)
                bounds.put("bottom", it.bottom)
                bounds
            })
            blocks.put(blockObj)
        }
        
        return blocks
    }

    private fun extractMRZFromText(text: String): JSObject? {
        val lines = text.split('\n').filter { line ->
            line.length >= 30 && line.all { it.isUpperCase() || it.isDigit() || it == '<' }
        }

        if (lines.size < 2) {
            return null
        }

        return try {
            val line1 = lines[0].take(44)
            val line2 = lines[1].take(44)
            
            val result = JSObject()
            
            // Parse first line
            val documentType = line1.substring(0, 1)
            val issuingCountry = line1.substring(2, 5)
            result.put("documentType", documentType)
            result.put("issuingCountry", issuingCountry)
            
            // Parse second line  
            val passportNumber = line2.substring(0, 9).replace("<", "")
            val nationality = line2.substring(10, 13)
            val birthDate = line2.substring(13, 19)
            val gender = line2.substring(20, 21)
            val expiryDate = line2.substring(21, 27)
            
            result.put("passportNumber", passportNumber)
            result.put("nationality", nationality)
            result.put("birthDate", birthDate)
            result.put("gender", gender)
            result.put("expiryDate", expiryDate)
            
            result
        } catch (e: Exception) {
            null
        }
    }

    private fun validateDocumentData(documentData: JSObject): Boolean {
        // Basic validation logic
        val requiredFields = listOf("passportNumber", "nationality", "birthDate", "expiryDate")
        
        for (field in requiredFields) {
            if (!documentData.has(field) || documentData.getString(field).isNullOrBlank()) {
                return false
            }
        }
        
        // Additional validation can be added here
        return true
    }

    override fun handleOnDestroy() {
        super.handleOnDestroy()
        // Clean up resources
    }
}