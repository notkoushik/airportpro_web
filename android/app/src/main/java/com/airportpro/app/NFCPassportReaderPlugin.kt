package com.airportpro.app

import android.nfc.NfcAdapter
import android.nfc.Tag
import android.nfc.tech.IsoDep
import android.util.Log
import android.graphics.Bitmap
import android.util.Base64
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.GlobalScope
import kotlinx.coroutines.launch
import java.io.ByteArrayOutputStream

@CapacitorPlugin(name = "NFCPassportReader")
class NFCPassportReaderPlugin : Plugin() {
    
    private var nfcAdapter: NfcAdapter? = null
    private var currentCall: PluginCall? = null

    @PluginMethod
    fun checkNFCSupport(call: PluginCall) {
        try {
            nfcAdapter = NfcAdapter.getDefaultAdapter(activity)
            val result = JSObject().apply {
                put("isSupported", nfcAdapter != null)
                put("isEnabled", nfcAdapter?.isEnabled == true)
            }
            call.resolve(result)
        } catch (error: Exception) {
            call.reject("Failed to check NFC support: ${error.message}")
        }
    }
    
    @PluginMethod
    fun readPassport(call: PluginCall) {
        val passportNumber = call.getString("passportNumber") ?: return call.reject("Missing passport number")
        val dateOfBirth = call.getString("dateOfBirth") ?: return call.reject("Missing date of birth")
        val dateOfExpiry = call.getString("dateOfExpiry") ?: return call.reject("Missing expiry date")
        
        currentCall = call
        enableNFCReaderMode(passportNumber, dateOfBirth, dateOfExpiry)
    }
    
    @PluginMethod
    fun stopNFCReading(call: PluginCall) {
        try {
            nfcAdapter?.disableReaderMode(activity)
            currentCall = null
            call.resolve(JSObject().apply {
                put("success", true)
            })
        } catch (error: Exception) {
            call.reject("Failed to stop NFC reading: ${error.message}")
        }
    }
    
    private fun enableNFCReaderMode(passportNumber: String, dateOfBirth: String, dateOfExpiry: String) {
        nfcAdapter = NfcAdapter.getDefaultAdapter(activity)
        
        if (nfcAdapter == null) {
            currentCall?.reject("NFC not supported on this device")
            return
        }
        
        if (nfcAdapter?.isEnabled != true) {
            currentCall?.reject("NFC is not enabled. Please enable NFC in settings.")
            return
        }
        
        nfcAdapter?.enableReaderMode(
            activity,
            { tag -> handleNFCTag(tag, passportNumber, dateOfBirth, dateOfExpiry) },
            NfcAdapter.FLAG_READER_NFC_A or NfcAdapter.FLAG_READER_SKIP_NDEF_CHECK,
            null
        )
        
        // Notify frontend that NFC reading is active
        val result = JSObject().apply {
            put("status", "nfc_reading_active")
            put("message", "Hold passport near device...")
        }
        currentCall?.resolve(result)
    }
    
    private fun handleNFCTag(tag: Tag, passportNumber: String, dateOfBirth: String, dateOfExpiry: String) {
        val isoDep = IsoDep.get(tag)
        if (isoDep != null) {
            GlobalScope.launch {
                try {
                    Log.d("NFCPassportReader", "NFC tag discovered, starting passport reading...")
                    
                    // For demo purposes, return mock data
                    // In production, implement actual passport reading using JMRTD
                    val mockResult = JSObject().apply {
                        put("success", true)
                        put("mrz", "Mock MRZ data from $passportNumber")
                        put("photo", "base64_mock_photo_data")
                        put("verified", true)
                        put("method", "nfc")
                    }
                    
                    activity.runOnUiThread {
                        currentCall?.resolve(mockResult)
                        nfcAdapter?.disableReaderMode(activity)
                        currentCall = null
                    }
                } catch (e: Exception) {
                    Log.e("NFCPassportReader", "Error reading passport", e)
                    activity.runOnUiThread {
                        currentCall?.reject("Failed to read passport: ${e.message}")
                        currentCall = null
                    }
                }
            }
        } else {
            currentCall?.reject("Invalid NFC tag detected")
        }
    }
    
    override fun handleOnPause() {
        super.handleOnPause()
        nfcAdapter?.disableReaderMode(activity)
    }
    
    override fun handleOnDestroy() {
        super.handleOnDestroy()
        nfcAdapter?.disableReaderMode(activity)
        currentCall = null
    }
}
