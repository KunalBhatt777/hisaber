export default {
  expo: {
    name: 'Centsible',
    slug: 'centsible',
    version: '1.0.0',
    orientation: 'portrait',
    owner:'kunalbhatt777',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.kunalbhatt777.centsible',
    },
    android: {
      package: 'com.kunalbhatt777.centsible',
      adaptiveIcon: {
        backgroundColor: '#E6F4FE',
        foregroundImage: './assets/android-icon-foreground.png',
        backgroundImage: './assets/android-icon-background.png',
        monochromeImage: './assets/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: ['expo-sqlite', 'expo-sharing'],
    extra: {
      eas: {
        projectId: '058367e4-367d-422e-85b6-1dbd65e0f624',
      },
    },
  },
};
