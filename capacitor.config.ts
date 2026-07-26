import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gracelandroyalacademy.smugflex',
  appName: 'SMugFlex',
  webDir: 'build',
  server: {
    // Use https for production — relative /api works via Vercel proxy
    // For Android native, absolute URL is used (handled in config/api.ts)
    androidScheme: 'https',
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    LocalNotifications: {
      smallIcon: 'ic_launcher',
      iconColor: '#6366F1',
    },
  },
  android: {
    backgroundColor: '#0A2540',
  },
};

export default config;
