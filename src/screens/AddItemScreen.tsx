import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '../theme';
import { useAddItemViewModel } from '../viewmodels/useAddItemViewModel';
import { HomeStackParamList } from '../types';
import { formatCurrency } from '../utils/formatters';

type Props = {
  navigation: NativeStackNavigationProp<HomeStackParamList, 'AddItem'>;
  route: RouteProp<HomeStackParamList, 'AddItem'>;
};

export default function AddItemScreen({ navigation, route }: Props) {
  const { sheetId, expenseId } = route.params;
  const colors = useAppTheme();
  const vm = useAddItemViewModel(navigation, sheetId, expenseId);

  // Build chip list: enabled options + Custom always shown
  const taxChips = [
    ...vm.enabledTaxOptions.map((v) => ({
      label: `${v}%`,
      value: v,
    })),
    { label: 'Custom', value: -1 },
  ];

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* ── Header ────────────────────────────────────────────────────── */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: colors.surface,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <TouchableOpacity onPress={vm.cancel} style={styles.headerBtn}>
            <Text style={[styles.headerBtnText, { color: colors.danger }]}>
              Cancel
            </Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {vm.isEditing ? 'Edit Expense' : 'Add Expense'}
          </Text>
          <TouchableOpacity
            onPress={vm.save}
            style={styles.headerBtn}
            disabled={!vm.canSave}
          >
            <Text
              style={[
                styles.headerBtnText,
                {
                  color: vm.canSave ? colors.primary : colors.textSecondary,
                  fontWeight: '600',
                },
              ]}
            >
              Save
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
        >
          {/* ── Item Name ──────────────────────────────────────────────── */}
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              ITEM NAME
            </Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  color: colors.text,
                  borderBottomColor: colors.border,
                },
              ]}
              placeholder="e.g. Pizza, Drinks, Hotel..."
              placeholderTextColor={colors.textSecondary}
              value={vm.itemName}
              onChangeText={vm.setItemName}
              returnKeyType="next"
            />
          </View>

          {/* ── Raw Price ──────────────────────────────────────────────── */}
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              ITEM PRICE ($)
            </Text>
            <TextInput
              style={[
                styles.textInput,
                styles.priceInput,
                { color: colors.text, borderBottomColor: colors.border },
              ]}
              placeholder="0.00"
              placeholderTextColor={colors.textSecondary}
              value={vm.rawPrice}
              onChangeText={vm.setRawPrice}
              keyboardType="decimal-pad"
              returnKeyType="done"
            />
          </View>

          {/* ── Quantity ───────────────────────────────────────────────── */}
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              QUANTITY
            </Text>
            <TextInput
              style={[
                styles.textInput,
                styles.priceInput,
                { color: colors.text, borderBottomColor: colors.border },
              ]}
              placeholder="1"
              placeholderTextColor={colors.textSecondary}
              value={vm.quantity}
              onChangeText={vm.setQuantity}
              keyboardType="number-pad"
              returnKeyType="done"
            />
          </View>

          {/* ── Tax Selector ───────────────────────────────────────────── */}
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              TAX BRACKET
            </Text>
            <View style={styles.taxRow}>
              {taxChips.map((opt) => {
                const isSelected = vm.selectedTax === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.taxChip,
                      {
                        backgroundColor: isSelected
                          ? colors.primary
                          : colors.background,
                        borderColor: isSelected
                          ? colors.primary
                          : colors.border,
                      },
                    ]}
                    onPress={() => vm.selectTax(opt.value)}
                  >
                    <Text
                      style={[
                        styles.taxChipText,
                        { color: isSelected ? '#FFFFFF' : colors.text },
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {vm.selectedTax === -1 && (
              <TextInput
                style={[
                  styles.customTaxInput,
                  {
                    color: colors.text,
                    borderColor: colors.border,
                    backgroundColor: colors.background,
                  },
                ]}
                placeholder="Enter custom tax %"
                placeholderTextColor={colors.textSecondary}
                value={vm.customTax}
                onChangeText={vm.setCustomTax}
                keyboardType="decimal-pad"
                returnKeyType="done"
              />
            )}
          </View>

          {/* ── Is Liquor Toggle ───────────────────────────────────────── */}
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <TouchableOpacity
              style={styles.liquorToggleRow}
              onPress={vm.toggleLiquor}
              activeOpacity={0.7}
            >
              <View style={styles.liquorLabelGroup}>
                <Ionicons
                  name="wine"
                  size={20}
                  color={vm.isLiquor ? colors.primary : colors.textSecondary}
                  style={{ marginRight: 8 }}
                />
                <Text style={[styles.liquorLabel, { color: colors.text }]}>
                  Is Liquor
                </Text>
              </View>
              <View
                style={[
                  styles.togglePill,
                  {
                    backgroundColor: vm.isLiquor
                      ? colors.primary
                      : colors.border,
                  },
                ]}
              >
                <View
                  style={[
                    styles.toggleThumb,
                    {
                      transform: [{ translateX: vm.isLiquor ? 20 : 2 }],
                    },
                  ]}
                />
              </View>
            </TouchableOpacity>

            {vm.isLiquor && (
              <View style={styles.liquorFields}>
                <TextInput
                  style={[
                    styles.liquorInput,
                    {
                      color: colors.text,
                      borderColor: colors.border,
                      backgroundColor: colors.background,
                    },
                  ]}
                  placeholder="State ($)"
                  placeholderTextColor={colors.textSecondary}
                  value={vm.liquorStateTax}
                  onChangeText={vm.setLiquorStateTax}
                  keyboardType="decimal-pad"
                  returnKeyType="next"
                />
                <TextInput
                  style={[
                    styles.liquorInput,
                    {
                      color: colors.text,
                      borderColor: colors.border,
                      backgroundColor: colors.background,
                    },
                  ]}
                  placeholder="County ($)"
                  placeholderTextColor={colors.textSecondary}
                  value={vm.liquorCountyTax}
                  onChangeText={vm.setLiquorCountyTax}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                />
              </View>
            )}
          </View>

          {/* ── Calculation Preview ────────────────────────────────────── */}
          {parseFloat(vm.rawPrice) > 0 && (
            <View
              style={[
                styles.calcCard,
                { backgroundColor: colors.primaryLight },
              ]}
            >
              <CalcRow
                label="Unit Price"
                value={formatCurrency(parseFloat(vm.rawPrice) || 0)}
                colors={colors}
              />
              <CalcRow
                label={`Tax (${vm.effectiveTaxRate}%)`}
                value={`+${formatCurrency(vm.taxAmount)}`}
                colors={colors}
              />
              {vm.isLiquor && vm.liquorTaxAmount > 0 && (
                <CalcRow
                  label="Liquor Tax"
                  value={`+${formatCurrency(vm.liquorTaxAmount)}`}
                  colors={colors}
                />
              )}
              {vm.quantityNum > 1 && (
                <CalcRow
                  label={`Quantity`}
                  value={`×${vm.quantityNum}`}
                  colors={colors}
                />
              )}
              <View style={[styles.calcDivider, { borderTopColor: colors.border }]} />
              <CalcRow
                label="Total"
                value={formatCurrency(vm.totalPrice)}
                colors={colors}
                bold
                valueColor={colors.primary}
              />
              {vm.splitCount > 0 && (
                <>
                  <View style={[styles.calcDivider, { borderTopColor: colors.border }]} />
                  <CalcRow
                    label={`Per person (÷${vm.splitCount})`}
                    value={formatCurrency(vm.perPerson)}
                    colors={colors}
                    bold
                    valueColor={colors.success}
                  />
                </>
              )}
            </View>
          )}

          {/* ── People Selector ────────────────────────────────────────── */}
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              SPLIT WITH
            </Text>

            {vm.people.length === 0 ? (
              <Text style={[styles.emptyPeople, { color: colors.textSecondary }]}>
                No people added yet. Go to Sheet Settings → add people first.
              </Text>
            ) : (
              vm.people.map((person, index) => {
                const selected = vm.selectedPeopleIds.has(person.id);
                return (
                  <TouchableOpacity
                    key={person.id}
                    style={[
                      styles.personRow,
                      index < vm.people.length - 1 && {
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderBottomColor: colors.separator,
                      },
                    ]}
                    onPress={() => vm.togglePerson(person.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.personName, { color: colors.text }]}>
                      {person.name}
                    </Text>
                    <View
                      style={[
                        styles.checkbox,
                        {
                          backgroundColor: selected
                            ? colors.primary
                            : 'transparent',
                          borderColor: selected ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      {selected && (
                        <Text style={styles.checkmark}>✓</Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── CalcRow helper ───────────────────────────────────────────────────────────

function CalcRow({
  label,
  value,
  bold = false,
  valueColor,
  colors,
}: {
  label: string;
  value: string;
  bold?: boolean;
  valueColor?: string;
  colors: ReturnType<typeof useAppTheme>;
}) {
  return (
    <View style={styles.calcRow}>
      <Text
        style={[
          styles.calcLabel,
          { color: colors.textSecondary },
          bold && { color: colors.text, fontWeight: '600' },
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          styles.calcValue,
          { color: valueColor ?? colors.text },
          bold && { fontWeight: '700' },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: { minWidth: 60 },
  headerBtnText: { fontSize: 16 },
  headerTitle: { fontSize: 17, fontWeight: '600' },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 20 },
  section: {
    marginTop: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  textInput: {
    fontSize: 18,
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  priceInput: { fontSize: 24, fontWeight: '600' },
  taxRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 2 },
  taxChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  taxChipText: { fontSize: 14, fontWeight: '500' },
  customTaxInput: {
    marginTop: 12,
    fontSize: 15,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 10,
  },
  // Liquor
  liquorToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  liquorLabelGroup: { flexDirection: 'row', alignItems: 'center' },
  liquorLabel: { fontSize: 16, fontWeight: '500' },
  togglePill: {
    width: 44,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  liquorFields: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
  },
  liquorInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderRadius: 10,
    textAlign: 'center',
  },
  // Calc card
  calcCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 14,
    padding: 16,
    gap: 6,
  },
  calcRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  calcDivider: { borderTopWidth: StyleSheet.hairlineWidth, marginVertical: 4 },
  calcLabel: { fontSize: 14 },
  calcValue: { fontSize: 14 },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
  },
  personName: { fontSize: 16 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  emptyPeople: { fontSize: 14, lineHeight: 20, paddingVertical: 4 },
});
