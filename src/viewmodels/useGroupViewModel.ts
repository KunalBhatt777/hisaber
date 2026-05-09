import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getExpenses, deleteExpense, getGroup, getPayments, addPayment, getUserProfile } from '../firebase/firestore';
import { auth } from '../firebase/config';
import { Group, GroupExpense, GroupPayment, HomeStackParamList } from '../types';
import { exportGroupToExcel, exportGroupToPdf } from '../utils/groupExport';
import { sendPaymentNotification, sendExpenseDeletedNotification } from '../utils/pushNotifications';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'Group'>;
export type GroupTab = 'expenses' | 'payments';

export interface GroupViewModel {
  group: Group | null;
  expenses: GroupExpense[];
  payments: GroupPayment[];
  activeTab: GroupTab;
  setActiveTab: (tab: GroupTab) => void;
  loading: boolean;
  isExporting: boolean;
  shareModalVisible: boolean;
  removeExpense: (id: string) => Promise<void>;
  submitPayment: (paidBy: string, paidTo: string, paidByName: string, paidToName: string, amount: number, note: string, createdAt?: string) => Promise<void>;
  openShareModal: () => void;
  closeShareModal: () => void;
  exportAsExcel: () => Promise<void>;
  exportAsPdf: () => Promise<void>;
  navigateToAddItem: () => void;
  navigateToEditItem: (expense: GroupExpense) => void;
  navigateToItemDetail: (expense: GroupExpense) => void;
  navigateToSettings: () => void;
  navigateToSummary: () => void;
  refresh: () => Promise<void>;
}

export function useGroupViewModel(
  navigation: Nav,
  groupId: string,
): GroupViewModel {
  const [group, setGroup] = useState<Group | null>(null);
  const [expenses, setExpenses] = useState<GroupExpense[]>([]);
  const [payments, setPayments] = useState<GroupPayment[]>([]);
  const [activeTab, setActiveTab] = useState<GroupTab>('expenses');
  const [loading, setLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);

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
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const removeExpense = useCallback(
    async (id: string) => {
      const currentUid = auth.currentUser?.uid ?? '';
      const currentGroupName = group?.name ?? '';
      const expense = expenses.find((e) => e.id === id);
      await deleteExpense(groupId, id);
      await refresh();
      if (expense) {
        const notifyUids = Object.keys(expense.splits).filter((u) => u !== currentUid);
        if (notifyUids.length > 0 && currentGroupName) {
          Promise.all(notifyUids.map((u) => getUserProfile(u))).then((profiles) => {
            const tokens = profiles.flatMap((p) => (p?.pushToken ? [p.pushToken] : []));
            sendExpenseDeletedNotification(tokens, auth.currentUser?.displayName ?? 'Someone', groupId, currentGroupName, expense.itemName);
          });
        }
      }
    },
    [groupId, refresh, group, expenses],
  );

  const submitPayment = useCallback(
    async (
      paidBy: string,
      paidTo: string,
      paidByName: string,
      paidToName: string,
      amount: number,
      note: string,
      createdAt?: string,
    ) => {
      const currentUid = auth.currentUser?.uid ?? '';
      const currentGroupName = group?.name ?? '';
      await addPayment(groupId, { paidBy, paidTo, paidByName, paidToName, amount, note, createdBy: currentUid, ...(createdAt ? { createdAt } : {}) });
      await refresh();
      const notifyUids = [paidBy, paidTo].filter((u) => u !== currentUid);
      if (notifyUids.length > 0 && currentGroupName) {
        Promise.all(notifyUids.map((u) => getUserProfile(u))).then((profiles) => {
          const tokens = profiles.flatMap((p) => (p?.pushToken ? [p.pushToken] : []));
          sendPaymentNotification(tokens, paidByName, paidToName, amount, currentGroupName, groupId);
        });
      }
    },
    [groupId, refresh, group],
  );

  const openShareModal = useCallback(() => setShareModalVisible(true), []);
  const closeShareModal = useCallback(() => setShareModalVisible(false), []);

  const exportAsExcel = useCallback(async () => {
    if (!group) return;
    setShareModalVisible(false);
    setIsExporting(true);
    try {
      await exportGroupToExcel(group.name, expenses, group.members);
    } finally {
      setIsExporting(false);
    }
  }, [group, expenses]);

  const exportAsPdf = useCallback(async () => {
    if (!group) return;
    setShareModalVisible(false);
    setIsExporting(true);
    try {
      await exportGroupToPdf(group.name, expenses, group.members);
    } finally {
      setIsExporting(false);
    }
  }, [group, expenses]);

  const navigateToAddItem = useCallback(() => {
    navigation.navigate('AddItem', { groupId });
  }, [navigation, groupId]);

  const navigateToEditItem = useCallback(
    (expense: GroupExpense) => {
      navigation.navigate('AddItem', { groupId, expenseId: expense.id });
    },
    [navigation, groupId],
  );

  const navigateToItemDetail = useCallback(
    (expense: GroupExpense) => {
      navigation.navigate('ItemDetail', { groupId, expenseId: expense.id, itemName: expense.itemName });
    },
    [navigation, groupId],
  );

  const navigateToSettings = useCallback(() => {
    navigation.navigate('GroupSettings', { groupId });
  }, [navigation, groupId]);

  const navigateToSummary = useCallback(() => {
    navigation.navigate('GroupSummary', { groupId });
  }, [navigation, groupId]);

  return {
    group,
    expenses,
    payments,
    activeTab,
    setActiveTab,
    loading,
    isExporting,
    shareModalVisible,
    removeExpense,
    submitPayment,
    openShareModal,
    closeShareModal,
    exportAsExcel,
    exportAsPdf,
    navigateToAddItem,
    navigateToEditItem,
    navigateToItemDetail,
    navigateToSettings,
    navigateToSummary,
    refresh,
  };
}
