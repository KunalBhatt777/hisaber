export default {
  expo: {
    cli: {
      appVersionSource: 'remote',
    },
    name: 'Centsible',
    slug: 'centsible',
    version: '1.0.0',
    orientation: 'portrait',
    owner:'kunalbhatt777',
    icon: './assets/CentsibleLogo.png',
    userInterfaceStyle: 'automatic',
    splash: {
      image: './assets/CentsibleLogo.png',
      resizeMode: 'contain',
      backgroundColor: '#eaebfe',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.kunalbhatt777.centsible',
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
      entitlements: {
        'aps-environment': 'production',
      },
    },
    android: {
      package: 'com.kunalbhatt777.centsible',
      adaptiveIcon: {
        foregroundImage: './assets/CentsibleLogo.png',
        backgroundColor: '#eaebfe',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
    },
    web: {
      favicon: './assets/CentsibleLogo.png',
    },
    plugins: [
      'expo-sqlite',
      'expo-sharing',
      '@react-native-community/datetimepicker',
      'expo-notifications',
      [
        'expo-image-picker',
        {
          cameraPermission: 'Allow Centsible to access your camera to scan receipts.',
          photosPermission: 'Allow Centsible to access your photos to upload receipts.',
        },
      ],
    ],
    extra: {
      eas: {
        projectId: '058367e4-367d-422e-85b6-1dbd65e0f624',
      },
    },
  },
};
