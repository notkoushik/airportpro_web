package com.airportpro.app

import android.app.Activity
import android.graphics.Bitmap
import android.nfc.NfcAdapter
import android.nfc.Tag
import com.getcapacitor.*
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "PassportScanner")
class PassportPlugin : Plugin() {

    private lateinit var nfcService: PassportNFCService
    private lateinit var mrzService: MRZScannerService

    override fun load() {
        nfcService = PassportNFCService()
        mrzService = MRZScannerService(context)
    }

    @PluginMethod
    fun isNfcAvailable(call: PluginCall) {
        val nfcAdapter = NfcAdapter.getDefaultAdapter(context)
        val isAvailable = nfcAdapter != null && nfcAdapter.isEnabled

        val ret = JSObject()
        ret.put("available", isAvailable)
        call.resolve(ret)
    }

    @PluginMethod
    fun detectPassportChip(call: PluginCall) {
        val activity = this.activity
        val intent = activity.intent

        if (NfcAdapter.ACTION_TECH_DISCOVERED == intent.action) {
            val tag = intent.getParcelableExtra<Tag>(NfcAdapter.EXTRA_TAG)

            if (tag != null) {
                val result = nfcService.detectPassport(tag)

                val ret = JSObject()
                ret.put("detected", result.isPassportDetected)
                ret.put("chipId", result.chipId)
                ret.put("error", result.errorMessage)

                call.resolve(ret)
            } else {
                call.reject("No NFC tag found")
            }
        } else {
            call.reject("No NFC scan detected")
        }
    }

    @PluginMethod
    fun scanMRZFromCamera(call: PluginCall) {
        // Implementation for camera-based MRZ scanning
        call.resolve(JSObject().apply {
            put("success", false)
            put("message", "Camera MRZ scanning not implemented yet")
        })
    }
}
