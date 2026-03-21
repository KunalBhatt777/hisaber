import { useColorScheme } from 'react-native';

export const Colors = {
  light: {
    background: '#F2F2F7',
    surface: '#FFFFFF',
    card: '#FFFFFF',
    primary: '#5856D6',
    primaryLight: '#EFEFFC',
    text: '#000000',
    textSecondary: '#6E6E73',
    border: '#C6C6C8',
    separator: '#E5E5EA',
    success: '#34C759',
    danger: '#FF3B30',
    warning: '#FF9500',
  },
  dark: {
    background: '#000000',
    surface: '#1C1C1E',
    card: '#2C2C2E',
    primary: '#7B79FF',
    primaryLight: '#1A1A2E',
    text: '#FFFFFF',
    textSecondary: '#8E8E93',
    border: '#38383A',
    separator: '#38383A',
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
