import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { onAuthStateChanged, User } from 'firebase/auth';

import { useAppTheme } from '../theme';
import { AuthStackParamList, TabParamList, HomeStackParamList } from '../types';
import { auth } from '../firebase/config';
import { registerForPushNotifications } from '../utils/pushNotifications';

import HomeScreen from '../screens/HomeScreen';
import GroupScreen from '../screens/GroupScreen';
import GroupSettingsScreen from '../screens/GroupSettingsScreen';
import GroupSummaryScreen from '../screens/GroupSummaryScreen';
import AddItemScreen from '../screens/AddItemScreen';
import ItemDetailScreen from '../screens/ItemDetailScreen';
import FriendsScreen from '../screens/FriendsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import BudgetingScreen from '../screens/BudgetingScreen';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';

// ─── Home Stack ───────────────────────────────────────────────────────────────

const Stack = createNativeStackNavigator<HomeStackParamList>();

function HomeStack() {
  const colors = useAppTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="Group"
        component={GroupScreen}
        options={({ route }) => ({ title: route.params.groupName, headerShown: false })}
      />
      <Stack.Screen name="GroupSettings" component={GroupSettingsScreen} options={{ title: 'Group Settings' }} />
      <Stack.Screen name="GroupSummary" component={GroupSummaryScreen} options={{ title: 'Summary', headerShown: false }} />
      <Stack.Screen name="ItemDetail" component={ItemDetailScreen} options={({ route }) => ({ title: route.params.itemName })} />
      <Stack.Screen name="AddItem" component={AddItemScreen} options={{ presentation: 'modal', headerShown: false }} />
    </Stack.Navigator>
  );
}

// ─── Bottom Tab Navigator (authenticated) ─────────────────────────────────────

const Tab = createBottomTabNavigator<TabParamList>();

function AppTabs() {
  const colors = useAppTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarIcon: ({ focused, color, size }) => {
          const icons: Record<string, { active: string; inactive: string }> = {
            HomeStack: { active: 'layers',  inactive: 'layers-outline' },
            Friends:   { active: 'people',  inactive: 'people-outline' },
            Budgeting: { active: 'wallet',  inactive: 'wallet-outline' },
            Profile:   { active: 'person',  inactive: 'person-outline' },
          };
          const set = icons[route.name] ?? { active: 'ellipse', inactive: 'ellipse-outline' };
          return (
            <Ionicons name={(focused ? set.active : set.inactive) as any} size={size} color={color} />
          );
        },
      })}
    >
      <Tab.Screen name="HomeStack" component={HomeStack} options={{ title: 'Groups' }} />
      <Tab.Screen name="Friends" component={FriendsScreen} />
      <Tab.Screen name="Budgeting" component={BudgetingScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

// ─── Auth Stack (unauthenticated) ─────────────────────────────────────────────

const AuthStack = createNativeStackNavigator<AuthStackParamList>();

function AuthNavigator() {
  const colors = useAppTheme();
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Signup" component={SignupScreen} />
    </AuthStack.Navigator>
  );
}

// ─── Root Navigator (auth-gated) ──────────────────────────────────────────────

export default function AppNavigator() {
  const colors = useAppTheme();
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) registerForPushNotifications(u.uid);
    });
    return unsub;
  }, []);

  if (user === undefined) {
    return (
      <View style={[styles.splash, { backgroundColor: colors.background }]}>
        <Text style={[styles.splashTitle, { color: colors.primary }]}>Centsible</Text>
        <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />
      </View>
    );
  }

  return user ? <AppTabs /> : <AuthNavigator />;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  splashTitle: { fontSize: 40, fontWeight: '800', letterSpacing: -1 },
});
