import { useCallback, useEffect, useMemo, useState } from 'react';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getGroup, getExpense, addExpense, updateExpense, getUserProfile } from '../firebase/firestore';
import { auth } from '../firebase/config';
import { GroupMember, HomeStackParamList } from '../types';
import { sendExpenseNotification, sendExpenseEditedNotification } from '../utils/pushNotifications';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'AddItem'>;

export interface AddItemViewModel {
  isEditing: boolean;
  loading: boolean;
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
  members: GroupMember[];
  selectedMemberUids: Set<string>;
  paidByUid: string;
  expenseDate: Date;
  setExpenseDate: (d: Date) => void;
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
  toggleMember: (uid: string) => void;
  setPaidByUid: (uid: string) => void;
  save: () => Promise<void>;
  cancel: () => void;
}

export function useAddItemViewModel(
  navigation: Nav,
  groupId: string,
  expenseId?: string,
): AddItemViewModel {
  const currentUid = auth.currentUser?.uid ?? '';

  const [itemName, setItemName] = useState('');
  const [rawPrice, setRawPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [selectedTax, setSelectedTax] = useState<number>(2.25);
  const [customTax, setCustomTax] = useState('');
  const [enabledTaxOptions, setEnabledTaxOptions] = useState<number[]>([2.25, 3.25, 10.25]);
  const [isLiquor, setIsLiquor] = useState(false);
  const [liquorStateTax, setLiquorStateTax] = useState('');
  const [liquorCountyTax, setLiquorCountyTax] = useState('');
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [selectedMemberUids, setSelectedMemberUids] = useState<Set<string>>(new Set());
  const [paidByUid, setPaidByUid] = useState(currentUid);
  const [expenseDate, setExpenseDate] = useState<Date>(new Date());
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const group = await getGroup(groupId);
        if (!group) return;

        setGroupName(group.name);
        const memberList: GroupMember[] = Object.entries(group.members).map(
          ([uid, m]) => ({ uid, displayName: m.displayName, username: m.username }),
        );
        setMembers(memberList);
        setEnabledTaxOptions(group.enabledTaxOptions);

        if (expenseId) {
          const expense = await getExpense(groupId, expenseId);
          if (expense) {
            setItemName(expense.itemName);
            setRawPrice(String(expense.rawPrice));
            setQuantity(String(expense.quantity));
            setIsLiquor(expense.isLiquor);
            if (expense.isLiquor) {
              setLiquorStateTax(expense.liquorStateTax > 0 ? String(expense.liquorStateTax) : '');
              setLiquorCountyTax(expense.liquorCountyTax > 0 ? String(expense.liquorCountyTax) : '');
            }
            if (expense.taxRate === 0) {
              setSelectedTax(0);
            } else if (group.enabledTaxOptions.includes(expense.taxRate)) {
              setSelectedTax(expense.taxRate);
            } else {
              setSelectedTax(-1);
              setCustomTax(String(expense.taxRate));
            }
            setSelectedMemberUids(new Set(Object.keys(expense.splits)));
            setPaidByUid(expense.paidBy);
            if (expense.createdAt) setExpenseDate(new Date(expense.createdAt));
          }
        } else {
          setSelectedMemberUids(new Set(memberList.map((m) => m.uid)));
          setPaidByUid(currentUid);
          setSelectedTax(group.enabledTaxOptions[0] ?? 2.25);
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [groupId, expenseId, currentUid]);

  const quantityNum = useMemo(() => Math.max(1, parseInt(quantity, 10) || 1), [quantity]);
  const effectiveTaxRate = useMemo(
    () => (selectedTax === -1 ? parseFloat(customTax) || 0 : selectedTax),
    [selectedTax, customTax],
  );
  const rawPriceNum = useMemo(() => parseFloat(rawPrice) || 0, [rawPrice]);
  const taxAmount = useMemo(() => rawPriceNum * (effectiveTaxRate / 100), [rawPriceNum, effectiveTaxRate]);
  const liquorStateTaxNum = useMemo(() => parseFloat(liquorStateTax) || 0, [liquorStateTax]);
  const liquorCountyTaxNum = useMemo(() => parseFloat(liquorCountyTax) || 0, [liquorCountyTax]);
  const liquorTaxAmount = useMemo(
    () => (isLiquor ? liquorStateTaxNum + liquorCountyTaxNum : 0),
    [isLiquor, liquorStateTaxNum, liquorCountyTaxNum],
  );
  const totalPrice = useMemo(
    () => (rawPriceNum + taxAmount + liquorTaxAmount) * quantityNum,
    [rawPriceNum, taxAmount, liquorTaxAmount, quantityNum],
  );
  const splitCount = selectedMemberUids.size;
  const perPerson = useMemo(
    () => (splitCount > 0 ? totalPrice / splitCount : 0),
    [totalPrice, splitCount],
  );
  const canSave = itemName.trim().length > 0 && rawPriceNum > 0 && splitCount > 0 && !!paidByUid;

  const selectTax = useCallback((value: number) => setSelectedTax(value), []);
  const toggleLiquor = useCallback(() => setIsLiquor((prev) => !prev), []);
  const toggleMember = useCallback((uid: string) => {
    setSelectedMemberUids((prev) => {
      const next = new Set(prev);
      next.has(uid) ? next.delete(uid) : next.add(uid);
      return next;
    });
  }, []);

  const save = useCallback(async () => {
    if (!canSave) return;

    // Build splits map
    const splitShare = parseFloat((totalPrice / splitCount).toFixed(2));
    const splits: Record<string, { displayName: string; amount: number }> = {};
    for (const uid of selectedMemberUids) {
      const member = members.find((m) => m.uid === uid);
      splits[uid] = { displayName: member?.displayName ?? uid, amount: splitShare };
    }

    const payload = {
      itemName: itemName.trim(),
      rawPrice: rawPriceNum,
      taxRate: effectiveTaxRate,
      totalPrice: parseFloat(totalPrice.toFixed(2)),
      quantity: quantityNum,
      isLiquor,
      liquorStateTax: liquorStateTaxNum,
      liquorCountyTax: liquorCountyTaxNum,
      paidBy: paidByUid,
      splits,
      createdAt: expenseDate.toISOString(),
    };

    if (expenseId) {
      await updateExpense(groupId, expenseId, payload);
      const notifyUids = [...selectedMemberUids].filter((u) => u !== currentUid);
      if (notifyUids.length > 0) {
        Promise.all(notifyUids.map((u) => getUserProfile(u))).then((profiles) => {
          const tokens = profiles.flatMap((p) => (p?.pushToken ? [p.pushToken] : []));
          sendExpenseEditedNotification(tokens, auth.currentUser?.displayName ?? 'Someone', groupId, groupName, itemName.trim());
        });
      }
    } else {
      await addExpense(groupId, payload);
      // Notify split members (excluding the person who added the expense)
      const notifyUids = [...selectedMemberUids].filter((u) => u !== currentUid);
      if (notifyUids.length > 0) {
        Promise.all(notifyUids.map((u) => getUserProfile(u))).then((profiles) => {
          const tokens = profiles.flatMap((p) => (p?.pushToken ? [p.pushToken] : []));
          sendExpenseNotification(
            tokens,
            auth.currentUser?.displayName ?? 'Someone',
            groupId,
            groupName,
            itemName.trim(),
            totalPrice,
          );
        });
      }
    }
    navigation.goBack();
  }, [
    canSave, expenseId, groupId, itemName, rawPriceNum, effectiveTaxRate, totalPrice,
    splitCount, selectedMemberUids, members, quantityNum, isLiquor, liquorStateTaxNum,
    liquorCountyTaxNum, paidByUid, expenseDate, navigation,
  ]);

  const cancel = useCallback(() => navigation.goBack(), [navigation]);

  return {
    isEditing: !!expenseId,
    loading,
    itemName, rawPrice, quantity, selectedTax, customTax, enabledTaxOptions,
    isLiquor, liquorStateTax, liquorCountyTax, members, selectedMemberUids, paidByUid, expenseDate,
    quantityNum, effectiveTaxRate, taxAmount, liquorTaxAmount, totalPrice, splitCount, perPerson, canSave,
    setItemName, setRawPrice, setQuantity, selectTax, setCustomTax,
    toggleLiquor, setLiquorStateTax, setLiquorCountyTax, toggleMember, setPaidByUid, setExpenseDate, save, cancel,
  };
}
