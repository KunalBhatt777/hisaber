import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  Modal,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '../theme';
import { useGroupSummaryViewModel } from '../viewmodels/useGroupSummaryViewModel';
import { BalanceEntry, HomeStackParamList } from '../types';
import { formatCurrency } from '../utils/formatters';
import { auth } from '../firebase/config';
import DateTimeField from '../components/DateTimeField';

type Props = {
  navigation: NativeStackNavigationProp<HomeStackParamList, 'GroupSummary'>;
  route: RouteProp<HomeStackParamList, 'GroupSummary'>;
};

function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const colors = useAppTheme();
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.primaryLight },
      ]}
    >
      <Text style={[styles.avatarText, { color: colors.primary, fontSize: size * 0.38 }]}>
        {name.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

// ─── Payment Modal ────────────────────────────────────────────────────────────

function PaymentModal({
  visible,
  entry,
  mode,
  submitting,
  onConfirm,
  onClose,
}: {
  visible: boolean;
  entry: BalanceEntry | null;
  mode: 'record' | 'settle';
  submitting: boolean;
  onConfirm: (amount: number, note: string, date: Date) => void;
  onClose: () => void;
}) {
  const colors = useAppTheme();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());

  React.useEffect(() => {
    if (visible && entry) {
      setAmount(mode === 'settle' ? entry.amount.toFixed(2) : '');
      setNote('');
      setPaymentDate(new Date());
    }
  }, [visible, entry, mode]);

  const parsedAmount = parseFloat(amount);
  const canSubmit = !isNaN(parsedAmount) && parsedAmount > 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.modalOverlay} onPress={onClose}>
          <Pressable style={[styles.modalBox, { backgroundColor: colors.surface }]} onPress={() => {}}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {mode === 'settle' ? 'Settle Up' : 'Record Payment'}
            </Text>

            {entry && (
              <View style={[styles.debtSummary, { backgroundColor: colors.background }]}>
                <View style={styles.debtParty}>
                  <Avatar name={entry.fromName} size={36} />
                  <Text style={[styles.debtName, { color: colors.text }]}>{entry.fromName}</Text>
                  <Text style={[styles.debtRole, { color: colors.textSecondary }]}>pays</Text>
                </View>
                <Ionicons name="arrow-forward" size={20} color={colors.border} />
                <View style={styles.debtParty}>
                  <Avatar name={entry.toName} size={36} />
                  <Text style={[styles.debtName, { color: colors.text }]}>{entry.toName}</Text>
                  <Text style={[styles.debtRole, { color: colors.textSecondary }]}>receives</Text>
                </View>
              </View>
            )}

            <View style={[styles.dateFieldWrap, { borderColor: colors.border }]}>
              <DateTimeField value={paymentDate} onChange={setPaymentDate} />
            </View>

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>AMOUNT</Text>
            <TextInput
              style={[styles.amountInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder={entry ? `Max ${formatCurrency(entry.amount)}` : '0.00'}
              placeholderTextColor={colors.textSecondary}
              autoFocus={mode === 'record'}
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary, marginTop: 12 }]}>NOTE (OPTIONAL)</Text>
            <TextInput
              style={[styles.noteInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              value={note}
              onChangeText={setNote}
              placeholder="e.g. Venmo, cash..."
              placeholderTextColor={colors.textSecondary}
              returnKeyType="done"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
                <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: canSubmit ? colors.primary : colors.border, opacity: submitting ? 0.7 : 1 }]}
                onPress={() => canSubmit && onConfirm(parsedAmount, note.trim(), paymentDate)}
                disabled={!canSubmit || submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.confirmBtnText}>Confirm</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Balance Card ─────────────────────────────────────────────────────────────

function BalanceCard({
  entry,
  selected,
  onPress,
  onRecordPayment,
  onSettleUp,
}: {
  entry: BalanceEntry;
  selected: boolean;
  onPress: () => void;
  onRecordPayment: () => void;
  onSettleUp: () => void;
}) {
  const colors = useAppTheme();
  return (
    <View>
      <TouchableOpacity
        style={[
          styles.balanceCard,
          { backgroundColor: colors.card, borderColor: selected ? colors.primary : 'transparent', borderWidth: selected ? 1.5 : 0 },
        ]}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <Avatar name={entry.fromName} size={36} />
        <View style={styles.balanceArrow}>
          <Text style={[styles.balanceFrom, { color: colors.text }]} numberOfLines={1}>
            {entry.fromName}
          </Text>
          <View style={styles.arrowRow}>
            <View style={[styles.arrowLine, { backgroundColor: colors.border }]} />
            <Ionicons name="arrow-forward" size={14} color={colors.textSecondary} />
          </View>
          <Text style={[styles.balanceTo, { color: colors.textSecondary }]} numberOfLines={1}>
            {entry.toName}
          </Text>
        </View>
        <Text style={[styles.balanceAmount, { color: colors.danger }]}>
          {formatCurrency(entry.amount)}
        </Text>
      </TouchableOpacity>

      {selected && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={onRecordPayment}
          >
            <Ionicons name="pencil-outline" size={15} color={colors.primary} />
            <Text style={[styles.actionBtnText, { color: colors.primary }]}>Record Payment</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.primary }]}
            onPress={onSettleUp}
          >
            <Ionicons name="checkmark-circle-outline" size={15} color="#FFF" />
            <Text style={[styles.actionBtnText, { color: '#FFF' }]}>Settle Up</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function GroupSummaryScreen({ navigation, route }: Props) {
  const { groupId } = route.params;
  const colors = useAppTheme();
  const vm = useGroupSummaryViewModel(groupId);
  const currentUid = auth.currentUser?.uid ?? '';

  const [selectedEntry, setSelectedEntry] = useState<BalanceEntry | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState<'record' | 'settle'>('record');

  const members = vm.group ? Object.entries(vm.group.members) : [];
  const groupTotal = vm.expenses.reduce((s, e) => s + e.totalPrice, 0);

  const handleBalanceTap = (entry: BalanceEntry) => {
    const involved = currentUid === entry.fromUid || currentUid === entry.toUid;
    if (!involved) {
      Alert.alert(
        'Not Involved',
        'Only the people in this debt can record a payment.',
      );
      return;
    }
    setSelectedEntry(prev =>
      prev?.fromUid === entry.fromUid && prev?.toUid === entry.toUid ? null : entry,
    );
  };

  const openModal = (mode: 'record' | 'settle') => {
    setModalMode(mode);
    setModalVisible(true);
  };

  const handleConfirm = async (amount: number, note: string, date: Date) => {
    if (!selectedEntry) return;
    await vm.submitPayment(selectedEntry, amount, note, date.toISOString());
    setModalVisible(false);
    setSelectedEntry(null);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Toolbar */}
      <View style={[styles.toolbar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.toolbarBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.toolbarTitle, { color: colors.text }]}>
          {vm.group?.name ?? 'Summary'}
        </Text>
        <View style={styles.toolbarBtn} />
      </View>

      {vm.loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* ── Totals ──────────────────────────────────────────────── */}
          <View style={[styles.totalsCard, { backgroundColor: colors.surface }]}>
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Group Total</Text>
              <Text style={[styles.totalAmount, { color: colors.primary }]}>
                {formatCurrency(groupTotal)}
              </Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.separator }]} />
            <View style={styles.totalRow}>
              <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Expenses</Text>
              <Text style={[styles.totalAmount, { color: colors.text }]}>{vm.expenses.length}</Text>
            </View>
            {vm.payments.length > 0 && (
              <>
                <View style={[styles.divider, { backgroundColor: colors.separator }]} />
                <View style={styles.totalRow}>
                  <Text style={[styles.totalLabel, { color: colors.textSecondary }]}>Payments</Text>
                  <Text style={[styles.totalAmount, { color: colors.success }]}>{vm.payments.length}</Text>
                </View>
              </>
            )}
          </View>

          {/* ── Members ────────────────────────────────────────────── */}
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            MEMBERS ({members.length})
          </Text>
          <View style={styles.membersRow}>
            {members.map(([uid, m]) => (
              <View key={uid} style={styles.memberItem}>
                <Avatar name={m.displayName} size={48} />
                <Text style={[styles.memberName, { color: colors.text }]} numberOfLines={1}>
                  {m.displayName.split(' ')[0]}
                </Text>
              </View>
            ))}
          </View>

          {/* ── Balances ───────────────────────────────────────────── */}
          <View style={styles.balanceHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
              BALANCES
            </Text>
            <Text style={[styles.balanceMode, { color: colors.primary }]}>
              {vm.group?.simplifyDebts ? 'Simplified' : 'Raw'}
            </Text>
          </View>

          {vm.balances.length === 0 ? (
            <View style={[styles.allSettledCard, { backgroundColor: colors.surface }]}>
              <Ionicons name="checkmark-circle" size={40} color={colors.success} />
              <Text style={[styles.allSettledTitle, { color: colors.text }]}>All Settled!</Text>
              <Text style={[styles.allSettledSub, { color: colors.textSecondary }]}>
                No outstanding balances in this group.
              </Text>
            </View>
          ) : (
            <>
              <Text style={[styles.tapHint, { color: colors.textSecondary }]}>
                Tap a row to record a payment
              </Text>
              {vm.balances.map((entry, i) => (
                <BalanceCard
                  key={`${entry.fromUid}-${entry.toUid}-${i}`}
                  entry={entry}
                  selected={
                    selectedEntry?.fromUid === entry.fromUid &&
                    selectedEntry?.toUid === entry.toUid
                  }
                  onPress={() => handleBalanceTap(entry)}
                  onRecordPayment={() => openModal('record')}
                  onSettleUp={() => openModal('settle')}
                />
              ))}
            </>
          )}

          {vm.group && !vm.group.simplifyDebts && vm.balances.length > 0 && (
            <Text style={[styles.modeHint, { color: colors.textSecondary }]}>
              Enable "Simplify Debts" in Group Settings to minimize transactions.
            </Text>
          )}
        </ScrollView>
      )}

      <PaymentModal
        visible={modalVisible}
        entry={selectedEntry}
        mode={modalMode}
        submitting={vm.submitting}
        onConfirm={handleConfirm}
        onClose={() => setModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  toolbarBtn: { padding: 6, minWidth: 36, alignItems: 'center' },
  toolbarTitle: { flex: 1, fontSize: 17, fontWeight: '600', textAlign: 'center' },
  scrollContent: { paddingBottom: 40 },
  totalsCard: { margin: 16, borderRadius: 14, overflow: 'hidden' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  totalLabel: { fontSize: 14 },
  totalAmount: { fontSize: 17, fontWeight: '700' },
  divider: { height: StyleSheet.hairlineWidth },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  membersRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 16, marginBottom: 8 },
  memberItem: { alignItems: 'center', gap: 6, maxWidth: 70 },
  memberName: { fontSize: 12, fontWeight: '500', textAlign: 'center' },
  avatar: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontWeight: '700' },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 20,
  },
  balanceMode: { fontSize: 12, fontWeight: '600' },
  tapHint: { fontSize: 12, textAlign: 'center', marginBottom: 10 },
  balanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 4,
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  balanceArrow: { flex: 1 },
  balanceFrom: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  arrowRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  arrowLine: { flex: 1, height: 1 },
  balanceTo: { fontSize: 13 },
  balanceAmount: { fontSize: 16, fontWeight: '700' },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 10,
    marginTop: 0,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  actionBtnText: { fontSize: 13, fontWeight: '600' },
  allSettledCard: {
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 32,
    alignItems: 'center',
    gap: 10,
  },
  allSettledTitle: { fontSize: 18, fontWeight: '700' },
  allSettledSub: { fontSize: 14, textAlign: 'center' },
  modeHint: { fontSize: 12, textAlign: 'center', marginTop: 8, marginHorizontal: 32 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { width: '88%', borderRadius: 16, padding: 24, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16, textAlign: 'center' },
  debtSummary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 12, padding: 14, marginBottom: 20 },
  debtParty: { alignItems: 'center', gap: 4, flex: 1 },
  debtName: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  debtRole: { fontSize: 11, textAlign: 'center' },
  inputLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 6 },
  amountInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 20, fontWeight: '600', textAlign: 'center', marginBottom: 4 },
  noteInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15 },
  dateFieldWrap: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, marginBottom: 16 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 20 },
  cancelBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10 },
  cancelBtnText: { fontSize: 15, fontWeight: '600' },
  confirmBtn: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: 10, minWidth: 100, alignItems: 'center' },
  confirmBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
});
