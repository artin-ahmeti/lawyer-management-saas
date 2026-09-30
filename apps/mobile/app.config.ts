import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Lawyer Management',
  slug: 'lawyer-management',
  scheme: 'lawfirm', // deep links: e-sign callbacks, magic links, notifications
  version: '0.0.1',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: 'com.lawfirm.app',
    supportsTablet: true,
  },
  android: {
    package: 'com.lawfirm.app',
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-local-authentication',
    'expo-web-browser',
    ['expo-build-properties', { ios: { enableSceneSupport: true } }],
    [
      'expo-notifications',
      {
        // icon/color placeholders added before first push-enabled build
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    // Populated per-environment via EAS; EXPO_PUBLIC_* vars are read directly in code.
  },
};

export default config;
