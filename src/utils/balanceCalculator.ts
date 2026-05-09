import { BalanceEntry, GroupExpense, GroupPayment } from '../types';

function computeNetBalances(
  expenses: GroupExpense[],
  payments: GroupPayment[],
): Map<string, Map<string, number>> {
  const net = new Map<string, Map<string, number>>();

  const ensure = (uid: string) => {
    if (!net.has(uid)) net.set(uid, new Map());
    return net.get(uid)!;
  };

  // Build directional debt map from expenses
  for (const { paidBy, splits, totalPrice } of expenses) {
    const uids = Object.keys(splits);
    if (!uids.length) continue;
    const share = totalPrice / uids.length;
    for (const uid of uids) {
      if (uid !== paidBy) {
        const row = ensure(uid);
        row.set(paidBy, (row.get(paidBy) ?? 0) + share);
      }
    }
  }

  // Apply payments: reduce paidBy → paidTo debt
  for (const { paidBy, paidTo, amount } of payments) {
    if (paidBy === paidTo || amount <= 0) continue;
    const debtMap = ensure(paidBy);
    const current = debtMap.get(paidTo) ?? 0;
    const remaining = current - amount;
    if (remaining >= -0.005) {
      debtMap.set(paidTo, Math.max(0, remaining));
    } else {
      // Overpayment — paidTo now owes paidBy the excess
      debtMap.set(paidTo, 0);
      const toMap = ensure(paidTo);
      toMap.set(paidBy, (toMap.get(paidBy) ?? 0) + (-remaining));
    }
  }

  return net;
}

function simplifyDebts(
  rawNet: Map<string, Map<string, number>>,
  memberNames: Record<string, string>,
): BalanceEntry[] {
  const balance = new Map<string, number>();
  for (const [debtor, creditors] of rawNet) {
    for (const [creditor, amount] of creditors) {
      balance.set(debtor, (balance.get(debtor) ?? 0) - amount);
      balance.set(creditor, (balance.get(creditor) ?? 0) + amount);
    }
  }

  const entries: BalanceEntry[] = [];
  const people = Array.from(balance.entries()).filter(([, v]) => Math.abs(v) > 0.005);

  while (people.length >= 2) {
    people.sort((a, b) => a[1] - b[1]);
    const poorest = people[0];
    const richest = people[people.length - 1];
    const amount = Math.min(-poorest[1], richest[1]);
    if (amount < 0.01) break;

    entries.push({
      fromUid: poorest[0],
      fromName: memberNames[poorest[0]] ?? poorest[0],
      toUid: richest[0],
      toName: memberNames[richest[0]] ?? richest[0],
      amount: parseFloat(amount.toFixed(2)),
    });

    poorest[1] += amount;
    richest[1] -= amount;
    people.splice(0, people.length, ...people.filter(([, v]) => Math.abs(v) > 0.005));
  }

  return entries;
}

function rawBalances(
  rawNet: Map<string, Map<string, number>>,
  memberNames: Record<string, string>,
): BalanceEntry[] {
  const entries: BalanceEntry[] = [];
  for (const [debtor, creditors] of rawNet) {
    for (const [creditor, amount] of creditors) {
      if (amount < 0.01) continue;
      entries.push({
        fromUid: debtor,
        fromName: memberNames[debtor] ?? debtor,
        toUid: creditor,
        toName: memberNames[creditor] ?? creditor,
        amount: parseFloat(amount.toFixed(2)),
      });
    }
  }
  return entries.sort((a, b) => b.amount - a.amount);
}

export function computeNetBetweenTwo(
  expenses: GroupExpense[],
  payments: GroupPayment[],
  currentUid: string,
  friendUid: string,
): number {
  const net = computeNetBalances(expenses, payments);
  const iOwe = net.get(currentUid)?.get(friendUid) ?? 0;
  const theyOwe = net.get(friendUid)?.get(currentUid) ?? 0;
  return parseFloat((iOwe - theyOwe).toFixed(2));
}

export function calculateBalances(
  expenses: GroupExpense[],
  payments: GroupPayment[],
  members: Record<string, string>,
  simplify: boolean,
): BalanceEntry[] {
  const net = computeNetBalances(expenses, payments);
  return simplify ? simplifyDebts(net, members) : rawBalances(net, members);
}
