package com.airportpro.app

import android.os.Bundle
import android.util.Log
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    companion object {
        private const val TAG = "MainActivity"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Register all your custom plugins in one place
        try {
            registerPlugin(PassportScannerPlugin::class.java)
            registerPlugin(NFCPassportReaderPlugin::class.java)
            registerPlugin(LivenessPlugin::class.java)
            Log.i(TAG, "Custom plugins registered successfully.")
        } catch (e: Exception) {
            Log.e(TAG, "Error registering plugins", e)
        }
    }
}