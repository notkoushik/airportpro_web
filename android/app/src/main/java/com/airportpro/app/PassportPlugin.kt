package com.airportpro.app

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.provider.MediaStore
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback

@CapacitorPlugin(
    name = "PassportPlugin",
    permissions = [
        Permission(
            strings = [Manifest.permission.CAMERA],
            alias = "camera"
        ),
        Permission(
            strings = [Manifest.permission.NFC],
            alias = "nfc"
        )
    ]
)
class PassportPlugin : Plugin() {
    
    private var passportNFCService: PassportNFCService? = null

    override fun load() {
        super.load()
        passportNFCService = PassportNFCService()
    }

    @PluginMethod
    fun scanPassport(call: PluginCall) {
        if (getPermissionState("camera") != com.getcapacitor.PermissionState.GRANTED) {
            requestPermissionForAlias("camera", call, "cameraPermsCallback")
            return
        }
        
        performPassportScan(call)
    }
    
    @PluginMethod
    fun readNFC(call: PluginCall) {
        if (getPermissionState("nfc") != com.getcapacitor.PermissionState.GRANTED) {
            requestPermissionForAlias("nfc", call, "nfcPermsCallback")
            return
        }
        
        performNFCRead(call)
    }

    @PermissionCallback
    private fun cameraPermsCallback(call: PluginCall) {
        if (getPermissionState("camera") == com.getcapacitor.PermissionState.GRANTED) {
            performPassportScan(call)
        } else {
            call.reject("Camera permission is required")
        }
    }
    
    @PermissionCallback
    private fun nfcPermsCallback(call: PluginCall) {
        if (getPermissionState("nfc") == com.getcapacitor.PermissionState.GRANTED) {
            performNFCRead(call)
        } else {
            call.reject("NFC permission is required")
        }
    }

    private fun performPassportScan(call: PluginCall) {
        try {
            // Simulate passport scanning
            val result = JSObject()
            result.put("success", true)
            result.put("data", JSObject().apply {
                put("documentType", "P")
                put("countryCode", "USA")
                put("surname", "DOE")
                put("givenNames", "JOHN")
                put("passportNumber", "123456789")
                put("nationality", "USA")
                put("dateOfBirth", "1990-01-01")
                put("sex", "M")
                put("dateOfExpiry", "2030-12-31")
            })
            call.resolve(result)
        } catch (e: Exception) {
            call.reject("Passport scanning failed: ${e.message}")
        }
    }
    
    private fun performNFCRead(call: PluginCall) {
        try {
            passportNFCService?.let { nfcService ->
                val nfcData = nfcService.readNFCData()
                val result = JSObject()
                result.put("success", true)
                result.put("nfcData", nfcData)
                call.resolve(result)
            } ?: run {
                call.reject("NFC service not initialized")
            }
        } catch (e: Exception) {
            call.reject("NFC reading failed: ${e.message}")
        }
    }
}
