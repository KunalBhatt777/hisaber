export default {
  expo: {
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
    plugins: ['expo-sqlite', 'expo-sharing'],
    extra: {
      eas: {
        projectId: '058367e4-367d-422e-85b6-1dbd65e0f624',
      },
    },
  },
};
