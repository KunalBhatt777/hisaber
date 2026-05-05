import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getExpenses, deleteExpense, getGroup } from '../firebase/firestore';
import { Group, GroupExpense, HomeStackParamList } from '../types';
import { exportGroupToExcel, exportGroupToPdf } from '../utils/groupExport';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'Group'>;

export interface GroupViewModel {
  group: Group | null;
  expenses: GroupExpense[];
  isExporting: boolean;
  shareModalVisible: boolean;
  removeExpense: (id: string) => Promise<void>;
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
  const [isExporting, setIsExporting] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);

  const refresh = useCallback(async () => {
    const [g, exps] = await Promise.all([
      getGroup(groupId),
      getExpenses(groupId),
    ]);
    setGroup(g);
    setExpenses(exps);
  }, [groupId]);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const removeExpense = useCallback(
    async (id: string) => {
      await deleteExpense(groupId, id);
      await refresh();
    },
    [groupId, refresh],
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
      navigation.navigate('ItemDetail', {
        groupId,
        expenseId: expense.id,
        itemName: expense.itemName,
      });
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
    isExporting,
    shareModalVisible,
    removeExpense,
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
