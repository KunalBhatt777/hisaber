import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useAppTheme } from '../theme';
import { signUp } from '../firebase/auth';
import { AuthStackParamList } from '../types';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Signup'>;

export default function SignupScreen({ navigation }: { navigation: Nav }) {
  const colors = useAppTheme();
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    const name = displayName.trim();
    const uname = username.trim().toLowerCase();
    const e = email.trim().toLowerCase();
    const p = password.trim();

    if (!name || !uname || !e || !p) {
      Alert.alert('Missing fields', 'Please fill in name, username, email, and password.');
      return;
    }
    if (uname.length < 3) {
      Alert.alert('Invalid username', 'Username must be at least 3 characters.');
      return;
    }
    if (!/^[a-z0-9_]+$/.test(uname)) {
      Alert.alert('Invalid username', 'Username can only contain letters, numbers, and underscores.');
      return;
    }
    if (p.length < 6) {
      Alert.alert('Weak password', 'Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      await signUp(e, p, name, uname, phone.trim());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign up failed.';
      Alert.alert('Sign Up Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const field = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    opts?: {
      placeholder?: string;
      keyboardType?: 'email-address' | 'phone-pad' | 'default';
      secure?: boolean;
      autoCapitalize?: 'none' | 'words';
    },
  ) => (
    <>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <TextInput
        style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
        placeholder={opts?.placeholder ?? ''}
        placeholderTextColor={colors.textSecondary}
        value={value}
        onChangeText={onChange}
        keyboardType={opts?.keyboardType ?? 'default'}
        secureTextEntry={opts?.secure ?? false}
        autoCapitalize={opts?.autoCapitalize ?? 'none'}
        autoCorrect={false}
        returnKeyType="next"
      />
    </>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={[styles.title, { color: colors.primary }]}>Create Account</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Join Centsible to split expenses with friends.
          </Text>

          <View style={[styles.card, { backgroundColor: colors.surface }]}>
            {field('DISPLAY NAME', displayName, setDisplayName, {
              placeholder: 'e.g. Jinal Shah',
              autoCapitalize: 'words',
            })}
            <View style={styles.spacer} />
            {field('USERNAME', username, setUsername, {
              placeholder: 'e.g. jinalshah (no spaces)',
            })}
            <View style={styles.spacer} />
            {field('EMAIL', email, setEmail, {
              placeholder: 'you@example.com',
              keyboardType: 'email-address',
            })}
            <View style={styles.spacer} />
            {field('PHONE (optional)', phone, setPhone, {
              placeholder: '1234567890',
              keyboardType: 'phone-pad',
            })}
            <View style={styles.spacer} />
            {field('PASSWORD', password, setPassword, {
              placeholder: 'Min 6 characters',
              secure: true,
            })}

            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }]}
              onPress={handleSignup}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryBtnText}>Create Account</Text>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.switchRow}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={[styles.switchText, { color: colors.textSecondary }]}>
              Already have an account?{' '}
            </Text>
            <Text style={[styles.switchLink, { color: colors.primary }]}>Sign In</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 20,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 28,
  },
  card: {
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
  },
  spacer: { height: 16 },
  primaryBtn: {
    marginTop: 24,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  switchText: { fontSize: 14 },
  switchLink: { fontSize: 14, fontWeight: '700' },
});
