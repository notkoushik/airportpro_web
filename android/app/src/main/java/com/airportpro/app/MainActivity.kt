package com.airportpro.app

import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.JSObject
import android.nfc.NfcAdapter
import android.util.Log

@CapacitorPlugin(name = "CapacitorCustomNative") // IMPORTANT: Name must match what you call in JS
class NFCPassportReaderPlugin : Plugin() {

    private var nfcAdapter: NfcAdapter? = null

    companion object {
        private const val TAG = "NFCPassportReaderPlugin"
    }

    override fun load() {
        super.load()
        nfcAdapter = NfcAdapter.getDefaultAdapter(context)
    }

    @PluginMethod
    fun checkNFCSupport(call: PluginCall) {
        if (nfcAdapter == null) {
            Log.w(TAG, "NFC is not supported on this device.")
            val result = JSObject().put("supported", false)
            call.resolve(result)
            return
        }

        val result = JSObject()
        result.put("supported", true)
        result.put("enabled", nfcAdapter?.isEnabled == true)
        Log.i(TAG, "NFC Supported: true, Enabled: ${nfcAdapter?.isEnabled}")
        call.resolve(result)
    }

    @PluginMethod
    fun readNFCPassport(call: PluginCall) {
        Log.d(TAG, "readNFCPassport called")
        
        // Phase 1: Check required data from MRZ scan
        val documentNumber = call.getString("documentNumber")
        if (documentNumber.isNullOrEmpty()) {
            call.reject("MRZ data is incomplete. Document number is missing.")
            return
        }
        
        // --- THIS IS WHERE YOUR REAL NFC LOGIC WILL GO ---
        // For now, we will return a mock success response after a short delay
        // to prove the connection between React and Kotlin is working.
        
        Thread.sleep(2000) // Simulate a 2-second NFC read time

        val mockPassportData = JSObject()
        val basicInfo = JSObject()
        basicInfo.put("documentType", "P")
        basicInfo.put("issuingCountry", "SGP")
        basicInfo.put("documentNumber", documentNumber)
        basicInfo.put("surname", "TAN")
        basicInfo.put("givenNames", "AH KOW")
        basicInfo.put("nationality", "Singapore")
        basicInfo.put("dateOfBirth", "800101")
        basicInfo.put("gender", "Male")
        basicInfo.put("dateOfExpiry", "300101")
        
        mockPassportData.put("basicInfo", basicInfo)
        
        val response = JSObject()
        response.put("success", true)
        response.put("data", mockPassportData)
        
        Log.i(TAG, "Successfully returned MOCK passport data.")
        call.resolve(response)
    }
}