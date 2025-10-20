package com.airportpro.app

import android.app.Application
import android.util.Log

/**
 * Custom Application class for AirportPro
 * This class is declared in AndroidManifest.xml as android:name=".AirportProApplication"
 * 
 * CRITICAL: Without this file, the app will crash on startup with:
 * "Unable to instantiate application com.airportpro.app.AirportProApplication"
 */
class AirportProApplication : Application() {
    
    companion object {
        private const val TAG = "AirportProApp"
    }
    
    override fun onCreate() {
        super.onCreate()
        
        Log.d(TAG, "✅ AirportPro Application initialized successfully")
        Log.d(TAG, "Package: ${packageName}")
        Log.d(TAG, "Version: ${try { packageManager.getPackageInfo(packageName, 0).versionName } catch(e: Exception) { "Unknown" }}")
        
        // Initialize any app-wide services here
        // Examples:
        // - Analytics
        // - Crash reporting  
        // - Database
        // - Dependency injection
        
        initializeAppComponents()
    }
    
    /**
     * Initialize app-wide components
     */
    private fun initializeAppComponents() {
        try {
            // Initialize Bouncy Castle Security Provider
            // This is needed for NFC passport reading
            java.security.Security.insertProviderAt(
                org.bouncycastle.jce.provider.BouncyCastleProvider(), 
                1
            )
            Log.d(TAG, "✅ Bouncy Castle security provider initialized")
            
            // Add any other initialization here
            // Example: Firebase, Room Database, WorkManager, etc.
            
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error initializing app components", e)
        }
    }
    
    override fun onTerminate() {
        super.onTerminate()
        Log.d(TAG, "AirportPro Application terminated")
    }
    
    override fun onLowMemory() {
        super.onLowMemory()
        Log.w(TAG, "⚠️ Low memory warning received")
        // Implement memory cleanup if needed
    }
    
    override fun onTrimMemory(level: Int) {
        super.onTrimMemory(level)
        Log.w(TAG, "⚠️ Memory trim requested, level: $level")
        // Implement memory management based on trim level
    }
}

