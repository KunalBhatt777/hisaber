import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '../theme';
import { useSheetSettingsViewModel } from '../viewmodels/useSheetSettingsViewModel';
import { HomeStackParamList, SheetPerson } from '../types';
import { formatDate } from '../utils/formatters';

type Props = {
  navigation: NativeStackNavigationProp<HomeStackParamList, 'SheetSettings'>;
  route: RouteProp<HomeStackParamList, 'SheetSettings'>;
};

export default function SheetSettingsScreen({ route }: Props) {
  const { sheetId } = route.params;
  const colors = useAppTheme();
  const vm = useSheetSettingsViewModel(sheetId);

  const confirmRemovePerson = (person: SheetPerson) => {
    Alert.alert(
      'Remove Person',
      `Remove "${person.name}" from this sheet? Their expense splits will also be removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => vm.removePerson(person.id),
        },
      ],
    );
  };

  const confirmRemoveTax = (value: number) => {
    if (vm.taxOptions.length <= 1) return;
    Alert.alert(
      'Remove Tax Bracket',
      `Remove ${value}% from this sheet's tax brackets?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => vm.removeTaxOption(value),
        },
      ],
    );
  };

  const canAddTax = (() => {
    const parsed = parseFloat(vm.newTaxValue.trim());
    return !isNaN(parsed) && parsed > 0 && parsed <= 100;
  })();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['bottom']}
    >
      <FlatList
        data={vm.people}
        keyExtractor={(item) => String(item.id)}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            {/* ── Sheet Info ──────────────────────────────────────────── */}
            <View style={[styles.infoCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                SHEET NAME
              </Text>
              <View style={styles.nameRow}>
                <TextInput
                  style={[styles.nameInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                  value={vm.sheetNameDraft}
                  onChangeText={vm.setSheetNameDraft}
                  returnKeyType="done"
                  onSubmitEditing={vm.saveSheetName}
                  onBlur={vm.saveSheetName}
                />
              </View>

              {vm.sheet && (
                <>
                  <Text
                    style={[
                      styles.sectionLabel,
                      { color: colors.textSecondary, marginTop: 20 },
                    ]}
                  >
                    CREATED
                  </Text>
                  <Text style={[styles.dateText, { color: colors.text }]}>
                    {formatDate(vm.sheet.created_at)}
                  </Text>
                </>
              )}
            </View>

            {/* ── Tax Brackets ────────────────────────────────────────── */}
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              TAX BRACKETS
            </Text>
            <View style={[styles.taxCard, { backgroundColor: colors.surface }]}>
              {/* Existing brackets list */}
              {vm.taxOptions.map((value, index) => (
                <View key={value}>
                  <View style={styles.taxBracketRow}>
                    <View style={[styles.taxBadge, { backgroundColor: colors.primaryLight }]}>
                      <Text style={[styles.taxBadgeText, { color: colors.primary }]}>
                        {value}%
                      </Text>
                    </View>
                    <Text style={[styles.taxLabel, { color: colors.text }]}>
                      {value}% tax rate
                    </Text>
                    <TouchableOpacity
                      onPress={() => confirmRemoveTax(value)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      disabled={vm.taxOptions.length <= 1}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={18}
                        color={vm.taxOptions.length <= 1 ? colors.border : colors.danger}
                      />
                    </TouchableOpacity>
                  </View>
                  {index < vm.taxOptions.length - 1 && (
                    <View style={[styles.separator, { backgroundColor: colors.separator }]} />
                  )}
                </View>
              ))}

              {/* Divider before add row */}
              <View style={[styles.separator, { backgroundColor: colors.separator, marginTop: 4 }]} />

              {/* Add new bracket row */}
              <View style={styles.addTaxRow}>
                <TextInput
                  style={[
                    styles.addTaxInput,
                    {
                      color: colors.text,
                      borderColor: colors.border,
                      backgroundColor: colors.background,
                    },
                  ]}
                  placeholder="New bracket %"
                  placeholderTextColor={colors.textSecondary}
                  value={vm.newTaxValue}
                  onChangeText={vm.setNewTaxValue}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                  onSubmitEditing={vm.addTaxOption}
                />
                <TouchableOpacity
                  onPress={vm.addTaxOption}
                  style={[
                    styles.addTaxBtn,
                    { backgroundColor: canAddTax ? colors.primary : colors.border },
                  ]}
                  disabled={!canAddTax}
                >
                  <Ionicons name="add" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>

            {/* ── People Section Header ───────────────────────────────── */}
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              PEOPLE
            </Text>

            {/* ── Add Person ──────────────────────────────────────────── */}
            <View
              style={[
                styles.addRow,
                {
                  backgroundColor: colors.surface,
                  borderBottomColor: colors.separator,
                },
              ]}
            >
              <TextInput
                style={[styles.addInput, { color: colors.text }]}
                placeholder="Add person name..."
                placeholderTextColor={colors.textSecondary}
                value={vm.newPersonName}
                onChangeText={vm.setNewPersonName}
                returnKeyType="done"
                onSubmitEditing={vm.addPerson}
              />
              <TouchableOpacity
                onPress={vm.addPerson}
                style={[
                  styles.addBtn,
                  {
                    backgroundColor: vm.newPersonName.trim()
                      ? colors.primary
                      : colors.border,
                  },
                ]}
                disabled={!vm.newPersonName.trim()}
              >
                <Ionicons name="add" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </>
        }
        ListEmptyComponent={() => (
          <View style={[styles.emptyRow, { backgroundColor: colors.surface }]}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No people yet — add someone above
            </Text>
          </View>
        )}
        ItemSeparatorComponent={() => (
          <View
            style={[
              styles.separator,
              { backgroundColor: colors.separator, marginLeft: 60 },
            ]}
          />
        )}
        renderItem={({ item }: { item: SheetPerson }) => (
          <View
            style={[styles.personRow, { backgroundColor: colors.surface }]}
          >
            <View
              style={[styles.avatar, { backgroundColor: colors.primaryLight }]}
            >
              <Text style={[styles.avatarText, { color: colors.primary }]}>
                {item.name.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={[styles.personName, { color: colors.text }]}>
              {item.name}
            </Text>
            <TouchableOpacity
              onPress={() => confirmRemovePerson(item)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
            </TouchableOpacity>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { paddingBottom: 40 },
  infoCard: {
    margin: 16,
    padding: 16,
    borderRadius: 14,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  nameInput: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 10,
  },
  dateText: { fontSize: 15, fontWeight: '500' },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 6,
  },
  taxCard: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  taxBracketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
  },
  taxBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    minWidth: 52,
    alignItems: 'center',
  },
  taxBadgeText: { fontSize: 13, fontWeight: '700' },
  taxLabel: { flex: 1, fontSize: 15, fontWeight: '500' },
  addTaxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },
  addTaxInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 10,
  },
  addTaxBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  addInput: { flex: 1, fontSize: 16, paddingVertical: 4 },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 15, fontWeight: '700' },
  personName: { flex: 1, fontSize: 15, fontWeight: '500' },
  separator: { height: StyleSheet.hairlineWidth },
  emptyRow: { paddingHorizontal: 16, paddingVertical: 16 },
  emptyText: { fontSize: 14 },
});
