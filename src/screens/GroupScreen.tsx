import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Animated,
  Modal,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '../theme';
import { useGroupViewModel } from '../viewmodels/useGroupViewModel';
import { useReceiptScannerViewModel, InvalidReceiptError, ParseFailureError, RateLimitError } from '../viewmodels/useReceiptScannerViewModel';
import FAB from '../components/FAB';
import DateTimeField from '../components/DateTimeField';
import { GroupExpense, GroupPayment, HomeStackParamList, ScanItem } from '../types';
import { formatCurrency, formatTaxRate } from '../utils/formatters';

type Props = {
  navigation: NativeStackNavigationProp<HomeStackParamList, 'Group'>;
  route: RouteProp<HomeStackParamList, 'Group'>;
};

// ─── Expense Row ──────────────────────────────────────────────────────────────

function ExpenseRow({
  expense,
  paidByName,
  onPress,
  onDelete,
  onEdit,
}: {
  expense: GroupExpense;
  paidByName: string;
  onPress: () => void;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const colors = useAppTheme();
  const splitCount = Object.keys(expense.splits).length;

  const renderRightActions = (
    _progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
  ) => {
    const scale = dragX.interpolate({ inputRange: [-80, 0], outputRange: [1, 0], extrapolate: 'clamp' });
    return (
      <TouchableOpacity onPress={onDelete} style={[styles.deleteAction, { backgroundColor: colors.danger }]}>
        <Animated.Text style={[styles.deleteText, { transform: [{ scale }] }]}>Delete</Animated.Text>
      </TouchableOpacity>
    );
  };

  const renderLeftActions = (
    _progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
  ) => {
    const scale = dragX.interpolate({ inputRange: [0, 80], outputRange: [0, 1], extrapolate: 'clamp' });
    return (
      <TouchableOpacity onPress={onEdit} style={[styles.editAction, { backgroundColor: '#007AFF' }]}>
        <Animated.View style={{ transform: [{ scale }] }}>
          <Ionicons name="pencil" size={20} color="#FFF" />
        </Animated.View>
      </TouchableOpacity>
    );
  };

  return (
    <Swipeable renderRightActions={renderRightActions} renderLeftActions={renderLeftActions} overshootRight={false} overshootLeft={false}>
      <TouchableOpacity style={[styles.row, { backgroundColor: colors.surface }]} onPress={onPress} activeOpacity={0.85}>
        <View style={styles.rowLeft}>
          <Text style={[styles.rowItemName, { color: colors.text }]} numberOfLines={1}>{expense.itemName}</Text>
          <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>
            {formatTaxRate(expense.taxRate)} · paid by {paidByName} · {splitCount} {splitCount === 1 ? 'person' : 'people'}
          </Text>
        </View>
        <View style={styles.rowRight}>
          <Text style={[styles.rowTotal, { color: colors.text }]}>{formatCurrency(expense.totalPrice)}</Text>
          {splitCount > 0 && (
            <Text style={[styles.rowPerPerson, { color: colors.primary }]}>
              {formatCurrency(expense.totalPrice / splitCount)}/ea
            </Text>
          )}
        </View>
        <Ionicons name="chevron-forward" size={14} color={colors.textSecondary} style={styles.chevron} />
      </TouchableOpacity>
    </Swipeable>
  );
}

// ─── Payment Row ──────────────────────────────────────────────────────────────

function PaymentRow({ payment }: { payment: GroupPayment }) {
  const colors = useAppTheme();
  const date = new Date(payment.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return (
    <View style={[styles.paymentRow, { backgroundColor: colors.surface }]}>
      <View style={[styles.paymentIconWrap, { backgroundColor: '#E8F8F0' }]}>
        <Ionicons name="swap-horizontal" size={18} color="#34C759" />
      </View>
      <View style={styles.paymentBody}>
        <Text style={[styles.paymentTitle, { color: colors.text }]} numberOfLines={1}>
          {payment.paidByName} → {payment.paidToName}
        </Text>
        <Text style={[styles.paymentMeta, { color: colors.textSecondary }]}>
          {payment.note ? `${payment.note} · ` : ''}{date}
        </Text>
      </View>
      <Text style={[styles.paymentAmount, { color: '#34C759' }]}>
        {formatCurrency(payment.amount)}
      </Text>
    </View>
  );
}

// ─── Add Payment Modal ────────────────────────────────────────────────────────

function AddPaymentModal({
  visible,
  members,
  submitting,
  onConfirm,
  onClose,
}: {
  visible: boolean;
  members: Record<string, { displayName: string; username: string }>;
  submitting: boolean;
  onConfirm: (paidBy: string, paidTo: string, paidByName: string, paidToName: string, amount: number, note: string, date: Date) => void;
  onClose: () => void;
}) {
  const colors = useAppTheme();
  const memberList = Object.entries(members).map(([uid, m]) => ({ uid, ...m }));

  const [paidBy, setPaidBy] = useState<string | null>(null);
  const [paidTo, setPaidTo] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [step, setStep] = useState<'payer' | 'receiver' | 'amount'>('payer');

  const reset = () => {
    setPaidBy(null);
    setPaidTo(null);
    setAmount('');
    setNote('');
    setStep('payer');
  };

  useEffect(() => {
    if (visible) setPaymentDate(new Date());
    else reset();
  }, [visible]);

  const handleClose = () => { reset(); onClose(); };

  const parsedAmount = parseFloat(amount);
  const canSubmit = paidBy && paidTo && !isNaN(parsedAmount) && parsedAmount > 0;

  const handleConfirm = () => {
    if (!canSubmit || !paidBy || !paidTo) return;
    const from = members[paidBy];
    const to = members[paidTo];
    onConfirm(paidBy, paidTo, from.displayName, to.displayName, parsedAmount, note.trim(), paymentDate);
  };

  const stepTitle = step === 'payer' ? 'Who paid?' : step === 'receiver' ? 'Who received?' : 'Amount & Note';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.addPayModalOverlay} onPress={handleClose}>
          <Pressable style={[styles.addPaySheet, { backgroundColor: colors.surface }]} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { color: colors.text }]}>Add Payment</Text>
            <Text style={[styles.sheetStep, { color: colors.textSecondary }]}>{stepTitle}</Text>

            {/* Step 1: Payer */}
            {step === 'payer' && (
              <ScrollView style={styles.memberScroll} showsVerticalScrollIndicator={false}>
                {memberList.map((m) => (
                  <TouchableOpacity
                    key={m.uid}
                    style={[styles.memberPickRow, { borderColor: colors.border }]}
                    onPress={() => { setPaidBy(m.uid); setStep('receiver'); }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.memberPickAvatar, { backgroundColor: colors.primaryLight }]}>
                      <Text style={[styles.memberPickAvatarText, { color: colors.primary }]}>
                        {m.displayName.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text style={[styles.memberPickName, { color: colors.text }]}>{m.displayName}</Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.border} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Step 2: Receiver */}
            {step === 'receiver' && (
              <>
                <TouchableOpacity onPress={() => setStep('payer')} style={styles.backRow}>
                  <Ionicons name="chevron-back" size={16} color={colors.primary} />
                  <Text style={[styles.backText, { color: colors.primary }]}>
                    Payer: {paidBy ? members[paidBy]?.displayName : ''}
                  </Text>
                </TouchableOpacity>
                <ScrollView style={styles.memberScroll} showsVerticalScrollIndicator={false}>
                  {memberList.filter((m) => m.uid !== paidBy).map((m) => (
                    <TouchableOpacity
                      key={m.uid}
                      style={[styles.memberPickRow, { borderColor: colors.border }]}
                      onPress={() => { setPaidTo(m.uid); setStep('amount'); }}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.memberPickAvatar, { backgroundColor: colors.primaryLight }]}>
                        <Text style={[styles.memberPickAvatarText, { color: colors.primary }]}>
                          {m.displayName.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <Text style={[styles.memberPickName, { color: colors.text }]}>{m.displayName}</Text>
                      <Ionicons name="chevron-forward" size={16} color={colors.border} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            )}

            {/* Step 3: Amount */}
            {step === 'amount' && (
              <>
                <TouchableOpacity onPress={() => setStep('receiver')} style={styles.backRow}>
                  <Ionicons name="chevron-back" size={16} color={colors.primary} />
                  <Text style={[styles.backText, { color: colors.primary }]}>
                    {paidBy ? members[paidBy]?.displayName : ''} → {paidTo ? members[paidTo]?.displayName : ''}
                  </Text>
                </TouchableOpacity>

                <View style={[styles.dateFieldWrap, { borderColor: colors.border }]}>
                  <DateTimeField value={paymentDate} onChange={setPaymentDate} />
                </View>

                <TextInput
                  style={[styles.bigAmountInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={colors.textSecondary}
                  autoFocus
                />

                <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>NOTE (OPTIONAL)</Text>
                <TextInput
                  style={[styles.noteInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                  value={note}
                  onChangeText={setNote}
                  placeholder="e.g. Venmo, cash, bank transfer..."
                  placeholderTextColor={colors.textSecondary}
                  returnKeyType="done"
                />

                <TouchableOpacity
                  style={[styles.submitBtn, { backgroundColor: canSubmit ? colors.primary : colors.border, opacity: submitting ? 0.7 : 1 }]}
                  onPress={handleConfirm}
                  disabled={!canSubmit || submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.submitBtnText}>Record Payment</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Group Screen ─────────────────────────────────────────────────────────────

export default function GroupScreen({ navigation, route }: Props) {
  const { groupId, groupName } = route.params;
  const colors = useAppTheme();
  const vm = useGroupViewModel(navigation, groupId);
  const scanner = useReceiptScannerViewModel();

  const [addPaymentVisible, setAddPaymentVisible] = useState(false);
  const [addPaymentSubmitting, setAddPaymentSubmitting] = useState(false);
  const [sourcePickerVisible, setSourcePickerVisible] = useState(false);
  const [scanErrorVisible, setScanErrorVisible] = useState(false);
  const [scanErrorMsg, setScanErrorMsg] = useState('');

  const confirmDelete = (expense: GroupExpense) => {
    Alert.alert('Delete Item', `Remove "${expense.itemName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => vm.removeExpense(expense.id) },
    ]);
  };

  const groupTotal = vm.expenses.reduce((s, e) => s + e.totalPrice, 0);
  const paidByName = (uid: string) => vm.group?.members[uid]?.displayName ?? uid;

  const handleAddPayment = async (
    paidBy: string, paidTo: string,
    paidByName: string, paidToName: string,
    amount: number, note: string, date: Date,
  ) => {
    setAddPaymentSubmitting(true);
    try {
      await vm.submitPayment(paidBy, paidTo, paidByName, paidToName, amount, note, date.toISOString());
      setAddPaymentVisible(false);
    } finally {
      setAddPaymentSubmitting(false);
    }
  };

  const handleSourcePick = async (source: 'camera' | 'gallery') => {
    setSourcePickerVisible(false);
    try {
      const result = await scanner.pickAndScan(source);
      if (!result) return;

      const storePrefix = result.storeName?.trim()
        ? `${result.storeName.trim().toLowerCase()}-`
        : '';

      const scanItems: ScanItem[] = result.items.map((item) => ({
        prefillName: `${storePrefix}${item.name.toLowerCase()}`,
        price: item.price,
      }));

      navigation.navigate('AddItem', {
        groupId,
        prefillName: scanItems[0].prefillName,
        prefillPrice: scanItems[0].price,
        scanItems,
        scanIndex: 0,
      });
    } catch (e) {
      if (e instanceof InvalidReceiptError) {
        setScanErrorMsg('Please upload a valid receipt. Make sure the image shows item names and prices.');
        setScanErrorVisible(true);
      } else if (e instanceof ParseFailureError) {
        setScanErrorMsg('Please upload a clearer picture of your receipt so the items can be read properly.');
        setScanErrorVisible(true);
      } else if (e instanceof RateLimitError) {
        setScanErrorMsg('The AI service is busy right now. Please wait a moment and try again.');
        setScanErrorVisible(true);
      }
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Toolbar */}
      <View style={[styles.toolbar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.toolbarBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.toolbarTitle, { color: colors.text }]} numberOfLines={1}>{groupName}</Text>
        <View style={styles.toolbarActions}>
          <TouchableOpacity onPress={vm.navigateToSummary} style={styles.toolbarBtn}>
            <Ionicons name="bar-chart-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={vm.navigateToSettings} style={styles.toolbarBtn}>
            <Ionicons name="people-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={vm.openShareModal}
            style={styles.toolbarBtn}
            disabled={vm.isExporting || vm.expenses.length === 0}
          >
            {vm.isExporting ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="share-outline" size={22} color={vm.expenses.length === 0 ? colors.textSecondary : colors.primary} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Bar */}
      <View style={[styles.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.separator }]}>
        {(['expenses', 'payments'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, vm.activeTab === tab && { borderBottomColor: colors.primary }]}
            onPress={() => vm.setActiveTab(tab)}
          >
            <Text style={[styles.tabText, { color: vm.activeTab === tab ? colors.primary : colors.textSecondary }]}>
              {tab === 'expenses' ? `Expenses${vm.expenses.length ? ` (${vm.expenses.length})` : ''}` : `Payments${vm.payments.length ? ` (${vm.payments.length})` : ''}`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Expenses Tab */}
      {vm.activeTab === 'expenses' && (
        <FlatList
          data={vm.expenses}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={() =>
            vm.loading ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 48 }} />
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No expenses yet</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>Tap + to add your first item</Text>
              </View>
            )
          }
          ListFooterComponent={
            vm.expenses.length > 0 ? (
              <View style={[styles.footer, { borderTopColor: colors.border }]}>
                <Text style={[styles.footerLabel, { color: colors.textSecondary }]}>Group Total</Text>
                <Text style={[styles.footerTotal, { color: colors.primary }]}>{formatCurrency(groupTotal)}</Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <ExpenseRow
              expense={item}
              paidByName={paidByName(item.paidBy)}
              onPress={() => vm.navigateToItemDetail(item)}
              onDelete={() => confirmDelete(item)}
              onEdit={() => vm.navigateToEditItem(item)}
            />
          )}
        />
      )}

      {/* Payments Tab */}
      {vm.activeTab === 'payments' && (
        <FlatList
          data={vm.payments}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={() =>
            vm.loading ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: 48 }} />
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No payments yet</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  Tap + to record a payment between members
                </Text>
              </View>
            )
          }
          renderItem={({ item }) => <PaymentRow payment={item} />}
        />
      )}

      <FAB
        onPress={vm.activeTab === 'expenses' ? vm.navigateToAddItem : () => setAddPaymentVisible(true)}
        onCameraPress={vm.activeTab === 'expenses' ? () => setSourcePickerVisible(true) : undefined}
      />

      {/* Share Modal */}
      <Modal visible={vm.shareModalVisible} transparent animationType="fade" onRequestClose={vm.closeShareModal}>
        <Pressable style={styles.modalOverlay} onPress={vm.closeShareModal}>
          <Pressable style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Share as...</Text>
            <TouchableOpacity style={[styles.modalOption, { borderColor: colors.border }]} onPress={vm.exportAsPdf} activeOpacity={0.7}>
              <View style={[styles.modalIconWrap, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="document-text-outline" size={22} color={colors.primary} />
              </View>
              <View style={styles.modalOptionText}>
                <Text style={[styles.modalOptionTitle, { color: colors.text }]}>Share PDF</Text>
                <Text style={[styles.modalOptionSub, { color: colors.textSecondary }]}>A formatted PDF copy of the group</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalOption, { borderColor: colors.border }]} onPress={vm.exportAsExcel} activeOpacity={0.7}>
              <View style={[styles.modalIconWrap, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="grid-outline" size={22} color="#34C759" />
              </View>
              <View style={styles.modalOptionText}>
                <Text style={[styles.modalOptionTitle, { color: colors.text }]}>Share Excel</Text>
                <Text style={[styles.modalOptionSub, { color: colors.textSecondary }]}>Raw .xlsx file for editing</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalCancel, { borderColor: colors.border }]} onPress={vm.closeShareModal} activeOpacity={0.7}>
              <Text style={[styles.modalCancelText, { color: colors.danger }]}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Add Payment Modal */}
      {vm.group && (
        <AddPaymentModal
          visible={addPaymentVisible}
          members={vm.group.members}
          submitting={addPaymentSubmitting}
          onConfirm={handleAddPayment}
          onClose={() => setAddPaymentVisible(false)}
        />
      )}

      {/* Source Picker Modal */}
      <Modal visible={sourcePickerVisible} transparent animationType="slide" onRequestClose={() => setSourcePickerVisible(false)}>
        <Pressable style={styles.addPayModalOverlay} onPress={() => setSourcePickerVisible(false)}>
          <Pressable style={[styles.addPaySheet, { backgroundColor: colors.surface }]} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <Text style={[styles.sheetTitle, { color: colors.text }]}>Scan Receipt</Text>
            <Text style={[styles.sheetStep, { color: colors.textSecondary }]}>Choose image source</Text>
            <TouchableOpacity
              style={[styles.memberPickRow, { borderColor: colors.border }]}
              onPress={() => handleSourcePick('camera')}
              activeOpacity={0.7}
            >
              <View style={[styles.memberPickAvatar, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="camera-outline" size={20} color={colors.primary} />
              </View>
              <Text style={[styles.memberPickName, { color: colors.text }]}>Take Photo</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.border} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.memberPickRow, { borderColor: colors.border }]}
              onPress={() => handleSourcePick('gallery')}
              activeOpacity={0.7}
            >
              <View style={[styles.memberPickAvatar, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="image-outline" size={20} color={colors.primary} />
              </View>
              <Text style={[styles.memberPickName, { color: colors.text }]}>Choose from Gallery</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.border} />
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Scan Loader Modal */}
      <Modal visible={scanner.loading} transparent animationType="fade">
        <View style={styles.loaderOverlay}>
          <View style={[styles.loaderCard, { backgroundColor: colors.surface }]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loaderTitle, { color: colors.text }]}>Scanning receipt…</Text>
            <Text style={[styles.loaderSub, { color: colors.textSecondary }]}>
              This is AI and can make mistakes
            </Text>
          </View>
        </View>
      </Modal>

      {/* Scan Error Modal */}
      <Modal visible={scanErrorVisible} transparent animationType="fade" onRequestClose={() => setScanErrorVisible(false)}>
        <Pressable style={styles.loaderOverlay} onPress={() => setScanErrorVisible(false)}>
          <View style={[styles.loaderCard, { backgroundColor: colors.surface }]}>
            <Ionicons name="alert-circle-outline" size={40} color={colors.danger} />
            <Text style={[styles.loaderTitle, { color: colors.text }]}>Invalid Receipt</Text>
            <Text style={[styles.loaderSub, { color: colors.textSecondary }]}>
              {scanErrorMsg}
            </Text>
            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: colors.primary, marginTop: 16, paddingHorizontal: 24 }]}
              onPress={() => setScanErrorVisible(false)}
            >
              <Text style={styles.submitBtnText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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
  toolbarActions: { flexDirection: 'row', gap: 2 },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: { fontSize: 14, fontWeight: '600' },
  listContent: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 90, gap: 10 },
  // Expense row
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  rowLeft: { flex: 1 },
  rowItemName: { fontSize: 15, fontWeight: '600' },
  rowMeta: { fontSize: 12, marginTop: 3 },
  rowRight: { alignItems: 'flex-end', marginRight: 6 },
  rowTotal: { fontSize: 15, fontWeight: '600' },
  rowPerPerson: { fontSize: 12, marginTop: 2, fontWeight: '500' },
  chevron: { marginLeft: 4 },
  deleteAction: { justifyContent: 'center', alignItems: 'center', width: 80, borderRadius: 16, marginLeft: 6 },
  deleteText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  editAction: { justifyContent: 'center', alignItems: 'center', width: 80, borderRadius: 16, marginRight: 6 },
  // Payment row
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
    gap: 12,
  },
  paymentIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  paymentBody: { flex: 1 },
  paymentTitle: { fontSize: 15, fontWeight: '600' },
  paymentMeta: { fontSize: 12, marginTop: 2 },
  paymentAmount: { fontSize: 16, fontWeight: '700' },
  // Misc
  emptyContainer: { flex: 1, alignItems: 'center', paddingTop: 80, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  emptySubtitle: { fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 4,
    marginHorizontal: 16,
  },
  footerLabel: { fontSize: 14, fontWeight: '500' },
  footerTotal: { fontSize: 20, fontWeight: '700' },
  // Share modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 },
  modalTitle: { fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 20 },
  modalOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth, gap: 12 },
  modalIconWrap: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  modalOptionText: { flex: 1 },
  modalOptionTitle: { fontSize: 15, fontWeight: '600' },
  modalOptionSub: { fontSize: 12, marginTop: 2 },
  modalCancel: { marginTop: 12, paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth, alignItems: 'center' },
  modalCancelText: { fontSize: 16, fontWeight: '600' },
  // Add Payment Modal
  addPayModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  addPaySheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36, maxHeight: '75%' },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#ccc', alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  sheetStep: { fontSize: 13, marginBottom: 16 },
  memberScroll: { maxHeight: 300 },
  memberPickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  memberPickAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  memberPickAvatarText: { fontSize: 15, fontWeight: '700' },
  memberPickName: { flex: 1, fontSize: 15, fontWeight: '500' },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 16 },
  backText: { fontSize: 14, fontWeight: '600' },
  bigAmountInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 20,
  },
  inputLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, marginBottom: 6 },
  noteInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, marginBottom: 20 },
  submitBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  dateFieldWrap: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, marginBottom: 16, borderStyle: 'solid' },
  loaderOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  loaderCard: {
    width: 280,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  loaderTitle: { fontSize: 17, fontWeight: '700', textAlign: 'center' },
  loaderSub: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
});
