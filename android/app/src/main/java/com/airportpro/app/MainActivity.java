package com.airportpro.app;

import android.os.Bundle;
import android.util.Log;
import com.getcapacitor.BridgeActivity;
// --- FIX: Ensure only one import for the plugin ---

import java.util.ArrayList;

// --- END FIX ---
import idpass.smartscanner.SmartScannerPlugin;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "MainActivity";
    

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register plugins BEFORE calling super.onCreate()
        Log.d(TAG, "Registering plugins in MainActivity onCreate...");
        registerPlugin(SmartScannerPlugin.class);
        // Now call the parent constructor AFTER registration
        super.onCreate(savedInstanceState);
        Log.d(TAG, "MainActivity onCreate completed.");
       
    }
}