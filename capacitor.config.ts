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
    appendUserAgent: 'FixyStaysApp',
    backgroundColor: '#ffffff'
  },
  ios: {
    appendUserAgent: 'FixyStaysApp',
    backgroundColor: '#ffffff'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      backgroundColor: "#ffffff",
      showSpinner: false
    }
  }
};

export default config;
