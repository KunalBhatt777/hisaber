import { useColorScheme } from 'react-native';

export const Colors = {
  light: {
    background: '#EEF0F8',
    surface: '#FFFFFF',
    card: '#FFFFFF',
    primary: '#022954',       // deep navy — brand primary
    primaryLight: '#eaebfe',  // periwinkle tint — badges, avatar bg
    text: '#011627',
    textSecondary: '#505a74', // slate blue-gray
    border: '#b0b8ce',        // cool blue-gray
    separator: '#DDE1EC',
    success: '#34C759',
    danger: '#FF3B30',
    warning: '#FF9500',
  },
  dark: {
    background: '#020B18',
    surface: '#0C1D34',
    card: '#142741',
    primary: '#6B8EC7',       // lighter navy readable on dark bg
    primaryLight: '#0D2240',  // dark navy tint
    text: '#E4EAF5',
    textSecondary: '#b0b8ce', // cool blue-gray
    border: '#354c7c',        // medium navy
    separator: '#1A2E50',
    success: '#30D158',
    danger: '#FF453A',
    warning: '#FF9F0A',
  },
} as const;

export type ThemeColors = {
  [K in keyof typeof Colors.light]: string;
};

export function useAppTheme(): ThemeColors {
  const scheme = useColorScheme();
  return scheme === 'dark' ? Colors.dark : Colors.light;
}
