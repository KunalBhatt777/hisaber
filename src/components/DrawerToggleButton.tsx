import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import { useAppTheme } from '../theme';

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
});
