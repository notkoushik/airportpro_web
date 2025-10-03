package com.airportpro.app

import android.content.Context
import android.graphics.Bitmap
import android.util.Log
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import java.util.regex.Pattern

class MRZScannerService(private val context: Context) {

    companion object {
        private const val TAG = "MRZScanner"

        // MRZ patterns for different document types
        private val MRZ_PATTERN_TD1 = Pattern.compile(
            "^[A-Z0-9<]{30}\\n[0-9]{6}[MF][0-9]{7}[A-Z0-9<]{3}[0-9]{6}[A-Z0-9<]{11}[0-9]$"
        )
        private val MRZ_PATTERN_TD3 = Pattern.compile(
            "^P[A-Z0-9<][A-Z0-9<]{3}[A-Z0-9<]{39}\\n[A-Z0-9<]{9}[0-9][A-Z0-9<]{3}[0-9]{6}[MF][0-9]{6}[A-Z0-9<]{14}[0-9]$"
        )
    }

    data class MRZData(
        val documentType: String,
        val countryCode: String,
        val documentNumber: String,
        val dateOfBirth: String,
        val dateOfExpiry: String,
        val sex: String,
        val nationality: String,
        val surname: String,
        val givenNames: String,
        val rawMRZ: String
    )

    fun scanMRZFromBitmap(bitmap: Bitmap, callback: (MRZData?) -> Unit) {
        val image = InputImage.fromBitmap(bitmap, 0)
        val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)

        recognizer.process(image)
            .addOnSuccessListener { visionText ->
                val mrzText = visionText.text
                Log.d(TAG, "Recognized text: $mrzText")

                val mrzData = parseMRZ(mrzText)
                callback(mrzData)
            }
            .addOnFailureListener { e ->
                Log.e(TAG, "Text recognition failed: ${e.message}")
                callback(null)
            }
    }

    private fun parseMRZ(text: String): MRZData? {
        val lines = text.split("\n").filter { it.length > 20 }

        if (lines.size < 2) return null

        return try {
            when {
                lines.length == 30 && lines.length >= 30 -> parseTD1(lines)
                lines.length >= 44 && lines.length >= 44 -> parseTD3(lines)
                else -> null
            }
        } catch (e: Exception) {
            Log.e(TAG, "MRZ parsing failed: ${e.message}")
            null
        }
    }

    private fun parseTD3(lines: List<String>): MRZData? {
        if (lines.size < 2) return null

        val line1 = lines.replace(' ', '<')
        val line2 = lines.replace(' ', '<')

        return MRZData(
            documentType = line1.substring(0, 1),
            countryCode = line1.substring(2, 5).replace('<', ' ').trim(),
            documentNumber = line2.substring(0, 9).replace('<', ' ').trim(),
            dateOfBirth = line2.substring(13, 19),
            dateOfExpiry = line2.substring(21, 27),
            sex = line2.substring(20, 21),
            nationality = line2.substring(10, 13).replace('<', ' ').trim(),
            surname = line1.substring(5, line1.indexOf("<<")).replace('<', ' ').trim(),
            givenNames = line1.substring(line1.indexOf("<<") + 2).replace('<', ' ').trim(),
            rawMRZ = "$line1\n$line2"
        )
    }

    private fun parseTD1(lines: List<String>): MRZData? {
        // Implementation for ID cards (TD1 format)
        if (lines.size < 3) return null

        // Simplified TD1 parsing
        return MRZData(
            documentType = "ID",
            countryCode = lines.substring(2, 5).replace('<', ' ').trim(),
            documentNumber = lines.substring(5, 14).replace('<', ' ').trim(),
            dateOfBirth = lines.substring(0, 6),
            dateOfExpiry = lines.substring(8, 14),
            sex = lines.substring(7, 8),
            nationality = lines.substring(2, 5).replace('<', ' ').trim(),
            surname = "N/A", // TD1 format varies
            givenNames = "N/A",
            rawMRZ = lines.joinToString("\n")
        )
    }
}
