/** Loads .env before Metro bundles — restart with `npx expo start --clear` after changing API URL. */
require('dotenv').config();

const apiUrl =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '')?.replace(/^"|"$/g, '').trim() ||
  'https://smitten.zelton.in';
const giphyApiKey = process.env.EXPO_PUBLIC_GIPHY_API_KEY?.trim() ?? '';
const tenorApiKey = process.env.EXPO_PUBLIC_TENOR_API_KEY?.trim() ?? '';
const disableFingerprintAuth = process.env.EXPO_PUBLIC_DISABLE_FINGERPRINT_AUTH === 'true';
const easProjectId =
  process.env.EXPO_PUBLIC_EAS_PROJECT_ID?.trim() ||
  'b27f3579-9df4-4c3f-adcc-f11fcb18b96a';

if (process.env.NODE_ENV !== 'production') {
  // eslint-disable-next-line no-console
  console.log('[Smittenz] API URL →', apiUrl);
  // eslint-disable-next-line no-console
  console.log('[Smittenz] Giphy →', giphyApiKey ? 'configured' : 'not set');
}

module.exports = {
  expo: {
    name: 'Smittenz',
    slug: 'smitten',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/app_icon_square.png',
    scheme: 'smitten',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
    },
    android: {
      icon: './assets/images/app_icon_square.png',
      softwareKeyboardLayoutMode: 'resize',
      adaptiveIcon: {
        backgroundColor: '#FFFFFF',
        foregroundImage: './assets/images/app_icon_square.png',
      },
      edgeToEdgeEnabled: false,
      predictiveBackGestureEnabled: false,
      package: 'com.anonymous.smitten',
      permissions: ['android.permission.POST_NOTIFICATIONS'],
      googleServicesFile: './google-services.json',
    },
    web: {
      output: 'static',
      favicon: './assets/images/app_icon_square.png',
    },
    plugins: [
      'expo-router',
      'expo-asset',
      [
        'expo-splash-screen',
        {
          backgroundColor: '#ffffff',
          image: './assets/images/splash-icon.png',
          imageWidth: 180,
          resizeMode: 'contain',
        },
      ],
      'expo-web-browser',
      'expo-secure-store',
      'expo-video',
      ...(!disableFingerprintAuth
        ? [
            [
              'expo-local-authentication',
              {
                faceIDPermission: 'Allow Smittenz to use device biometrics for app lock.',
              },
            ],
          ]
        : []),
      [
        'expo-notifications',
        {
          icon: './assets/images/circular_notif_icon.png',
          color: '#d03868',
          defaultChannel: 'messages',
        },
      ],
      './plugins/withAndroidCleartextApi',
      './plugins/withAndroidAppIconModule',
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: false,
    },
    extra: {
      apiUrl,
      giphyApiKey,
      tenorApiKey,
      eas: {
        projectId: easProjectId,
      },
    },
  },
};
