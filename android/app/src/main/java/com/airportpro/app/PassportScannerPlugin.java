package com.airportpro.app;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.util.Log;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
// --- FIX: Add required annotation imports ---
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.PermissionCallback;
// --- END FIX ---
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

import org.json.JSONException; // Keep this if JSObject parsing is needed later

@CapacitorPlugin(
    name = "PassportScanner",
    permissions = {
        @Permission(alias = "camera", strings = { Manifest.permission.CAMERA })
    }
)
public class PassportScannerPlugin extends Plugin {

    private static final String TAG = "PassportScannerPlugin";

    @Override
    public void load() {
        Log.d(TAG, "PassportScanner Plugin loaded.");
    }

    @PluginMethod
    public void scanPassport(PluginCall call) {
        // Retain the call to use it in the callback
        bridge.saveCall(call);

        if (!hasRequiredPermissions()) {
            // Request permissions, referencing the callback method name
            requestAllPermissions(call, "cameraPermissionCallback");
        } else {
            // Already have permission, launch scanner directly
            launchScanner(call);
        }
    }

    /**
     * --- FIX: Use @PermissionCallback ---
     * Handles the result of the permission request.
     */
    @PermissionCallback
    private void cameraPermissionCallback(PluginCall call) { // The call might be null if bridge cleared it, retrieve if needed
        PluginCall savedCall = bridge.getSavedCall(call.getCallbackId()); // Retrieve the saved call
         if (savedCall == null) {
             Log.e(TAG, "Saved PluginCall was null in cameraPermissionCallback");
             // Can't proceed without the original call context
             return;
         }
        if (hasRequiredPermissions()) {
            launchScanner(savedCall); // Use the retrieved call
        } else {
            savedCall.reject("Camera permission is required to scan passports.");
            bridge.releaseCall(savedCall); // Clean up the saved call
        }
        // Don't release the call here if launchScanner is called, it needs it for startActivityForResult
    }
    // --- END FIX ---

    /**
     * Launches the PassportScanningActivity.
     */
    private void launchScanner(PluginCall call) {
        Intent intent = new Intent(getContext(), PassportScanningActivity.class);
        // Use the name matching the @ActivityCallback method
        startActivityForResult(call, intent, "scanResultCallback");
    }

    /**
     * --- FIX: Use @ActivityCallback ---
     * Handles the result returned from PassportScanningActivity.
     */
    @ActivityCallback
    private void scanResultCallback(PluginCall call, ActivityResult result) { // Can be private
        // Note: 'call' here IS the original call saved by startActivityForResult
        if (call == null) {
            Log.e(TAG, "PluginCall was null in scanResultCallback");
            return; // Should not happen if called via startActivityForResult
        }

        if (result.getResultCode() == Activity.RESULT_OK) {
            Intent data = result.getData();
            if (data != null && data.hasExtra("scanResult")) {
                String resultJson = data.getStringExtra("scanResult");
                try {
                    // Directly resolve with the JSObject parsed from JSON string
                    JSObject resultObj = new JSObject(resultJson);
                    call.resolve(resultObj);
                } catch (JSONException e) {
                    call.reject("Failed to parse scan result: " + e.getMessage());
                }
            } else {
                call.reject("Scan was successful but returned no data.");
            }
        } else {
            // Scan was canceled or failed
            Intent data = result.getData();
            if (data != null && data.hasExtra("scanError")) {
                String error = data.getStringExtra("scanError");
                call.reject(error);
            } else {
                call.reject("Scan canceled by user.");
            }
        }
        // No need to release call here, Capacitor handles it after resolve/reject
    }
    // --- END FIX ---

    @PluginMethod
    public void checkModelsReady(PluginCall call) {
        JSObject result = new JSObject();
        result.put("ready", true);
        call.resolve(result);
    }
}