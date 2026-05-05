import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { getGroup, getExpenses } from '../firebase/firestore';
import { BalanceEntry, Group, GroupExpense } from '../types';
import { calculateBalances } from '../utils/balanceCalculator';

export interface GroupSummaryViewModel {
  group: Group | null;
  expenses: GroupExpense[];
  balances: BalanceEntry[];
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useGroupSummaryViewModel(groupId: string): GroupSummaryViewModel {
  const [group, setGroup] = useState<Group | null>(null);
  const [expenses, setExpenses] = useState<GroupExpense[]>([]);
  const [balances, setBalances] = useState<BalanceEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [g, exps] = await Promise.all([getGroup(groupId), getExpenses(groupId)]);
      setGroup(g);
      setExpenses(exps);

      if (g) {
        const memberNames: Record<string, string> = {};
        for (const [uid, m] of Object.entries(g.members)) {
          memberNames[uid] = m.displayName;
        }
        setBalances(calculateBalances(exps, memberNames, g.simplifyDebts));
      }
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  return { group, expenses, balances, loading, refresh };
}
