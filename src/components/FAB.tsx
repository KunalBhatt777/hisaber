import React, { useRef, useState } from 'react';
import { StyleSheet, TouchableOpacity, Text, Animated, Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../theme';

interface FABProps {
  onPress: () => void;
  onCameraPress?: () => void;
  icon?: string;
}

export default function FAB({ onPress, onCameraPress, icon = '+' }: FABProps) {
  const colors = useAppTheme();
  const [open, setOpen] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;

  const toggle = () => {
    const toValue = open ? 0 : 1;
    Animated.spring(animation, {
      toValue,
      useNativeDriver: true,
      friction: 6,
      tension: 60,
    }).start();
    setOpen(!open);
  };

  const close = () => {
    Animated.spring(animation, { toValue: 0, useNativeDriver: true, friction: 6, tension: 60 }).start();
    setOpen(false);
  };

  // Simple FAB when no camera option needed (e.g. payments tab, home screen)
  if (!onCameraPress) {
    return (
      <TouchableOpacity
        style={[styles.fab, styles.fabAbsolute, { backgroundColor: colors.primary }]}
        onPress={onPress}
        activeOpacity={0.85}
      >
        <Text style={styles.icon}>{icon}</Text>
      </TouchableOpacity>
    );
  }

  const rotation = animation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] });

  const cameraTranslateY = animation.interpolate({ inputRange: [0, 1], outputRange: [0, -130] });
  const cameraOpacity = animation.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0, 1] });

  const keyboardTranslateY = animation.interpolate({ inputRange: [0, 1], outputRange: [0, -72] });
  const keyboardOpacity = animation.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0, 1] });

  return (
    <>
      {open && <Pressable style={styles.overlay} onPress={close} />}

      <View style={styles.container} pointerEvents="box-none">
        {/* Camera sub-button */}
        <Animated.View
          style={[
            styles.subFabWrap,
            { transform: [{ translateY: cameraTranslateY }], opacity: cameraOpacity },
          ]}
          pointerEvents={open ? 'auto' : 'none'}
        >
          <TouchableOpacity
            style={[styles.subFab, { backgroundColor: colors.primary }]}
            onPress={() => { close(); onCameraPress(); }}
            activeOpacity={0.85}
          >
            <Ionicons name="camera-outline" size={22} color="#FFF" />
          </TouchableOpacity>
        </Animated.View>

        {/* Keyboard sub-button */}
        <Animated.View
          style={[
            styles.subFabWrap,
            { transform: [{ translateY: keyboardTranslateY }], opacity: keyboardOpacity },
          ]}
          pointerEvents={open ? 'auto' : 'none'}
        >
          <TouchableOpacity
            style={[styles.subFab, { backgroundColor: colors.primary }]}
            onPress={() => { close(); onPress(); }}
            activeOpacity={0.85}
          >
            <Ionicons name="keypad-outline" size={22} color="#FFF" />
          </TouchableOpacity>
        </Animated.View>

        {/* Main FAB */}
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={toggle}
          activeOpacity={0.85}
        >
          <Animated.Text style={[styles.icon, { transform: [{ rotate: rotation }] }]}>
            {icon}
          </Animated.Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
    zIndex: 98,
  },
  container: {
    position: 'absolute',
    bottom: 28,
    right: 24,
    alignItems: 'center',
    zIndex: 99,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
  fabAbsolute: {
    position: 'absolute',
    bottom: 28,
    right: 24,
  },
  icon: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '300',
    lineHeight: 32,
    textAlign: 'center',
  },
  subFabWrap: {
    position: 'absolute',
    bottom: 0,
    alignItems: 'center',
  },
  subFab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
});
