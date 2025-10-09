package com.airportpro.app

import android.os.Bundle
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // DO NOT register PassportPlugin until it's properly implemented
        // registerPlugin(PassportPlugin::class.java)
    }
}
