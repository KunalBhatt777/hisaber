import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { getExpense, getExpenseSplits } from '../db/database';
import { Expense, ExpenseSplit } from '../types';

export interface ItemDetailViewModel {
  expense: Expense | null;
  splits: ExpenseSplit[];
  perPerson: number;
  refresh: () => void;
}

export function useItemDetailViewModel(expenseId: number): ItemDetailViewModel {
  const [expense, setExpense] = useState<Expense | null>(null);
  const [splits, setSplits] = useState<ExpenseSplit[]>([]);

  const refresh = useCallback(() => {
    const e = getExpense(expenseId);
    setExpense(e);
    setSplits(getExpenseSplits(expenseId));
  }, [expenseId]);

  useFocusEffect(refresh);

  const perPerson =
    expense && expense.split_count > 0
      ? expense.total_price / expense.split_count
      : 0;

  return { expense, splits, perPerson, refresh };
}
