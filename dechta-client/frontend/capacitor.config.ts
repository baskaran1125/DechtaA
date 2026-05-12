import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dechta.app',
  appName: 'Dechta',
  webDir: 'dist',
  server: {
    // Use https scheme to avoid mixed-content & cleartext restrictions
    androidScheme: 'https',
  },
};

export default config;
