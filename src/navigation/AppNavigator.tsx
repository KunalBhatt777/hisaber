import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme } from 'react-native';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList, DrawerContentComponentProps } from '@react-navigation/drawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DrawerActions, useNavigation } from '@react-navigation/native';

import { useAppTheme } from '../theme';
import { DrawerParamList, HomeStackParamList } from '../types';

import HomeScreen from '../screens/HomeScreen';
import SheetScreen from '../screens/SheetScreen';
import SheetSettingsScreen from '../screens/SheetSettingsScreen';
import AddItemScreen from '../screens/AddItemScreen';
import ItemDetailScreen from '../screens/ItemDetailScreen';
import AppSettingsScreen from '../screens/AppSettingsScreen';

// ─── Drawer hamburger button (reusable) ──────────────────────────────────────

export function DrawerToggleButton() {
  const navigation = useNavigation();
  const colors = useAppTheme();
  return (
    <TouchableOpacity
      onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
      style={styles.drawerBtn}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <View style={[styles.line, { backgroundColor: colors.text }]} />
      <View style={[styles.line, { backgroundColor: colors.text }]} />
      <View style={[styles.line, { backgroundColor: colors.text }]} />
    </TouchableOpacity>
  );
}

// ─── Custom Drawer Content ────────────────────────────────────────────────────

function CustomDrawerContent(props: DrawerContentComponentProps) {
  const colors = useAppTheme();
  return (
    <DrawerContentScrollView
      {...props}
      style={{ backgroundColor: colors.surface }}
    >
      <View style={[styles.drawerHeader, { borderBottomColor: colors.border }]}>
        <Text style={[styles.drawerTitle, { color: colors.primary }]}>
          Hisaber
        </Text>
        <Text style={[styles.drawerSubtitle, { color: colors.textSecondary }]}>
          Expense Tracker
        </Text>
      </View>
      <DrawerItemList {...props} />
    </DrawerContentScrollView>
  );
}

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
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Sheet"
        component={SheetScreen}
        options={({ route }) => ({ title: route.params.sheetName })}
      />
      <Stack.Screen
        name="SheetSettings"
        component={SheetSettingsScreen}
        options={{ title: 'Sheet Settings' }}
      />
      <Stack.Screen
        name="ItemDetail"
        component={ItemDetailScreen}
        options={({ route }) => ({ title: route.params.itemName })}
      />
      <Stack.Screen
        name="AddItem"
        component={AddItemScreen}
        options={{
          presentation: 'modal',
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
}

// ─── Root Drawer Navigator ────────────────────────────────────────────────────

const Drawer = createDrawerNavigator<DrawerParamList>();

export default function AppNavigator() {
  const colors = useAppTheme();
  const colorScheme = useColorScheme();

  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'slide',
        drawerStyle: {
          backgroundColor: colors.surface,
          width: 260,
        },
        drawerActiveTintColor: colors.primary,
        drawerInactiveTintColor: colors.textSecondary,
        drawerLabelStyle: { fontSize: 15, fontWeight: '500' },
        overlayColor:
          colorScheme === 'dark'
            ? 'rgba(0,0,0,0.6)'
            : 'rgba(0,0,0,0.3)',
      }}
    >
      <Drawer.Screen
        name="HomeStack"
        component={HomeStack}
        options={{ title: 'Home' }}
      />
      <Drawer.Screen
        name="AppSettings"
        component={AppSettingsScreen}
        options={{ title: 'Settings', headerShown: true, headerStyle: { backgroundColor: colors.surface }, headerTintColor: colors.text }}
      />
    </Drawer.Navigator>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  drawerBtn: {
    padding: 4,
    gap: 5,
    justifyContent: 'center',
  },
  line: {
    width: 22,
    height: 2,
    borderRadius: 1,
  },
  drawerHeader: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  drawerTitle: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  drawerSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
});
