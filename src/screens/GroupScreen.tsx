import React from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '../theme';
import { useGroupViewModel } from '../viewmodels/useGroupViewModel';
import FAB from '../components/FAB';
import { GroupExpense, HomeStackParamList } from '../types';
import { formatCurrency, formatTaxRate } from '../utils/formatters';

type Props = {
  navigation: NativeStackNavigationProp<HomeStackParamList, 'Group'>;
  route: RouteProp<HomeStackParamList, 'Group'>;
};

// ─── Expense Row ─────────────────────────────────────────────────────────────

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
    const scale = dragX.interpolate({
      inputRange: [-80, 0],
      outputRange: [1, 0],
      extrapolate: 'clamp',
    });
    return (
      <TouchableOpacity
        onPress={onDelete}
        style={[styles.deleteAction, { backgroundColor: colors.danger }]}
      >
        <Animated.Text style={[styles.deleteText, { transform: [{ scale }] }]}>
          Delete
        </Animated.Text>
      </TouchableOpacity>
    );
  };

  const renderLeftActions = (
    _progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>,
  ) => {
    const scale = dragX.interpolate({
      inputRange: [0, 80],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    });
    return (
      <TouchableOpacity
        onPress={onEdit}
        style={[styles.editAction, { backgroundColor: '#007AFF' }]}
      >
        <Animated.View style={{ transform: [{ scale }] }}>
          <Ionicons name="pencil" size={20} color="#FFF" />
        </Animated.View>
      </TouchableOpacity>
    );
  };

  return (
    <Swipeable renderRightActions={renderRightActions} renderLeftActions={renderLeftActions} overshootRight={false} overshootLeft={false}>
      <TouchableOpacity
        style={[styles.row, { backgroundColor: colors.surface }]}
        onPress={onPress}
        activeOpacity={0.85}
      >
        <View style={styles.rowLeft}>
          <Text style={[styles.rowItemName, { color: colors.text }]} numberOfLines={1}>
            {expense.itemName}
          </Text>
          <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>
            {formatTaxRate(expense.taxRate)} · paid by {paidByName} · {splitCount}{' '}
            {splitCount === 1 ? 'person' : 'people'}
          </Text>
        </View>
        <View style={styles.rowRight}>
          <Text style={[styles.rowTotal, { color: colors.text }]}>
            {formatCurrency(expense.totalPrice)}
          </Text>
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

// ─── Group Screen ─────────────────────────────────────────────────────────────

export default function GroupScreen({ navigation, route }: Props) {
  const { groupId, groupName } = route.params;
  const colors = useAppTheme();
  const vm = useGroupViewModel(navigation, groupId);

  const confirmDelete = (expense: GroupExpense) => {
    Alert.alert('Delete Item', `Remove "${expense.itemName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => vm.removeExpense(expense.id),
      },
    ]);
  };

  const groupTotal = vm.expenses.reduce((s, e) => s + e.totalPrice, 0);

  const paidByName = (uid: string) =>
    vm.group?.members[uid]?.displayName ?? uid;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      {/* Toolbar */}
      <View style={[styles.toolbar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.toolbarBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.toolbarTitle, { color: colors.text }]} numberOfLines={1}>
          {groupName}
        </Text>
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
              <Ionicons
                name="share-outline"
                size={22}
                color={vm.expenses.length === 0 ? colors.textSecondary : colors.primary}
              />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Expense List */}
      <FlatList
        data={vm.expenses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No expenses yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              Tap + to add your first item
            </Text>
          </View>
        )}
        ListFooterComponent={
          vm.expenses.length > 0 ? (
            <View style={[styles.footer, { borderTopColor: colors.border }]}>
              <Text style={[styles.footerLabel, { color: colors.textSecondary }]}>Group Total</Text>
              <Text style={[styles.footerTotal, { color: colors.primary }]}>
                {formatCurrency(groupTotal)}
              </Text>
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

      <FAB onPress={vm.navigateToAddItem} />

      {/* Share Modal */}
      <Modal
        visible={vm.shareModalVisible}
        transparent
        animationType="fade"
        onRequestClose={vm.closeShareModal}
      >
        <Pressable style={styles.modalOverlay} onPress={vm.closeShareModal}>
          <Pressable style={[styles.modalSheet, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Share as...</Text>

            <TouchableOpacity
              style={[styles.modalOption, { borderColor: colors.border }]}
              onPress={vm.exportAsPdf}
              activeOpacity={0.7}
            >
              <View style={[styles.modalIconWrap, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="document-text-outline" size={22} color={colors.primary} />
              </View>
              <View style={styles.modalOptionText}>
                <Text style={[styles.modalOptionTitle, { color: colors.text }]}>Share PDF</Text>
                <Text style={[styles.modalOptionSub, { color: colors.textSecondary }]}>
                  A formatted PDF copy of the group
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalOption, { borderColor: colors.border }]}
              onPress={vm.exportAsExcel}
              activeOpacity={0.7}
            >
              <View style={[styles.modalIconWrap, { backgroundColor: '#E8F5E9' }]}>
                <Ionicons name="grid-outline" size={22} color="#34C759" />
              </View>
              <View style={styles.modalOptionText}>
                <Text style={[styles.modalOptionTitle, { color: colors.text }]}>Share Excel</Text>
                <Text style={[styles.modalOptionSub, { color: colors.textSecondary }]}>
                  Raw .xlsx file for editing
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalCancel, { borderColor: colors.border }]}
              onPress={vm.closeShareModal}
              activeOpacity={0.7}
            >
              <Text style={[styles.modalCancelText, { color: colors.danger }]}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
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
  listContent: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 90, gap: 10 },
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
  emptyContainer: { flex: 1, alignItems: 'center', paddingTop: 80, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  emptySubtitle: { fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20, color: '#888' },
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 },
  modalTitle: { fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 20 },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  modalIconWrap: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  modalOptionText: { flex: 1 },
  modalOptionTitle: { fontSize: 15, fontWeight: '600' },
  modalOptionSub: { fontSize: 12, marginTop: 2 },
  modalCancel: {
    marginTop: 12,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  modalCancelText: { fontSize: 16, fontWeight: '600' },
});
