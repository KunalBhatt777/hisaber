import { BalanceEntry, GroupExpense } from '../types';

/**
 * Compute raw net balances from a list of expenses.
 * Returns a map: debtor_uid -> creditor_uid -> amount owed
 */
function computeNetBalances(expenses: GroupExpense[]): Map<string, Map<string, number>> {
  const net = new Map<string, Map<string, number>>();

  const add = (debtor: string, creditor: string, amount: number) => {
    if (debtor === creditor || amount <= 0) return;
    if (!net.has(debtor)) net.set(debtor, new Map());
    const inner = net.get(debtor)!;
    inner.set(creditor, (inner.get(creditor) ?? 0) + amount);
  };

  for (const expense of expenses) {
    const { paidBy, splits, totalPrice } = expense;
    const splitUids = Object.keys(splits);
    if (!splitUids.length) continue;

    const sharePerPerson = totalPrice / splitUids.length;

    for (const uid of splitUids) {
      if (uid !== paidBy) {
        add(uid, paidBy, sharePerPerson);
      }
    }
  }

  return net;
}

/**
 * Simplify debts using a greedy min-transaction algorithm.
 * Computes the net position of each person and repeatedly settles
 * the largest debtor with the largest creditor.
 */
function simplifyDebts(
  rawNet: Map<string, Map<string, number>>,
  memberNames: Record<string, string>,
): BalanceEntry[] {
  // Compute net position per person: positive = owed money, negative = owes money
  const balance = new Map<string, number>();

  for (const [debtor, creditors] of rawNet) {
    for (const [creditor, amount] of creditors) {
      balance.set(debtor, (balance.get(debtor) ?? 0) - amount);
      balance.set(creditor, (balance.get(creditor) ?? 0) + amount);
    }
  }

  const entries: BalanceEntry[] = [];

  // Greedily pair largest creditor with largest debtor
  const people = Array.from(balance.entries()).filter(([, v]) => Math.abs(v) > 0.005);

  while (people.length >= 2) {
    people.sort((a, b) => a[1] - b[1]);
    const poorest = people[0]; // most negative = owes most
    const richest = people[people.length - 1]; // most positive = owed most

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

    // Remove settled people
    const filtered = people.filter(([, v]) => Math.abs(v) > 0.005);
    people.splice(0, people.length, ...filtered);
  }

  return entries;
}

/**
 * Compute raw (unsimplified) balances as a flat list.
 */
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

/**
 * Main entry: compute balances for a group.
 * @param expenses - All expenses in the group
 * @param members - uid → displayName map
 * @param simplify - Whether to use simplified or raw balances
 */
export function calculateBalances(
  expenses: GroupExpense[],
  members: Record<string, string>,
  simplify: boolean,
): BalanceEntry[] {
  const net = computeNetBalances(expenses);
  return simplify ? simplifyDebts(net, members) : rawBalances(net, members);
}
