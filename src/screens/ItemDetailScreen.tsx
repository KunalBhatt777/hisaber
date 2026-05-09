import React, { useEffect, useLayoutEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '../theme';
import { GroupExpense, HomeStackParamList } from '../types';
import { formatCurrency, formatTaxRate } from '../utils/formatters';
import { getExpense, getGroup } from '../firebase/firestore';

type Props = {
  navigation: NativeStackNavigationProp<HomeStackParamList, 'ItemDetail'>;
  route: RouteProp<HomeStackParamList, 'ItemDetail'>;
};

export default function ItemDetailScreen({ navigation, route }: Props) {
  const { groupId, expenseId } = route.params;
  const colors = useAppTheme();
  const [expense, setExpense] = useState<GroupExpense | null>(null);
  const [members, setMembers] = useState<Record<string, { displayName: string; username: string }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [e, g] = await Promise.all([
        getExpense(groupId, expenseId),
        getGroup(groupId),
      ]);
      setExpense(e);
      if (g) setMembers(g.members);
      setLoading(false);
    };
    load();
  }, [groupId, expenseId]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() =>
            navigation.navigate('AddItem', { groupId, expenseId })
          }
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="pencil" size={20} color={colors.primary} />
        </TouchableOpacity>
      ),
    });
  }, [navigation, groupId, expenseId, colors.primary]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  if (!expense) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
        <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 40 }}>
          Expense not found.
        </Text>
      </SafeAreaView>
    );
  }

  const splits = Object.entries(expense.splits);
  const splitCount = splits.length;
  const perPerson = splitCount > 0 ? expense.totalPrice / splitCount : 0;
  const paidByName = members[expense.paidBy]?.displayName ?? expense.paidBy;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      {/* ── Breakdown Card ───────────────────────────────────────────── */}
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <Row label="Raw Price" value={formatCurrency(expense.rawPrice)} colors={colors} />
        <Divider colors={colors} />
        <Row label="Tax Rate" value={formatTaxRate(expense.taxRate)} colors={colors} />
        <Divider colors={colors} />
        <Row label="Tax Amount" value={formatCurrency(expense.totalPrice - expense.rawPrice)} colors={colors} />
        <Divider colors={colors} />
        <Row label="Paid By" value={paidByName} colors={colors} />
        <Divider colors={colors} />
        <Row label="Total" value={formatCurrency(expense.totalPrice)} colors={colors} bold valueColor={colors.primary} />
      </View>

      {/* ── Split Section ─────────────────────────────────────────────── */}
      <Text style={[styles.splitHeader, { color: colors.textSecondary }]}>
        SPLIT BETWEEN {splitCount} {splitCount === 1 ? 'PERSON' : 'PEOPLE'}
      </Text>

      <FlatList
        data={splits}
        keyExtractor={([uid]) => uid}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => (
          <View style={[styles.separator, { backgroundColor: colors.separator }]} />
        )}
        renderItem={({ item: [uid, split] }) => (
          <View style={[styles.personRow, { backgroundColor: colors.card }]}>
            <View style={[styles.avatar, { backgroundColor: colors.primaryLight }]}>
              <Text style={[styles.avatarText, { color: colors.primary }]}>
                {split.displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={[styles.personName, { color: colors.text }]}>{split.displayName}</Text>
            <Text style={[styles.personShare, { color: colors.success }]}>
              {formatCurrency(perPerson)}
            </Text>
          </View>
        )}
      />

      {splitCount > 0 && (
        <View style={[styles.summaryBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Each person pays</Text>
          <Text style={[styles.summaryAmount, { color: colors.success }]}>
            {formatCurrency(perPerson)}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function Row({
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
    <View style={styles.row}>
      <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: valueColor ?? colors.text }, bold && styles.rowValueBold]}>
        {value}
      </Text>
    </View>
  );
}

function Divider({ colors }: { colors: ReturnType<typeof useAppTheme> }) {
  return <View style={[styles.divider, { backgroundColor: colors.separator }]} />;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: { margin: 16, borderRadius: 14, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  rowLabel: { fontSize: 14 },
  rowValue: { fontSize: 15, fontWeight: '500' },
  rowValueBold: { fontWeight: '700', fontSize: 17 },
  divider: { height: StyleSheet.hairlineWidth },
  splitHeader: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, paddingHorizontal: 20, paddingBottom: 8 },
  listContent: { paddingBottom: 100 },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { fontSize: 15, fontWeight: '700' },
  personName: { flex: 1, fontSize: 15, fontWeight: '500' },
  personShare: { fontSize: 16, fontWeight: '700' },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 64 },
  summaryBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  summaryLabel: { fontSize: 14, fontWeight: '500' },
  summaryAmount: { fontSize: 22, fontWeight: '700' },
});
