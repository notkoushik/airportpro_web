package com.airportpro.app

import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.JSObject
import android.nfc.NfcAdapter
import android.nfc.Tag
import android.nfc.tech.IsoDep
import android.util.Log
import kotlinx.coroutines.*
import java.io.IOException

@CapacitorPlugin(name = "NFCPassportReaderPlugin")
class NFCPassportReaderPlugin : Plugin() {

    companion object {
        private const val TAG = "NFCPassportReaderPlugin"
        private const val NFC_TIMEOUT = 30000L // 30 seconds
        private const val MAX_RETRY_ATTEMPTS = 3
    }

    private var nfcAdapter: NfcAdapter? = null
    private val pluginScope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    override fun load() {
        // Initialize NFC adapter
        nfcAdapter = NfcAdapter.getDefaultAdapter(context)
        Log.i(TAG, "NFCPassportReaderPlugin initialized")
    }

    @PluginMethod
    fun checkNFCSupport(call: PluginCall) {
        try {
            val result = JSObject().apply {
                put("supported", nfcAdapter != null)
                put("enabled", nfcAdapter?.isEnabled == true)
                put("available", nfcAdapter != null && nfcAdapter?.isEnabled == true)
                put("deviceInfo", android.os.Build.MODEL)
            }
            
            Log.d(TAG, "NFC Support Status: $result")
            call.resolve(result)
        } catch (e: Exception) {
            Log.e(TAG, "Error checking NFC support", e)
            call.reject("NFC support check failed: ${e.localizedMessage}")
        }
    }

    @PluginMethod 
    fun readNFCPassport(call: PluginCall) {
        val documentNumber = call.getString("documentNumber")
        val dateOfBirth = call.getString("dateOfBirth") 
        val dateOfExpiry = call.getString("dateOfExpiry")

        if (documentNumber.isNullOrBlank() || dateOfBirth.isNullOrBlank() || dateOfExpiry.isNullOrBlank()) {
            call.reject("Missing required MRZ data for NFC authentication")
            return
        }

        if (nfcAdapter?.isEnabled != true) {
            call.reject("NFC is not enabled on this device")
            return
        }

        // For Phase 3 implementation - currently returns mock data
        pluginScope.launch {
            try {
                // Simulate NFC reading process
                delay(2000) // Simulate connection time
                
                val mockNFCData = createMockNFCData(documentNumber, dateOfBirth, dateOfExpiry)
                
                val result = JSObject().apply {
                    put("success", true)
                    put("data", mockNFCData)
                    put("readingTime", 2000)
                    put("timestamp", System.currentTimeMillis())
                }
                
                call.resolve(result)
                
            } catch (e: Exception) {
                Log.e(TAG, "Error during NFC passport reading", e)
                call.reject("NFC reading failed: ${e.localizedMessage}")
            }
        }
    }

    @PluginMethod
    fun enableNFCReading(call: PluginCall) {
        try {
            if (nfcAdapter == null) {
                call.reject("NFC not supported on this device")
                return
            }
            
            if (!nfcAdapter!!.isEnabled) {
                call.reject("NFC is disabled - Please enable NFC in settings")
                return
            }

            // NFC is ready for passport detection
            val result = JSObject().apply {
                put("enabled", true)
                put("status", "Ready for passport detection")
                put("instructions", "Place passport on back of device")
            }
            
            call.resolve(result)
            
        } catch (e: Exception) {
            Log.e(TAG, "Error enabling NFC reading", e)
            call.reject("Failed to enable NFC reading: ${e.localizedMessage}")
        }
    }

    // This method will be called from MainActivity when NFC tag is detected
    fun handleNFCTagDetected(tag: Tag, mrzData: Map<String, String>): Boolean {
        try {
            val isoDep = IsoDep.get(tag)
            if (isoDep == null) {
                Log.w(TAG, "NFC tag is not a passport chip (IsoDep)")
                return false
            }

            Log.i(TAG, "Passport chip detected, processing...")
            
            // Notify React layer about NFC detection
            notifyListeners("nfcPassportDetected", JSObject().apply {
                put("detected", true)
                put("tagId", tag.id.joinToString(":") { "%02x".format(it) })
                put("timestamp", System.currentTimeMillis())
            })
            
            return true
            
        } catch (e: Exception) {
            Log.e(TAG, "Error handling NFC tag", e)
            return false
        }
    }

    private fun createMockNFCData(docNum: String, birthDate: String, expiryDate: String): JSObject {
        // Mock data for development - replace with actual NFC reading in Phase 3
        return JSObject().apply {
            put("basicInfo", JSObject().apply {
                put("documentType", "P")
                put("issuingCountry", "USA")
                put("documentNumber", docNum)
                put("surname", "TRAVELER")
                put("givenNames", "JOHN DOE")
                put("nationality", "USA") 
                put("dateOfBirth", birthDate)
                put("gender", "M")
                put("dateOfExpiry", expiryDate)
            })
            
            put("digitalSignature", JSObject().apply {
                put("verified", true)
                put("signerCountry", "USA")
                put("algorithm", "RSA-2048")
            })
            
            put("securityFeatures", JSObject().apply {
                put("chipAuthenticated", true)
                put("documentSigned", true)
                put("biometricMatched", true)
            })
            
            put("readingMetadata", JSObject().apply {
                put("readingTime", System.currentTimeMillis())
                put("dataGroups", listOf("DG1", "DG2", "DG14", "DG15"))
                put("bac", true) // Basic Access Control
                put("pace", false) // Password Authenticated Connection Establishment
            })
        }
    }

    // Utility method for future Phase 3 implementation
    private fun authenticateChip(isoDep: IsoDep, docNum: String, birthDate: String, expiryDate: String): Boolean {
        // Phase 3: Implement Basic Access Control (BAC) authentication
        // This is a complex process involving:
        // 1. Derive keys from MRZ data
        // 2. Establish secure channel with passport chip
        // 3. Authenticate and read protected data groups
        
        return try {
            isoDep.connect()
            // BAC implementation would go here
            true
        } catch (e: IOException) {
            Log.e(TAG, "Failed to authenticate with passport chip", e)
            false
        } finally {
            try {
                isoDep.close()
            } catch (e: IOException) {
                Log.w(TAG, "Error closing IsoDep connection", e)
            }
        }
    }

    override fun handleOnDestroy() {
        super.handleOnDestroy()
        pluginScope.cancel()
    }
}