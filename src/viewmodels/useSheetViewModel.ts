import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  deleteExpense as deleteExpenseDB,
  getExpenses,
  getSheet,
} from '../db/database';
import { Expense, HomeStackParamList, Sheet } from '../types';
import { exportSheetToExcel, exportSheetToPdf } from '../utils/export';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'Sheet'>;

export interface SheetViewModel {
  sheet: Sheet | null;
  expenses: Expense[];
  isExporting: boolean;
  shareModalVisible: boolean;
  deleteExpense: (id: number) => void;
  openShareModal: () => void;
  closeShareModal: () => void;
  exportAsExcel: () => Promise<void>;
  exportAsPdf: () => Promise<void>;
  navigateToAddItem: () => void;
  navigateToItemDetail: (expense: Expense) => void;
  navigateToSettings: () => void;
  refresh: () => void;
}

export function useSheetViewModel(
  navigation: Nav,
  sheetId: number,
): SheetViewModel {
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);

  const refresh = useCallback(() => {
    setSheet(getSheet(sheetId));
    setExpenses(getExpenses(sheetId));
  }, [sheetId]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const deleteExpense = useCallback(
    (id: number) => {
      deleteExpenseDB(id);
      refresh();
    },
    [refresh],
  );

  const openShareModal = useCallback(() => setShareModalVisible(true), []);
  const closeShareModal = useCallback(() => setShareModalVisible(false), []);

  const exportAsExcel = useCallback(async () => {
    if (!sheet) return;
    setShareModalVisible(false);
    setIsExporting(true);
    try {
      await exportSheetToExcel(sheetId, sheet.name);
    } finally {
      setIsExporting(false);
    }
  }, [sheet, sheetId]);

  const exportAsPdf = useCallback(async () => {
    if (!sheet) return;
    setShareModalVisible(false);
    setIsExporting(true);
    try {
      await exportSheetToPdf(sheetId, sheet.name);
    } finally {
      setIsExporting(false);
    }
  }, [sheet, sheetId]);

  const navigateToAddItem = useCallback(() => {
    navigation.navigate('AddItem', { sheetId });
  }, [navigation, sheetId]);

  const navigateToItemDetail = useCallback(
    (expense: Expense) => {
      navigation.navigate('ItemDetail', {
        expenseId: expense.id,
        itemName: expense.item_name,
      });
    },
    [navigation],
  );

  const navigateToSettings = useCallback(() => {
    navigation.navigate('SheetSettings', { sheetId });
  }, [navigation, sheetId]);

  return {
    sheet,
    expenses,
    isExporting,
    shareModalVisible,
    deleteExpense,
    openShareModal,
    closeShareModal,
    exportAsExcel,
    exportAsPdf,
    navigateToAddItem,
    navigateToItemDetail,
    navigateToSettings,
    refresh,
  };
}
