package com.airportpro.app

// --- SOLUTION: ADD ALL NECESSARY IMPORTS ---
import android.Manifest
import android.content.Intent
import android.graphics.Bitmap
import android.provider.MediaStore
import android.util.Base64
import android.util.Log
import androidx.activity.result.ActivityResult
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityResultCallback
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import java.io.ByteArrayOutputStream
// --- END OF IMPORTS ---

@CapacitorPlugin(
    name = "Passport",
    permissions = [
        Permission(alias = "camera", strings = [Manifest.permission.CAMERA])
    ]
)
class PassportPlugin : Plugin() {

    @PluginMethod
    fun scan(call: PluginCall) {
        // Create a valid Intent to launch the device's camera for image capture
        val cameraIntent = Intent(MediaStore.ACTION_IMAGE_CAPTURE)
        
        // This launches the camera and tells Capacitor to call the 'processCameraImage' function with the result
        startActivityForResult(call, cameraIntent, "processCameraImage")
    }

    @ActivityResultCallback
    private fun processCameraImage(call: PluginCall, result: ActivityResult) {
        if (result.data == null || result.data!!.extras == null) {
            call.reject("User cancelled the camera or no image data was returned.")
            return
        }

        val bitmap = result.data!!.extras!!.get("data") as? Bitmap
        if (bitmap == null) {
            call.reject("Failed to retrieve a valid image from the camera.")
            return
        }

        val image = InputImage.fromBitmap(bitmap, 0)
        val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)

        recognizer.process(image)
            .addOnSuccessListener { visionText ->
                val mrzText = findMrz(visionText.text)
                if (mrzText != null) {
                    val passportData = parseMrz(mrzText)
                    if (passportData != null) {
                        val imageBase64 = bitmapToBase64(bitmap)
                        
                        val ret = JSObject()
                        ret.put("documentNumber", passportData.documentNumber)
                        ret.put("firstName", passportData.firstName)
                        ret.put("lastName", passportData.lastName)
                        ret.put("dateOfBirth", passportData.dateOfBirth)
                        ret.put("dateOfExpiry", passportData.dateOfExpiry)
                        ret.put("nationality", passportData.nationality)
                        ret.put("passportImage", imageBase64)
                        
                        call.resolve(ret)
                    } else {
                        call.reject("MRZ text was found but could not be parsed. Please try again with a clearer image.")
                    }
                } else {
                    call.reject("No Machine-Readable Zone (MRZ) was found. Please ensure the two lines at the bottom of the passport are clearly visible.")
                }
            }
            .addOnFailureListener { e ->
                call.reject("ML Kit text recognition failed.", e)
            }
    }

    private fun bitmapToBase64(bitmap: Bitmap): String {
        val byteArrayOutputStream = ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.JPEG, 90, byteArrayOutputStream)
        val byteArray = byteArrayOutputStream.toByteArray()
        return Base64.encodeToString(byteArray, Base64.DEFAULT)
    }

    private fun findMrz(text: String): String? {
        val lines = text.split("\n")
        // A valid MRZ has at least two lines of 44 characters
        val potentialMrzLines = lines.filter { it.replace(" ", "").replace("<", "").length >= 44 }
        return if (potentialMrzLines.size >= 2) {
            potentialMrzLines.take(2).joinToString("\n")
        } else {
            null
        }
    }
    
    private fun parseMrz(mrzBlock: String): PassportData? {
        try {
            val lines = mrzBlock.split("\n")
            if (lines.size < 2) return null

            val line1 = lines[0].replace(" ", "")
            val line2 = lines[1].replace(" ", "")

            if (line2.length < 44) return null
            
            val documentNumber = line2.substring(0, 9).replace('<', ' ').trim()
            val nationality = line2.substring(10, 13).replace('<', ' ').trim()
            val dateOfBirth = line2.substring(13, 19)
            val dateOfExpiry = line2.substring(21, 27)
            
            val namePart = line1.substring(5, 44)
            val names = namePart.split("<<")
            val lastName = names.getOrNull(0)?.replace("<", " ")?.trim() ?: ""
            val firstName = names.getOrNull(1)?.replace("<", " ")?.trim() ?: ""

            return PassportData(documentNumber, firstName, lastName, dateOfBirth, dateOfExpiry, nationality)
        } catch (e: Exception) {
            Log.e("PassportPlugin", "Error parsing MRZ string: $mrzBlock", e)
            return null
        }
    }
}