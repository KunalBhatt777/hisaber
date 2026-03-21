import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  addPersonToSheet,
  getSheet,
  getSheetEnabledTaxOptions,
  getSheetPeople,
  removePersonFromSheet,
  setSheetEnabledTaxOptions,
  updateSheetName,
} from '../db/database';
import { Sheet, SheetPerson } from '../types';

export interface SheetSettingsViewModel {
  sheet: Sheet | null;
  people: SheetPerson[];
  newPersonName: string;
  sheetNameDraft: string;
  taxOptions: number[];
  newTaxValue: string;
  setNewPersonName: (v: string) => void;
  setSheetNameDraft: (v: string) => void;
  setNewTaxValue: (v: string) => void;
  addPerson: () => void;
  removePerson: (id: number) => void;
  saveSheetName: () => void;
  addTaxOption: () => void;
  removeTaxOption: (value: number) => void;
  refresh: () => void;
}

export function useSheetSettingsViewModel(
  sheetId: number,
): SheetSettingsViewModel {
  const [sheet, setSheet] = useState<Sheet | null>(null);
  const [people, setPeople] = useState<SheetPerson[]>([]);
  const [newPersonName, setNewPersonName] = useState('');
  const [sheetNameDraft, setSheetNameDraft] = useState('');
  const [taxOptions, setTaxOptions] = useState<number[]>([2.25, 3.25, 10.25]);
  const [newTaxValue, setNewTaxValue] = useState('');

  const refresh = useCallback(() => {
    const s = getSheet(sheetId);
    setSheet(s);
    if (s) setSheetNameDraft(s.name);
    setPeople(getSheetPeople(sheetId));
    setTaxOptions(getSheetEnabledTaxOptions(sheetId));
  }, [sheetId]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const addPerson = useCallback(() => {
    const trimmed = newPersonName.trim();
    if (!trimmed) return;
    addPersonToSheet(sheetId, trimmed);
    setNewPersonName('');
    refresh();
  }, [newPersonName, sheetId, refresh]);

  const removePerson = useCallback(
    (id: number) => {
      removePersonFromSheet(id);
      refresh();
    },
    [refresh],
  );

  const saveSheetName = useCallback(() => {
    const trimmed = sheetNameDraft.trim();
    if (!trimmed) return;
    updateSheetName(sheetId, trimmed);
    refresh();
  }, [sheetId, sheetNameDraft, refresh]);

  const addTaxOption = useCallback(() => {
    const parsed = parseFloat(newTaxValue.trim());
    if (isNaN(parsed) || parsed <= 0 || parsed > 100) return;
    // Round to 2 decimal places to avoid float duplicates
    const rounded = Math.round(parsed * 100) / 100;
    setTaxOptions((prev) => {
      if (prev.includes(rounded)) return prev;
      const next = [...prev, rounded].sort((a, b) => a - b);
      setSheetEnabledTaxOptions(sheetId, next);
      return next;
    });
    setNewTaxValue('');
  }, [newTaxValue, sheetId]);

  const removeTaxOption = useCallback(
    (value: number) => {
      setTaxOptions((prev) => {
        if (prev.length <= 1) return prev; // keep at least one
        const next = prev.filter((v) => v !== value);
        setSheetEnabledTaxOptions(sheetId, next);
        return next;
      });
    },
    [sheetId],
  );

  return {
    sheet,
    people,
    newPersonName,
    sheetNameDraft,
    taxOptions,
    newTaxValue,
    setNewPersonName,
    setSheetNameDraft,
    setNewTaxValue,
    addPerson,
    removePerson,
    saveSheetName,
    addTaxOption,
    removeTaxOption,
    refresh,
  };
}
