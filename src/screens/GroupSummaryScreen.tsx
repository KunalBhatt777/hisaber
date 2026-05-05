import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '../theme';
import { useGroupSummaryViewModel } from '../viewmodels/useGroupSummaryViewModel';
import { BalanceEntry, HomeStackParamList } from '../types';
import { formatCurrency } from '../utils/formatters';

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
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.primaryLight,
        },
      ]}
    >
      <Text style={[styles.avatarText, { color: colors.primary, fontSize: size * 0.38 }]}>
        {name.charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

function BalanceCard({ entry }: { entry: BalanceEntry }) {
  const colors = useAppTheme();
  return (
    <View style={[styles.balanceCard, { backgroundColor: colors.card }]}>
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
    </View>
  );
}

export default function GroupSummaryScreen({ navigation, route }: Props) {
  const { groupId } = route.params;
  const colors = useAppTheme();
  const vm = useGroupSummaryViewModel(groupId);

  const members = vm.group ? Object.entries(vm.group.members) : [];
  const groupTotal = vm.expenses.reduce((s, e) => s + e.totalPrice, 0);

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
          </View>

          {/* ── Members ────────────────────────────────────────────── */}
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            MEMBERS ({members.length})
          </Text>
          <View style={[styles.membersRow]}>
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
              {vm.balances.map((entry, i) => (
                <BalanceCard key={`${entry.fromUid}-${entry.toUid}-${i}`} entry={entry} />
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
  totalsCard: {
    margin: 16,
    borderRadius: 14,
    overflow: 'hidden',
  },
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
  membersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 16,
    marginBottom: 8,
  },
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
  balanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 10,
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
});
