import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppTheme } from '../theme';
import { useAppSettingsViewModel } from '../viewmodels/useAppSettingsViewModel';

export default function AppSettingsScreen() {
  const colors = useAppTheme();
  const vm = useAppSettingsViewModel();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['bottom']}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            YOUR NAME
          </Text>
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            Shown as the greeting on the Home screen
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                color: colors.text,
                borderColor: colors.border,
                backgroundColor: colors.background,
              },
            ]}
            value={vm.userName}
            onChangeText={vm.setUserName}
            placeholder="Your name"
            placeholderTextColor={colors.textSecondary}
            returnKeyType="done"
            onSubmitEditing={vm.save}
            autoCapitalize="words"
          />
        </View>

        <TouchableOpacity
          style={[
            styles.saveBtn,
            {
              backgroundColor: vm.isSaved ? colors.success : colors.primary,
            },
          ]}
          onPress={vm.save}
          disabled={!vm.userName.trim()}
        >
          <Text style={styles.saveBtnText}>
            {vm.isSaved ? 'Saved!' : 'Save'}
          </Text>
        </TouchableOpacity>

        <Text style={[styles.version, { color: colors.textSecondary }]}>
          Hisaber v1.0
        </Text>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: {
    margin: 16,
    padding: 16,
    borderRadius: 14,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  hint: { fontSize: 12, marginBottom: 12 },
  input: {
    fontSize: 17,
    fontWeight: '500',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 10,
  },
  saveBtn: {
    marginHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  version: { textAlign: 'center', fontSize: 12, marginTop: 32 },
});
