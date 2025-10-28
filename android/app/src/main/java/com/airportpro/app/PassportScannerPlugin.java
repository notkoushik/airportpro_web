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
// IMPORT REMOVED: import com.getcapacitor.annotation.ActivityResultCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

import org.json.JSONException;

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
        if (!hasRequiredPermissions()) {
            requestAllPermissions(call, "cameraPermissionCallback");
        } else {
            launchScanner(call);
        }
    }

    /**
     * This method is called after the user grants or denies camera permission.
     */
    @PluginMethod // This was missing the annotation, but let's add it for consistency
    public void cameraPermissionCallback(PluginCall call) {
        if (hasRequiredPermissions()) {
            launchScanner(call);
        } else {
            call.reject("Camera permission is required to scan passports.");
        }
    }

    /**
     * Launches the PassportScanningActivity to start the camera and analysis.
     */
    private void launchScanner(PluginCall call) {
        Intent intent = new Intent(getContext(), PassportScanningActivity.class);
        startActivityForResult(call, intent, "scanResultCallback");
    }

    /**
     * This method is called when PassportScanningActivity finishes.
     */
    @PluginMethod // <-- THIS IS THE FIX (was @ActivityResultCallback)
    public void scanResultCallback(PluginCall call, ActivityResult result) {
        if (call == null) {
            Log.e(TAG, "PluginCall was null in scanResultCallback");
            return;
        }

        if (result.getResultCode() == Activity.RESULT_OK) {
            // Scan was successful
            Intent data = result.getData();
            if (data != null && data.hasExtra("scanResult")) {
                String resultJson = data.getStringExtra("scanResult");
                try {
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
    }

    @PluginMethod
    public void checkModelsReady(PluginCall call) {
        JSObject result = new JSObject();
        result.put("ready", true);
        call.resolve(result);
    }
}