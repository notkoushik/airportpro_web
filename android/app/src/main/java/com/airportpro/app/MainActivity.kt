package com.airportpro.app

import android.os.Bundle
import com.getcapacitor.BridgeActivity
import org.bouncycastle.jce.provider.BouncyCastleProvider
import java.security.Security

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Add BouncyCastle security provider for NFC cryptography
        if (Security.getProvider("BC") == null) {
            Security.addProvider(BouncyCastleProvider())
        }
        
        // Register custom plugins
        registerPlugin(NFCPassportReaderPlugin::class.java)
        registerPlugin(PassportScannerPlugin::class.java)
        registerPlugin(LivenessPlugin::class.java)
    }
}
