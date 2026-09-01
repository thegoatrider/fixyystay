import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.fixystays.myapp',
  appName: 'FixyStays',
  webDir: 'public',
  server: {
    url: 'https://www.fixystays.com',
    cleartext: false
  },
  appendUserAgent: 'FixyStaysApp',
  android: {
    appendUserAgent: 'FixyStaysApp'
  },
  ios: {
    appendUserAgent: 'FixyStaysApp'
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
