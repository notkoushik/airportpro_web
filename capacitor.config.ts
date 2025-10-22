import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.airportpro.app',
  appName: 'AirportPro',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    allowNavigation: [
      'https://cdn.jsdelivr.net',
      'https://tessdata.projectnaptha.com'
    ],
    cleartext: true
  },
  android: {
    allowMixedContent: true,
    // REMOVED: hardwareAccelerated (not a valid Capacitor option)
    // Use AndroidManifest.xml for this setting instead
    loggingBehavior: 'debug'
  },
  plugins: {
    Camera: {
      permissions: ["camera", "photos"]
    }
  }
};

export default config;
