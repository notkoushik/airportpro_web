package com.airportpro.app

import android.util.Log
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "NFCPassportReader")
class NFCPassportReaderPlugin : Plugin() {

    companion object {
        private const val TAG = "NFCPassportReader"
        private const val ERROR_NO_NFC = "NO_NFC"
        private const val ERROR_NFC_DISABLED = "NFC_DISABLED"
        private const val ERROR_SCAN_FAILED = "SCAN_FAILED"
    }

    private var isScanning = false
    private var currentCall: PluginCall? = null

    override fun load() {
        super.load()
        Log.d(TAG, "NFCPassportReaderPlugin loaded")
    }

    @PluginMethod
    fun scanPassport(call: PluginCall) {
        try {
            Log.d(TAG, "scanPassport called")
            
            if (isScanning) {
                call.reject("Scan already in progress")
                return
            }

            currentCall = call

            // For testing purposes, return mock data
            val mockData = createMockNFCData()
            val result = JSObject()
            result.put("success", true)
            result.put("data", mockData)
            
            call.resolve(result)
            
        } catch (e: Exception) {
            Log.e(TAG, "Error scanning passport", e)
            call.reject("Failed to scan passport: ${e.message}")
        }
    }

    @PluginMethod
    fun checkNFCAvailability(call: PluginCall) {
        try {
            Log.d(TAG, "checkNFCAvailability called")
            
            val result = JSObject()
            result.put("available", true)  // Mock availability for testing
            result.put("enabled", true)
            
            call.resolve(result)
            
        } catch (e: Exception) {
            Log.e(TAG, "Error checking NFC availability", e)
            call.reject("Failed to check NFC availability: ${e.message}")
        }
    }

    @PluginMethod
    fun stopScan(call: PluginCall) {
        try {
            Log.d(TAG, "stopScan called")
            
            isScanning = false
            currentCall = null
            
            val result = JSObject()
            result.put("success", true)
            
            call.resolve(result)
            
        } catch (e: Exception) {
            Log.e(TAG, "Error stopping scan", e)
            call.reject("Failed to stop scan: ${e.message}")
        }
    }

    private fun createMockNFCData(): JSObject {
        val data = JSObject()
        
        // Personal details
        val personalDetails = JSObject()
        personalDetails.put("documentNumber", "P12345678")
        personalDetails.put("firstName", "John")
        personalDetails.put("lastName", "Doe")
        personalDetails.put("dateOfBirth", "1990-01-01")
        personalDetails.put("nationality", "USA")
        personalDetails.put("sex", "M")
        personalDetails.put("expiryDate", "2030-12-31")
        
        data.put("personalDetails", personalDetails)
        data.put("photoBase64", "")  // Empty for mock
        
        return data
    }

    private fun handleNFCError(error: String, message: String) {
        currentCall?.let { call ->
            Log.e(TAG, "NFC Error: $error - $message")
            val result = JSObject()
            result.put("success", false)
            result.put("error", error)
            result.put("message", message)
            call.resolve(result)
        }
        isScanning = false
        currentCall = null
    }

    override fun handleOnDestroy() {
        super.handleOnDestroy()
        isScanning = false
        currentCall = null
    }
}
