import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.fixystays.app',
  appName: 'FixyStays',
  webDir: 'public',
  server: {
    url: 'https://www.fixystays.com',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#ffffff",
      showSpinner: true,
      androidSpinnerStyle: "large",
      spinnerColor: "#2563eb",
    }
  }
};

export default config;
