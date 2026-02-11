import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.airportpro.app',
  appName: 'AirportPro',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  android: {
    // Force light theme in WebView
    allowMixedContent: true
  },
  plugins: {
    StatusBar: {
      style: 'LIGHT_CONTENT',
      backgroundColor: '#ffffff'
    }
  }
};

export default config;
