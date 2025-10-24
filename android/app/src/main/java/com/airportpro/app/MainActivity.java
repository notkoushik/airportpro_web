package com.airportpro.app;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;

// 1. Import your plugin
import com.airportpro.app.PassportScannerPlugin; 

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // 2. Register your plugin
        registerPlugin(PassportScannerPlugin.class); 
    }
}