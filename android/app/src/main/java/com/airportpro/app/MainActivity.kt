package com.airportpro.app

import android.app.Activity
import android.content.Intent
import android.nfc.NfcAdapter
import android.nfc.tech.IsoDep
import android.os.Bundle
import com.getcapacitor.BridgeActivity
import com.getcapacitor.Plugin

// Fixed imports - removed problematic BouncyCastle reference
class MainActivity : BridgeActivity() {
    private var nfcAdapter: NfcAdapter? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Initialize NFC adapter
        nfcAdapter = NfcAdapter.getDefaultAdapter(this)
        
        // Register plugins
        registerPlugin(PassportScannerPlugin::class.java)
        registerPlugin(LivenessPlugin::class.java)
        registerPlugin(NFCPassportReaderPlugin::class.java)
        registerPlugin(PassportPlugin::class.java)
    }

    override fun onResume() {
        super.onResume()
        // Handle NFC
        val adapter = nfcAdapter
        if (adapter != null && adapter.isEnabled) {
            val intent = Intent(this, javaClass)
            intent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
            // Setup pending intent for NFC
        }
    }

    override fun onPause() {
        super.onPause()
        nfcAdapter?.disableForegroundDispatch(this)
    }

    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        intent?.let {
            if (NfcAdapter.ACTION_TECH_DISCOVERED == it.action) {
                val tag = intent.getParcelableExtra(NfcAdapter.EXTRA_TAG)
                val isoDep = IsoDep.get(tag)
                // Handle NFC tag discovered
                handleNfcTag(isoDep)
            }
        }
    }

    private fun handleNfcTag(isoDep: IsoDep?) {
        // Implementation for NFC tag handling
        if (isoDep != null) {
            // Process the NFC tag
            // This will be handled by the NFCPassportReaderPlugin
        }
    }
}