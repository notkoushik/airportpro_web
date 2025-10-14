import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // ✅ CRITICAL: Match app build.gradle applicationId
  appId: 'com.airportpro.app',
  appName: 'AirportPro',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    Camera: {
      permissions: ["camera", "photos"]
    }
  }
};

export default config;
