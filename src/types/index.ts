// ─── Navigation Param Lists ───────────────────────────────────────────────────

export type DrawerParamList = {
  HomeStack: undefined;
  AppSettings: undefined;
};

export type HomeStackParamList = {
  Home: undefined;
  Sheet: { sheetId: number; sheetName: string };
  SheetSettings: { sheetId: number };
  ItemDetail: { expenseId: number; itemName: string };
  AddItem: { sheetId: number; expenseId?: number };
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
