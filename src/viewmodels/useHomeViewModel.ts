import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  createSheet as createSheetDB,
  deleteSheet as deleteSheetDB,
  getAppSetting,
  getSheets,
} from '../db/database';
import { Sheet } from '../types';

export interface HomeViewModel {
  sheets: Sheet[];
  userName: string;
  createSheet: (name: string) => number;
  deleteSheet: (id: number) => void;
  refresh: () => void;
}

export function useHomeViewModel(): HomeViewModel {
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [userName, setUserName] = useState('Kunal');

  const refresh = useCallback(() => {
    setSheets(getSheets());
    setUserName(getAppSetting('user_name') ?? 'Kunal');
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const createSheet = useCallback(
    (name: string): number => {
      const id = createSheetDB(name);
      refresh();
      return id;
    },
    [refresh],
  );

  const deleteSheet = useCallback(
    (id: number): void => {
      deleteSheetDB(id);
      refresh();
    },
    [refresh],
  );

  return { sheets, userName, createSheet, deleteSheet, refresh };
}
