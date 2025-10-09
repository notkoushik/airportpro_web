package com.airportpro.app

import android.os.Bundle
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Debug log to verify class is loaded
        android.util.Log.d("MainActivity", "MainActivity successfully created!")
    }
}
