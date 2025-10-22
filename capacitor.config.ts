import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.airportpro.app',
  appName: 'AirportPro',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // Allow CORS for Tesseract CDN
    allowNavigation: [
      'https://cdn.jsdelivr.net',
      'https://tessdata.projectnaptha.com'
    ]
  },
  android: {
    allowMixedContent: true,
    webContentsDebuggingEnabled: true // Enable for debugging
  },
  plugins: {
    Camera: {
      permissions: ["camera", "photos"]
    }
  }
};

export default config;
