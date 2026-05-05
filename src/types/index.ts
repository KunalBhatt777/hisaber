// ─── Navigation Param Lists ───────────────────────────────────────────────────

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
};

export type TabParamList = {
  HomeStack: undefined;
  Friends: undefined;
  Budgeting: undefined;
  Profile: undefined;
};

export type HomeStackParamList = {
  Home: undefined;
  Group: { groupId: string; groupName: string };
  GroupSettings: { groupId: string };
  GroupSummary: { groupId: string };
  ItemDetail: { groupId: string; expenseId: string; itemName: string };
  AddItem: { groupId: string; expenseId?: string };

};

// ─── Data Models ─────────────────────────────────────────────────────────────

export interface Sheet {
  id: number;
  name: string;
  created_at: string;
  enabled_tax_options: string; // JSON array e.g. "[2.25,3.25,10.25]"
  total: number;
  item_count: number;
}

export interface SheetPerson {
  id: number;
  sheet_id: number;
  name: string;
}

export interface Expense {
  id: number;
  sheet_id: number;
  item_name: string;
  raw_price: number;
  tax_rate: number;
  total_price: number;
  created_at: string;
  quantity: number;
  is_liquor: number; // 0 or 1
  liquor_state_tax: number;
  liquor_county_tax: number;
  split_count: number;
  per_person: number;
}

export interface ExpenseSplit {
  id: number;
  expense_id: number;
  person_id: number;
  person_name: string;
}

// ─── Tax ─────────────────────────────────────────────────────────────────────

export const TAX_OPTIONS = [
  { label: '2.25%', value: 2.25 },
  { label: '3.25%', value: 3.25 },
  { label: '10.25%', value: 10.25 },
  { label: 'Custom', value: -1 },
] as const;

// ─── Firestore / Cloud Models ─────────────────────────────────────────────────

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  username: string;
  phoneNumber: string;
  friendIds: string[];
  incomingRequests: string[];
  outgoingRequests: string[];
  createdAt: string;
}

export interface GroupMember {
  uid: string;
  displayName: string;
  username: string;
}

export interface Group {
  id: string;
  name: string;
  createdBy: string;
  memberIds: string[];
  members: Record<string, { displayName: string; username: string }>;
  enabledTaxOptions: number[];
  simplifyDebts: boolean;
  createdAt: string;
  // Computed client-side
  expenseCount?: number;
  total?: number;
}

export interface GroupExpense {
  id: string;
  groupId: string;
  itemName: string;
  rawPrice: number;
  taxRate: number;
  totalPrice: number;
  quantity: number;
  isLiquor: boolean;
  liquorStateTax: number;
  liquorCountyTax: number;
  paidBy: string; // uid
  splits: Record<string, { displayName: string; amount: number }>;
  createdAt: string;
}

// Balance between two users
export interface BalanceEntry {
  fromUid: string;
  fromName: string;
  toUid: string;
  toName: string;
  amount: number;
}
