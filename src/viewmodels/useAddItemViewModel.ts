import { useCallback, useEffect, useMemo, useState } from 'react';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  addExpense,
  getAppSetting,
  getExpense,
  getExpenseSplits,
  getSheetEnabledTaxOptions,
  getSheetPeople,
  setAppSetting,
  updateExpense,
} from '../db/database';
import { HomeStackParamList, SheetPerson } from '../types';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'AddItem'>;

export interface AddItemViewModel {
  isEditing: boolean;
  // Form state
  itemName: string;
  rawPrice: string;
  quantity: string;
  selectedTax: number;
  customTax: string;
  enabledTaxOptions: number[];
  isLiquor: boolean;
  liquorStateTax: string;
  liquorCountyTax: string;
  people: SheetPerson[];
  selectedPeopleIds: Set<number>;
  // Computed
  quantityNum: number;
  effectiveTaxRate: number;
  taxAmount: number;
  liquorTaxAmount: number;
  totalPrice: number;
  splitCount: number;
  perPerson: number;
  canSave: boolean;
  // Actions
  setItemName: (v: string) => void;
  setRawPrice: (v: string) => void;
  setQuantity: (v: string) => void;
  selectTax: (value: number) => void;
  setCustomTax: (v: string) => void;
  toggleLiquor: () => void;
  setLiquorStateTax: (v: string) => void;
  setLiquorCountyTax: (v: string) => void;
  togglePerson: (id: number) => void;
  save: () => void;
  cancel: () => void;
}

export function useAddItemViewModel(
  navigation: Nav,
  sheetId: number,
  expenseId?: number,
): AddItemViewModel {
  const [itemName, setItemName] = useState('');
  const [rawPrice, setRawPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [selectedTax, setSelectedTax] = useState<number>(2.25);
  const [customTax, setCustomTax] = useState('');
  const [enabledTaxOptions, setEnabledTaxOptions] = useState<number[]>([2.25, 3.25, 10.25]);
  const [isLiquor, setIsLiquor] = useState(false);
  const [liquorStateTax, setLiquorStateTax] = useState('');
  const [liquorCountyTax, setLiquorCountyTax] = useState('');
  const [people, setPeople] = useState<SheetPerson[]>([]);
  const [selectedPeopleIds, setSelectedPeopleIds] = useState<Set<number>>(
    new Set(),
  );

  // Load people, enabled tax options, and pre-populate if editing
  useEffect(() => {
    setPeople(getSheetPeople(sheetId));

    const opts = getSheetEnabledTaxOptions(sheetId);
    setEnabledTaxOptions(opts);

    if (expenseId != null) {
      // Edit mode: pre-populate fields from saved expense
      const expense = getExpense(expenseId);
      if (expense) {
        setItemName(expense.item_name);
        setRawPrice(String(expense.raw_price));
        setQuantity(String(expense.quantity));
        setIsLiquor(expense.is_liquor === 1);
        if (expense.is_liquor === 1) {
          setLiquorStateTax(expense.liquor_state_tax > 0 ? String(expense.liquor_state_tax) : '');
          setLiquorCountyTax(expense.liquor_county_tax > 0 ? String(expense.liquor_county_tax) : '');
        }
        if (opts.includes(expense.tax_rate)) {
          setSelectedTax(expense.tax_rate);
        } else {
          setSelectedTax(-1);
          setCustomTax(String(expense.tax_rate));
        }
        const splits = getExpenseSplits(expenseId);
        setSelectedPeopleIds(new Set(splits.map((s) => s.person_id)));
      }
    } else {
      // Add mode: use last tax rate
      const lastTax = getAppSetting('last_tax_rate');
      if (lastTax !== null) {
        const rate = parseFloat(lastTax);
        if (opts.includes(rate)) {
          setSelectedTax(rate);
        } else if (rate > 0) {
          setSelectedTax(-1);
          setCustomTax(lastTax);
        } else {
          setSelectedTax(opts[0] ?? 2.25);
        }
      } else {
        setSelectedTax(opts[0] ?? 2.25);
      }
    }
  }, [sheetId, expenseId]);

  const quantityNum = useMemo(
    () => Math.max(1, parseInt(quantity, 10) || 1),
    [quantity],
  );

  const effectiveTaxRate = useMemo(
    () => (selectedTax === -1 ? parseFloat(customTax) || 0 : selectedTax),
    [selectedTax, customTax],
  );

  const rawPriceNum = useMemo(() => parseFloat(rawPrice) || 0, [rawPrice]);

  // Per-unit tax amounts
  const taxAmount = useMemo(
    () => rawPriceNum * (effectiveTaxRate / 100),
    [rawPriceNum, effectiveTaxRate],
  );

  const liquorStateTaxNum = useMemo(
    () => parseFloat(liquorStateTax) || 0,
    [liquorStateTax],
  );
  const liquorCountyTaxNum = useMemo(
    () => parseFloat(liquorCountyTax) || 0,
    [liquorCountyTax],
  );
  const liquorTaxAmount = useMemo(
    () => (isLiquor ? liquorStateTaxNum + liquorCountyTaxNum : 0),
    [isLiquor, liquorStateTaxNum, liquorCountyTaxNum],
  );

  // Total = (unit price + sales tax + liquor amounts) × quantity
  const totalPrice = useMemo(
    () => (rawPriceNum + taxAmount + liquorTaxAmount) * quantityNum,
    [rawPriceNum, taxAmount, liquorTaxAmount, quantityNum],
  );

  const splitCount = selectedPeopleIds.size;
  const perPerson = useMemo(
    () => (splitCount > 0 ? totalPrice / splitCount : 0),
    [totalPrice, splitCount],
  );

  const canSave =
    itemName.trim().length > 0 && rawPriceNum > 0 && splitCount > 0;

  const selectTax = useCallback((value: number) => {
    setSelectedTax(value);
  }, []);

  const toggleLiquor = useCallback(() => {
    setIsLiquor((prev) => !prev);
  }, []);

  const togglePerson = useCallback((id: number) => {
    setSelectedPeopleIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const save = useCallback(() => {
    if (!canSave) return;
    if (expenseId != null) {
      updateExpense(
        expenseId,
        itemName.trim(),
        rawPriceNum,
        effectiveTaxRate,
        parseFloat(totalPrice.toFixed(2)),
        Array.from(selectedPeopleIds),
        quantityNum,
        isLiquor,
        liquorStateTaxNum,
        liquorCountyTaxNum,
      );
    } else {
      setAppSetting('last_tax_rate', String(effectiveTaxRate));
      addExpense(
        sheetId,
        itemName.trim(),
        rawPriceNum,
        effectiveTaxRate,
        parseFloat(totalPrice.toFixed(2)),
        Array.from(selectedPeopleIds),
        quantityNum,
        isLiquor,
        liquorStateTaxNum,
        liquorCountyTaxNum,
      );
    }
    navigation.goBack();
  }, [
    canSave,
    expenseId,
    sheetId,
    itemName,
    rawPriceNum,
    effectiveTaxRate,
    totalPrice,
    selectedPeopleIds,
    quantityNum,
    isLiquor,
    liquorStateTaxNum,
    liquorCountyTaxNum,
    navigation,
  ]);

  const cancel = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return {
    isEditing: expenseId != null,
    itemName,
    rawPrice,
    quantity,
    selectedTax,
    customTax,
    enabledTaxOptions,
    isLiquor,
    liquorStateTax,
    liquorCountyTax,
    people,
    selectedPeopleIds,
    quantityNum,
    effectiveTaxRate,
    taxAmount,
    liquorTaxAmount,
    totalPrice,
    splitCount,
    perPerson,
    canSave,
    setItemName,
    setRawPrice,
    setQuantity,
    selectTax,
    setCustomTax,
    toggleLiquor,
    setLiquorStateTax,
    setLiquorCountyTax,
    togglePerson,
    save,
    cancel,
  };
}
