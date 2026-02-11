import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.airportpro.app',
  appName: 'AirportPro',
  webDir: 'dist',
  
  server: {
    androidScheme: 'https',
    cleartext: true
  },
  
  android: {
    allowMixedContent: true,
    loggingBehavior: 'debug'
  },
  
  plugins: {
    Camera: {
      permissions: ["camera", "photos"]
    },
    // PassportScanner uses ML Kit, no additional config needed
  }
};

export default config;
