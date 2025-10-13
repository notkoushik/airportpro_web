package com.airportpro.app

import android.Manifest
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import android.util.Base64
import android.util.Log

import java.io.ByteArrayOutputStream

// This is the updated plugin with the real scanning logic
@CapacitorPlugin(
    name = "Passport",
    permissions = [
        Permission(alias = "camera", strings = [Manifest.permission.CAMERA])
    ]
)
class PassportPlugin : Plugin() {

    // We will launch the camera from the plugin itself
    private var call: PluginCall? = null

    @PluginMethod
    fun scan(call: PluginCall) {
        this.call = call
        // For now, we will just simulate a successful scan with mock data
        // In the next step, we will replace this with the actual camera launch
        Log.d("PassportPlugin", "Scan method called. Returning mock data for now.")
        
        try {
            // This is where you would launch a new Activity or a camera view
            // For simplicity in this step, let's just parse a mock MRZ string
            val mockMrzText = "P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<<L898902C<3UTO6908061F9406236ZE184226B<<<<<10"
            val passportData = parseMrz(mockMrzText)

            if (passportData != null) {
                val ret = JSObject()
                ret.put("documentNumber", passportData.documentNumber)
                ret.put("firstName", passportData.firstName)
                ret.put("lastName", passportData.lastName)
                ret.put("dateOfBirth", passportData.dateOfBirth)
                ret.put("dateOfExpiry", passportData.dateOfExpiry)
                ret.put("nationality", passportData.nationality)
                call.resolve(ret)
            } else {
                call.reject("Failed to parse MRZ data.")
            }

        } catch (e: Exception) {
            call.reject("An error occurred during scanning: ${e.message}")
        }
    }

    // This is the core parsing logic transplanted from PassportRepository.kt
    private fun parseMrz(text: String): PassportData? {
        // Simplified parser based on the logic in the passport_scanner project
        val mrzLines = text.split("\n").filter { it.length > 40 } // Find lines that look like MRZ
        if (mrzLines.isEmpty()) return null

        val mrz = mrzLines.joinToString("")

        try {
            val documentNumber = mrz.substring(0, 9)
            val nationality = mrz.substring(10, 13)
            val dateOfBirth = mrz.substring(13, 19)
            val dateOfExpiry = mrz.substring(21, 27)
            
            val names = mrz.substring(5, 44).split("<<")
            val lastName = names.getOrNull(0)?.replace("<", " ")?.trim() ?: ""
            val firstName = names.getOrNull(1)?.replace("<", " ")?.trim() ?: ""

            return PassportData(
                documentNumber = documentNumber,
                firstName = firstName,
                lastName = lastName,
                dateOfBirth = dateOfBirth,
                dateOfExpiry = dateOfExpiry,
                nationality = nationality
            )
        } catch (e: Exception) {
            Log.e("PassportPlugin", "Error parsing MRZ string", e)
            return null
        }
    }
}