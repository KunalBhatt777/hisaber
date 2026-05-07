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
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '../theme';
import { useAddItemViewModel } from '../viewmodels/useAddItemViewModel';
import { HomeStackParamList } from '../types';
import { formatCurrency } from '../utils/formatters';
import DateTimeField from '../components/DateTimeField';

type Props = {
  navigation: NativeStackNavigationProp<HomeStackParamList, 'AddItem'>;
  route: RouteProp<HomeStackParamList, 'AddItem'>;
};

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const colors = useAppTheme();
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.primaryLight }]}>
      <Text style={[styles.avatarText, { color: colors.primary, fontSize: size * 0.38 }]}>
        {name.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

function SectionCard({ children }: { children: React.ReactNode }) {
  const colors = useAppTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      {children}
    </View>
  );
}

function SectionTitle({ label }: { label: string }) {
  const colors = useAppTheme();
  return <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{label}</Text>;
}

function Divider() {
  const colors = useAppTheme();
  return <View style={[styles.divider, { backgroundColor: colors.border }]} />;
}

export default function AddItemScreen({ navigation, route }: Props) {
  const { groupId, expenseId } = route.params;
  const colors = useAppTheme();
  const vm = useAddItemViewModel(navigation, groupId, expenseId);

  const taxOptions = [
    ...vm.enabledTaxOptions.map((v) => ({ label: `${v}%`, value: v })),
    { label: 'Custom', value: -1 },
  ];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>

        {/* ── Header ────────────────────────────────────────────────────── */}
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={vm.cancel} style={styles.headerSide}>
            <Text style={[styles.headerCancel, { color: colors.danger }]}>Cancel</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {vm.isEditing ? 'Edit Expense' : 'Add Expense'}
          </Text>
          <TouchableOpacity onPress={vm.save} style={styles.headerSide} disabled={!vm.canSave}>
            <Text style={[styles.headerSave, { color: vm.canSave ? colors.primary : colors.textSecondary }]}>
              Save
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >

          {/* ── Price Hero ────────────────────────────────────────────────── */}
          <SectionCard>
            <Text style={[styles.priceLabel, { color: colors.textSecondary }]}>AMOUNT</Text>
            <View style={styles.priceRow}>
              <Text style={[styles.priceCurrency, { color: colors.textSecondary }]}>$</Text>
              <TextInput
                style={[styles.priceInput, { color: colors.text }]}
                placeholder="0.00"
                placeholderTextColor={colors.border}
                value={vm.rawPrice}
                onChangeText={vm.setRawPrice}
                keyboardType="decimal-pad"
                returnKeyType="done"
              />
            </View>
            <Divider />
            <TextInput
              style={[styles.nameInput, { color: colors.text }]}
              placeholder="Item name  (e.g. Pizza, Hotel...)"
              placeholderTextColor={colors.textSecondary}
              value={vm.itemName}
              onChangeText={vm.setItemName}
              returnKeyType="next"
            />
            <Divider />
            <DateTimeField value={vm.expenseDate} onChange={vm.setExpenseDate} />
          </SectionCard>

          {/* ── Details ───────────────────────────────────────────────────── */}
          <SectionCard>
            {/* Quantity stepper */}
            <View style={styles.row}>
              <Text style={[styles.rowLabel, { color: colors.text }]}>Quantity</Text>
              <View style={styles.stepper}>
                <TouchableOpacity
                  style={[styles.stepBtn, { backgroundColor: colors.background }]}
                  onPress={() => vm.setQuantity(String(Math.max(1, vm.quantityNum - 1)))}
                >
                  <Ionicons name="remove" size={16} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.stepValue, { color: colors.text }]}>{vm.quantityNum}</Text>
                <TouchableOpacity
                  style={[styles.stepBtn, { backgroundColor: colors.background }]}
                  onPress={() => vm.setQuantity(String(vm.quantityNum + 1))}
                >
                  <Ionicons name="add" size={16} color={colors.text} />
                </TouchableOpacity>
              </View>
            </View>

            <Divider />

            {/* Tax bracket */}
            <View style={styles.taxSection}>
              <Text style={[styles.rowLabel, { color: colors.text }]}>Tax Bracket</Text>
              <View style={styles.chipRow}>
                {taxOptions.map((opt) => {
                  const active = vm.selectedTax === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.chip,
                        active
                          ? { backgroundColor: colors.primary }
                          : { backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1 },
                      ]}
                      onPress={() => vm.selectTax(opt.value)}
                    >
                      <Text style={[styles.chipText, { color: active ? '#FFF' : colors.text }]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {vm.selectedTax === -1 && (
                <TextInput
                  style={[styles.customTaxInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                  placeholder="Custom tax %"
                  placeholderTextColor={colors.textSecondary}
                  value={vm.customTax}
                  onChangeText={vm.setCustomTax}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                />
              )}
            </View>

            <Divider />

            {/* Liquor toggle */}
            <View style={styles.row}>
              <View style={styles.rowLabelGroup}>
                <Ionicons name="wine" size={18} color={vm.isLiquor ? colors.primary : colors.textSecondary} />
                <Text style={[styles.rowLabel, { color: colors.text, marginLeft: 8 }]}>Is Liquor</Text>
              </View>
              <Switch
                value={vm.isLiquor}
                onValueChange={vm.toggleLiquor}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>

            {vm.isLiquor && (
              <View style={styles.liquorRow}>
                <TextInput
                  style={[styles.liquorInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                  placeholder="State tax ($)"
                  placeholderTextColor={colors.textSecondary}
                  value={vm.liquorStateTax}
                  onChangeText={vm.setLiquorStateTax}
                  keyboardType="decimal-pad"
                />
                <TextInput
                  style={[styles.liquorInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                  placeholder="County tax ($)"
                  placeholderTextColor={colors.textSecondary}
                  value={vm.liquorCountyTax}
                  onChangeText={vm.setLiquorCountyTax}
                  keyboardType="decimal-pad"
                />
              </View>
            )}
          </SectionCard>

          {/* ── Calc Preview ──────────────────────────────────────────────── */}
          {parseFloat(vm.rawPrice) > 0 && (
            <View style={[styles.calcCard, { backgroundColor: colors.primaryLight }]}>
              <CalcRow label="Unit price" value={formatCurrency(parseFloat(vm.rawPrice) || 0)} colors={colors} />
              <CalcRow label={`Tax (${vm.effectiveTaxRate}%)`} value={`+ ${formatCurrency(vm.taxAmount)}`} colors={colors} />
              {vm.isLiquor && vm.liquorTaxAmount > 0 && (
                <CalcRow label="Liquor tax" value={`+ ${formatCurrency(vm.liquorTaxAmount)}`} colors={colors} />
              )}
              {vm.quantityNum > 1 && (
                <CalcRow label="Quantity" value={`× ${vm.quantityNum}`} colors={colors} />
              )}
              <View style={[styles.calcDivider, { borderTopColor: colors.primary + '30' }]} />
              <CalcRow label="Total" value={formatCurrency(vm.totalPrice)} colors={colors} bold valueColor={colors.primary} />
              {vm.splitCount > 0 && (
                <CalcRow
                  label={`Per person (÷ ${vm.splitCount})`}
                  value={formatCurrency(vm.perPerson)}
                  colors={colors}
                  valueColor={colors.success}
                />
              )}
            </View>
          )}

          {/* ── Paid By ───────────────────────────────────────────────────── */}
          <SectionCard>
            <SectionTitle label="PAID BY" />
            {vm.members.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Loading members…</Text>
            ) : (
              vm.members.map((member, i) => {
                const selected = vm.paidByUid === member.uid;
                return (
                  <React.Fragment key={member.uid}>
                    {i > 0 && <Divider />}
                    <TouchableOpacity
                      style={styles.memberRow}
                      onPress={() => vm.setPaidByUid(member.uid)}
                      activeOpacity={0.7}
                    >
                      <Avatar name={member.displayName} />
                      <Text style={[styles.memberName, { color: colors.text }]}>{member.displayName}</Text>
                      <View style={[
                        styles.radio,
                        selected
                          ? { backgroundColor: colors.primary, borderColor: colors.primary }
                          : { backgroundColor: 'transparent', borderColor: colors.border },
                      ]}>
                        {selected && <View style={styles.radioDot} />}
                      </View>
                    </TouchableOpacity>
                  </React.Fragment>
                );
              })
            )}
          </SectionCard>

          {/* ── Split With ────────────────────────────────────────────────── */}
          <SectionCard>
            <View style={styles.splitHeader}>
              <SectionTitle label="SPLIT WITH" />
              {vm.members.length > 0 && (
                <TouchableOpacity onPress={() => {
                  const allSelected = vm.members.every((m) => vm.selectedMemberUids.has(m.uid));
                  vm.members.forEach((m) => {
                    const isIn = vm.selectedMemberUids.has(m.uid);
                    if (allSelected ? isIn : !isIn) vm.toggleMember(m.uid);
                  });
                }}>
                  <Text style={[styles.selectAllText, { color: colors.primary }]}>
                    {vm.members.every((m) => vm.selectedMemberUids.has(m.uid)) ? 'Deselect all' : 'Select all'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            {vm.members.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No members yet. Add members in Group Settings.
              </Text>
            ) : (
              vm.members.map((member, i) => {
                const selected = vm.selectedMemberUids.has(member.uid);
                return (
                  <React.Fragment key={member.uid}>
                    {i > 0 && <Divider />}
                    <TouchableOpacity
                      style={styles.memberRow}
                      onPress={() => vm.toggleMember(member.uid)}
                      activeOpacity={0.7}
                    >
                      <Avatar name={member.displayName} />
                      <Text style={[styles.memberName, { color: colors.text }]}>{member.displayName}</Text>
                      <View style={[
                        styles.checkbox,
                        selected
                          ? { backgroundColor: colors.primary, borderColor: colors.primary }
                          : { backgroundColor: 'transparent', borderColor: colors.border },
                      ]}>
                        {selected && <Ionicons name="checkmark" size={14} color="#FFF" />}
                      </View>
                    </TouchableOpacity>
                  </React.Fragment>
                );
              })
            )}
          </SectionCard>

          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── CalcRow ──────────────────────────────────────────────────────────────────

function CalcRow({
  label, value, bold = false, valueColor, colors,
}: {
  label: string; value: string; bold?: boolean; valueColor?: string;
  colors: ReturnType<typeof useAppTheme>;
}) {
  return (
    <View style={styles.calcRow}>
      <Text style={[styles.calcLabel, { color: colors.textSecondary }, bold && { color: colors.text, fontWeight: '600' }]}>
        {label}
      </Text>
      <Text style={[styles.calcValue, { color: valueColor ?? colors.text }, bold && { fontWeight: '700', fontSize: 16 }]}>
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
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerSide: { minWidth: 64 },
  headerCancel: { fontSize: 16 },
  headerTitle: { fontSize: 17, fontWeight: '700' },
  headerSave: { fontSize: 16, fontWeight: '700', textAlign: 'right' },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12 },

  card: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },

  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 12 },

  divider: { height: StyleSheet.hairlineWidth, marginVertical: 2 },

  // Price hero
  priceLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 6 },
  priceRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, marginBottom: 16 },
  priceCurrency: { fontSize: 28, fontWeight: '300', paddingBottom: 4 },
  priceInput: { flex: 1, fontSize: 48, fontWeight: '600', paddingVertical: 0 },
  nameInput: { fontSize: 17, paddingVertical: 14 },

  // Details rows
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  rowLabelGroup: { flexDirection: 'row', alignItems: 'center' },
  rowLabel: { fontSize: 16, fontWeight: '500' },

  // Quantity stepper
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stepBtn: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  stepValue: { fontSize: 17, fontWeight: '600', minWidth: 32, textAlign: 'center' },

  // Tax
  taxSection: { paddingVertical: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  chipText: { fontSize: 14, fontWeight: '500' },
  customTaxInput: {
    marginTop: 12, fontSize: 15, paddingVertical: 9,
    paddingHorizontal: 14, borderWidth: 1, borderRadius: 12,
  },

  // Liquor
  liquorRow: { flexDirection: 'row', gap: 10, paddingBottom: 4 },
  liquorInput: {
    flex: 1, fontSize: 15, paddingVertical: 9,
    paddingHorizontal: 14, borderWidth: 1, borderRadius: 12, textAlign: 'center',
  },

  // Calc card
  calcCard: { borderRadius: 16, padding: 16, gap: 8 },
  calcRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  calcDivider: { borderTopWidth: StyleSheet.hairlineWidth, marginVertical: 2 },
  calcLabel: { fontSize: 14 },
  calcValue: { fontSize: 14, fontWeight: '500' },

  // Member rows
  splitHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectAllText: { fontSize: 13, fontWeight: '600' },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  avatar: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontWeight: '700' },
  memberName: { flex: 1, fontSize: 16, fontWeight: '500' },

  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#FFF' },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },

  emptyText: { fontSize: 14, paddingVertical: 8, lineHeight: 20 },
});
