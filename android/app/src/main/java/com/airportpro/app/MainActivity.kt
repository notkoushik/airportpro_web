package com.airportpro.app

import android.os.Bundle
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Capacitor plugins are automatically registered
        // No need to manually register plugins that don't exist yet
    }
}