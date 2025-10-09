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

        // Register custom plugins for ML Kit integration
        registerPlugin(LivenessPlugin::class.java)
        registerPlugin(PassportScannerPlugin::class.java)
        registerPlugin(NFCPassportReaderPlugin::class.java) // For Phase 3

        // Initialize NFC components
        initializeNFC()
        
        Log.i(TAG, "AirportPro MainActivity initialized with Kotlin")
    }

    private fun initializeNFC() {
        // Initialize NFC adapter
        nfcAdapter = NfcAdapter.getDefaultAdapter(this)
        
        when {
            nfcAdapter == null -> {
                Log.w(TAG, "NFC is not available on this device")
            }
            nfcAdapter?.isEnabled != true -> {
                Log.w(TAG, "NFC is available but disabled - User needs to enable it")
            }
            else -> {
                Log.i(TAG, "NFC is available and enabled")
                setupNFCIntents()
            }
        }
    }

    private fun setupNFCIntents() {
        // Create pending intent for NFC discovery
        pendingIntent = PendingIntent.getActivity(
            this, 0,
            Intent(this, javaClass).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE
        )

        // Setup intent filters for passport detection
        val ndef = IntentFilter(NfcAdapter.ACTION_TECH_DISCOVERED)
        intentFiltersArray = arrayOf(ndef)

        // Setup tech lists for IsoDep (passport chips)
        techListsArray = arrayOf(arrayOf(IsoDep::class.java.name))
    }

    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        
        // Handle NFC intent when passport is detected
        if (NfcAdapter.ACTION_TECH_DISCOVERED == intent?.action) {
            val tag = intent.getParcelableExtra<Tag>(NfcAdapter.EXTRA_TAG)
            if (tag != null) {
                Log.i(TAG, "NFC passport detected: $tag")
                handlePassportNFC(tag)
            }
        }
    }

    override fun onResume() {
        super.onResume()
        
        // Enable NFC foreground dispatch when app is active
        nfcAdapter?.let { adapter ->
            if (adapter.isEnabled && pendingIntent != null) {
                try {
                    adapter.enableForegroundDispatch(
                        this,
                        pendingIntent,
                        intentFiltersArray,
                        techListsArray
                    )
                    Log.d(TAG, "NFC foreground dispatch enabled")
                } catch (e: Exception) {
                    Log.e(TAG, "Error enabling NFC foreground dispatch", e)
                }
            }
        }
    }

    override fun onPause() {
        super.onPause()
        
        // Disable NFC foreground dispatch when app goes background
        nfcAdapter?.let { adapter ->
            if (adapter.isEnabled) {
                try {
                    adapter.disableForegroundDispatch(this)
                    Log.d(TAG, "NFC foreground dispatch disabled")
                } catch (e: Exception) {
                    Log.e(TAG, "Error disabling NFC foreground dispatch", e)
                }
            }
        }
    }

    private fun handlePassportNFC(tag: Tag) {
        Log.i(TAG, "Processing passport NFC tag")
        
        // Check if the tag supports IsoDep (required for passport reading)
        val isoDep = IsoDep.get(tag)
        if (isoDep != null) {
            Log.i(TAG, "IsoDep passport chip detected - Ready for reading")
            
            // Send NFC tag information to the web layer via custom event
            val bridge = bridge
            if (bridge != null) {
                try {
                    // Create data to send to React component
                    val nfcData = mapOf(
                        "tagId" to tag.id.joinToString(":") { "%02x".format(it) },
                        "techList" to tag.techList.toList(),
                        "isPassportChip" to true,
                        "timestamp" to System.currentTimeMillis()
                    )
                    
                    // Trigger custom event that React can listen to
                    bridge.triggerWindowJSEvent("nfcPassportDetected", nfcData)
                    Log.d(TAG, "Sent NFC passport detection event to React layer")
                    
                } catch (e: Exception) {
                    Log.e(TAG, "Error sending NFC event to React layer", e)
                }
            }
        } else {
            Log.w(TAG, "Detected NFC tag is not a passport chip")
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        Log.i(TAG, "MainActivity destroyed")
    }
}