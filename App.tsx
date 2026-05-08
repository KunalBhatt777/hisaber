import 'react-native-gesture-handler';
import React, { useEffect, useRef } from 'react';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  NavigationContainer,
  NavigationContainerRef,
  CommonActions,
  DefaultTheme,
  DarkTheme,
} from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';

import AppNavigator from './src/navigation/AppNavigator';
import { initDB } from './src/db/database';

// Initialise SQLite schema synchronously before first render
initDB();

export default function App() {
  const colorScheme = useColorScheme();
  const navigationRef = useRef<NavigationContainerRef<ReactNavigation.RootParamList>>(null);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as {
        type?: string;
        groupId?: string;
        groupName?: string;
      };
      if (!navigationRef.current?.isReady()) return;

      if (data?.type === 'friend') {
        navigationRef.current.dispatch(CommonActions.navigate({ name: 'Friends' }));
      } else if (data?.groupId && data?.groupName) {
        navigationRef.current.dispatch(
          CommonActions.navigate({ name: 'Group', params: { groupId: data.groupId, groupName: data.groupName } }),
        );
      }
    });
    return () => sub.remove();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer
          ref={navigationRef}
          theme={colorScheme === 'dark' ? DarkTheme : DefaultTheme}
        >
          <StatusBar style="auto" />
          <AppNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
