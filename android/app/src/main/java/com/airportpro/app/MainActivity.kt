package com.airportpro.app

import android.os.Bundle
import android.nfc.NfcAdapter
import android.nfc.Tag
import android.nfc.tech.IsoDep
import android.content.Intent
import android.util.Log
import android.app.PendingIntent
import android.content.IntentFilter
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {

    companion object {
        private const val TAG = "MainActivity"
    }

    private var nfcAdapter: NfcAdapter? = null
    private var pendingIntent: PendingIntent? = null
    private var intentFiltersArray: Array<IntentFilter>? = null
    private var techListsArray: Array<Array<String>>? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // ✅ CRITICAL: Register your custom ML Kit plugins
        try {
            registerPlugin(LivenessPlugin::class.java)
            registerPlugin(PassportScannerPlugin::class.java)
            registerPlugin(NFCPassportReaderPlugin::class.java)
            Log.i(TAG, "AirportPro plugins registered successfully")
        } catch (e: Exception) {
            Log.e(TAG, "Error registering plugins", e)
        }

        // Initialize NFC for passport reading
        initializeNFC()
        
        Log.i(TAG, "AirportPro MainActivity initialized")
    }

    private fun initializeNFC() {
        try {
            nfcAdapter = NfcAdapter.getDefaultAdapter(this)
            
            when {
                nfcAdapter == null -> {
                    Log.w(TAG, "NFC not available on this device")
                }
                nfcAdapter?.isEnabled != true -> {
                    Log.w(TAG, "NFC available but disabled")
                }
                else -> {
                    Log.i(TAG, "NFC ready for passport reading")
                    setupNFCIntents()
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error initializing NFC", e)
        }
    }

    private fun setupNFCIntents() {
        try {
            // Setup NFC intent detection
            pendingIntent = PendingIntent.getActivity(
                this, 0,
                Intent(this, javaClass).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
            )

            // Configure for passport chip detection
            val techDiscovered = IntentFilter(NfcAdapter.ACTION_TECH_DISCOVERED)
            intentFiltersArray = arrayOf(techDiscovered)
            techListsArray = arrayOf(arrayOf(IsoDep::class.java.name))
            
            Log.d(TAG, "NFC intents configured for passport detection")
        } catch (e: Exception) {
            Log.e(TAG, "Error setting up NFC", e)
        }
    }

    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        
        if (NfcAdapter.ACTION_TECH_DISCOVERED == intent?.action) {
            val tag = intent.getParcelableExtra<Tag>(NfcAdapter.EXTRA_TAG)
            tag?.let {
                Log.i(TAG, "Passport chip detected")
                handlePassportChip(it)
            }
        }
    }

    override fun onResume() {
        super.onResume()
        
        nfcAdapter?.let { adapter ->
            if (adapter.isEnabled && pendingIntent != null) {
                try {
                    adapter.enableForegroundDispatch(
                        this, pendingIntent, intentFiltersArray, techListsArray
                    )
                    Log.d(TAG, "NFC foreground dispatch enabled")
                } catch (e: Exception) {
                    Log.e(TAG, "Error enabling NFC dispatch", e)
                }
            }
        }
    }

    override fun onPause() {
        super.onPause()
        
        nfcAdapter?.let { adapter ->
            if (adapter.isEnabled) {
                try {
                    adapter.disableForegroundDispatch(this)
                    Log.d(TAG, "NFC foreground dispatch disabled")
                } catch (e: Exception) {
                    Log.e(TAG, "Error disabling NFC dispatch", e)
                }
            }
        }
    }

    private fun handlePassportChip(tag: Tag) {
        val isoDep = IsoDep.get(tag)
        if (isoDep != null) {
            Log.i(TAG, "Valid passport chip detected")
            
            // Send event to React layer
            bridge?.let { bridge ->
                try {
                    val nfcData = mapOf(
                        "tagId" to tag.id.joinToString(":") { "%02x".format(it) },
                        "isPassportChip" to true,
                        "timestamp" to System.currentTimeMillis()
                    )
                    
                    bridge.triggerWindowJSEvent("nfcPassportDetected", nfcData)
                    Log.d(TAG, "NFC event sent to React layer")
                } catch (e: Exception) {
                    Log.e(TAG, "Error sending NFC event", e)
                }
            }
        }
    }
}