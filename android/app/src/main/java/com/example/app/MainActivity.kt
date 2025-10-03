package com.airportpro.app

import android.app.PendingIntent
import android.content.Intent
import android.content.IntentFilter
import android.nfc.NfcAdapter
import android.nfc.tech.IsoDep
import android.os.Bundle
import android.webkit.WebSettings
import com.getcapacitor.BridgeActivity
import com.getcapacitor.R // FIX: Explicitly import the Capacitor R class to resolve the webview ID.

class MainActivity : BridgeActivity() {

    private var nfcAdapter: NfcAdapter? = null
    private var pendingIntent: PendingIntent? = null
    private var intentFilters: Array<IntentFilter>? = null
    private var techLists: Array<Array<String>>? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Register the passport plugin before any other logic
        registerPlugin(PassportPlugin::class.java)

        // Force WebView light theme by finding the view AFTER the activity is fully created
        val webView = findViewById<android.webkit.WebView>(R.id.webview)
        webView?.let {
            val settings = it.settings
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
                @Suppress("DEPRECATION")
                settings.forceDark = WebSettings.FORCE_DARK_OFF
            }
        }

        // Setup NFC
        setupNFC()
    }

    private fun setupNFC() {
        nfcAdapter = NfcAdapter.getDefaultAdapter(this)

        val intent = Intent(this, javaClass).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)

        // FIX: Add correct mutability flag for modern Android versions (SDK 31+)
        val flag = if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.S) {
            PendingIntent.FLAG_MUTABLE
        } else {
            0
        }
        pendingIntent = PendingIntent.getActivity(this, 0, intent, flag)

        val isoDepFilter = IntentFilter(NfcAdapter.ACTION_TECH_DISCOVERED)
        try {
            isoDepFilter.addDataType("*/*")
        } catch (e: IntentFilter.MalformedMimeTypeException) {
            throw RuntimeException("Failed to add MIME type.", e)
        }

        intentFilters = arrayOf(isoDepFilter)
        techLists = arrayOf(arrayOf(IsoDep::class.java.name))
    }

    override fun onResume() {
        super.onResume()
        nfcAdapter?.enableForegroundDispatch(this, pendingIntent, intentFilters, techLists)
    }

    override fun onPause() {
        super.onPause()
        nfcAdapter?.disableForegroundDispatch(this)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        // This is crucial: forward the new intent to the Capacitor bridge
        // so the plugin can receive the NFC tag discovery event.
        this.bridge.onNewIntent(intent)
    }
}

