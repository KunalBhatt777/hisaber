import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { getGroup, getExpenses, getPayments, addPayment, getUserProfile } from '../firebase/firestore';
import { auth } from '../firebase/config';
import { BalanceEntry, Group, GroupExpense, GroupPayment } from '../types';
import { calculateBalances } from '../utils/balanceCalculator';
import { sendPaymentNotification } from '../utils/pushNotifications';

export interface GroupSummaryViewModel {
  group: Group | null;
  expenses: GroupExpense[];
  payments: GroupPayment[];
  balances: BalanceEntry[];
  loading: boolean;
  submitting: boolean;
  refresh: () => Promise<void>;
  submitPayment: (
    entry: BalanceEntry,
    amount: number,
    note: string,
    createdAt?: string,
  ) => Promise<void>;
}

export function useGroupSummaryViewModel(groupId: string): GroupSummaryViewModel {
  const [group, setGroup] = useState<Group | null>(null);
  const [expenses, setExpenses] = useState<GroupExpense[]>([]);
  const [payments, setPayments] = useState<GroupPayment[]>([]);
  const [balances, setBalances] = useState<BalanceEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [g, exps, pmts] = await Promise.all([
        getGroup(groupId),
        getExpenses(groupId),
        getPayments(groupId),
      ]);
      setGroup(g);
      setExpenses(exps);
      setPayments(pmts);

      if (g) {
        const memberNames: Record<string, string> = {};
        for (const [uid, m] of Object.entries(g.members)) {
          memberNames[uid] = m.displayName;
        }
        setBalances(calculateBalances(exps, pmts, memberNames, g.simplifyDebts));
      }
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const submitPayment = useCallback(
    async (entry: BalanceEntry, amount: number, note: string, createdAt?: string) => {
      const currentUid = auth.currentUser?.uid ?? '';
      const currentGroupName = group?.name ?? '';
      setSubmitting(true);
      try {
        await addPayment(groupId, {
          paidBy: entry.fromUid,
          paidTo: entry.toUid,
          paidByName: entry.fromName,
          paidToName: entry.toName,
          amount,
          note,
          createdBy: currentUid,
          ...(createdAt ? { createdAt } : {}),
        });
        await refresh();
        const notifyUids = [entry.fromUid, entry.toUid].filter((u) => u !== currentUid);
        if (notifyUids.length > 0 && currentGroupName) {
          Promise.all(notifyUids.map((u) => getUserProfile(u))).then((profiles) => {
            const tokens = profiles.flatMap((p) => (p?.pushToken ? [p.pushToken] : []));
            sendPaymentNotification(tokens, entry.fromName, entry.toName, amount, currentGroupName, groupId);
          });
        }
      } finally {
        setSubmitting(false);
      }
    },
    [groupId, refresh, group],
  );

  return { group, expenses, payments, balances, loading, submitting, refresh, submitPayment };
}
