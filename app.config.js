export default {
  expo: {
    name: 'Hisaber',
    slug: 'hisaber',
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
      bundleIdentifier: 'com.kunalbhatt777.hisaber',
    },
    android: {
      package: 'com.kunalbhatt777.hisaber',
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
        projectId: 'a3bef68b-bf78-43be-a2ae-22a33ee7302b',
      },
    },
  },
};
