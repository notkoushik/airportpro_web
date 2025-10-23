package com.airportpro.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // ============ PHASE 1: REGISTER PASSPORT SCANNER PLUGIN ============
        registerPlugin(PassportScannerPlugin.class);
        
        // CRITICAL: This MUST come AFTER registerPlugin()
        super.onCreate(savedInstanceState);
    }
}
