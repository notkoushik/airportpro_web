package com.airportpro.app

import androidx.multidex.MultiDexApplication

class AirportProApplication : MultiDexApplication() {
    
    override fun onCreate() {
        super.onCreate()
        
        // Initialize any global application settings here
        initializeApp()
    }
    
    private fun initializeApp() {
        // Application initialization code
        // This can include crash reporting, analytics, etc.
    }
}