import * as SQLite from 'expo-sqlite';
import { Expense, ExpenseSplit, Sheet, SheetPerson } from '../types';

// ─── Open DB (synchronous singleton) ─────────────────────────────────────────

const db = SQLite.openDatabaseSync('centsible.db');

// ─── Initialise Schema ────────────────────────────────────────────────────────

const DEFAULT_TAX_OPTIONS = [2.25, 3.25, 10.25];

function addColumnIfMissing(table: string, col: string, colDef: string): void {
  try {
    db.execSync(`ALTER TABLE ${table} ADD COLUMN ${col} ${colDef}`);
  } catch {
    // column already exists — ignore
  }
}

export function initDB(): void {
  db.execSync('PRAGMA journal_mode = WAL');
  db.execSync('PRAGMA foreign_keys = ON');

  db.execSync(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  db.execSync(`
    CREATE TABLE IF NOT EXISTS sheets (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      name                TEXT NOT NULL,
      created_at          TEXT NOT NULL,
      enabled_tax_options TEXT NOT NULL DEFAULT '[2.25,3.25,10.25]'
    )
  `);

  db.execSync(`
    CREATE TABLE IF NOT EXISTS sheet_people (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      sheet_id INTEGER NOT NULL,
      name     TEXT NOT NULL,
      FOREIGN KEY (sheet_id) REFERENCES sheets(id) ON DELETE CASCADE
    )
  `);

  db.execSync(`
    CREATE TABLE IF NOT EXISTS expenses (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      sheet_id          INTEGER NOT NULL,
      item_name         TEXT NOT NULL,
      raw_price         REAL NOT NULL,
      tax_rate          REAL NOT NULL,
      total_price       REAL NOT NULL,
      created_at        TEXT NOT NULL,
      quantity          INTEGER NOT NULL DEFAULT 1,
      is_liquor         INTEGER NOT NULL DEFAULT 0,
      liquor_state_tax  REAL NOT NULL DEFAULT 0,
      liquor_county_tax REAL NOT NULL DEFAULT 0,
      FOREIGN KEY (sheet_id) REFERENCES sheets(id) ON DELETE CASCADE
    )
  `);

  db.execSync(`
    CREATE TABLE IF NOT EXISTS expense_splits (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      expense_id INTEGER NOT NULL,
      person_id  INTEGER NOT NULL,
      FOREIGN KEY (expense_id) REFERENCES expenses(id) ON DELETE CASCADE,
      FOREIGN KEY (person_id)  REFERENCES sheet_people(id) ON DELETE CASCADE
    )
  `);

  // Migrate existing DBs — add new columns if they don't exist yet
  addColumnIfMissing('sheets', 'enabled_tax_options', "TEXT NOT NULL DEFAULT '[2.25,3.25,10.25]'");
  addColumnIfMissing('expenses', 'quantity', 'INTEGER NOT NULL DEFAULT 1');
  addColumnIfMissing('expenses', 'is_liquor', 'INTEGER NOT NULL DEFAULT 0');
  addColumnIfMissing('expenses', 'liquor_state_tax', 'REAL NOT NULL DEFAULT 0');
  addColumnIfMissing('expenses', 'liquor_county_tax', 'REAL NOT NULL DEFAULT 0');

  // Seed default user name once
  const existing = db.getFirstSync<{ value: string }>(
    'SELECT value FROM app_settings WHERE key = ?',
    ['user_name'],
  );
  if (!existing) {
    db.runSync('INSERT INTO app_settings (key, value) VALUES (?, ?)', [
      'user_name',
      'Kunal',
    ]);
  }
}

// ─── App Settings ─────────────────────────────────────────────────────────────

export function getAppSetting(key: string): string | null {
  const row = db.getFirstSync<{ value: string }>(
    'SELECT value FROM app_settings WHERE key = ?',
    [key],
  );
  return row?.value ?? null;
}

export function setAppSetting(key: string, value: string): void {
  db.runSync(
    'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
    [key, value],
  );
}

// ─── Sheets ───────────────────────────────────────────────────────────────────

export function getSheets(): Sheet[] {
  return db.getAllSync<Sheet>(`
    SELECT
      s.id,
      s.name,
      s.created_at,
      s.enabled_tax_options,
      COALESCE(SUM(e.total_price), 0) AS total,
      COUNT(e.id)                     AS item_count
    FROM sheets s
    LEFT JOIN expenses e ON e.sheet_id = s.id
    GROUP BY s.id
    ORDER BY s.created_at DESC
  `);
}

export function getSheet(id: number): Sheet | null {
  return db.getFirstSync<Sheet>(
    `
    SELECT
      s.id,
      s.name,
      s.created_at,
      s.enabled_tax_options,
      COALESCE(SUM(e.total_price), 0) AS total,
      COUNT(e.id)                     AS item_count
    FROM sheets s
    LEFT JOIN expenses e ON e.sheet_id = s.id
    WHERE s.id = ?
    GROUP BY s.id
  `,
    [id],
  );
}

export function createSheet(name: string): number {
  const result = db.runSync(
    'INSERT INTO sheets (name, created_at, enabled_tax_options) VALUES (?, ?, ?)',
    [name, new Date().toISOString(), JSON.stringify(DEFAULT_TAX_OPTIONS)],
  );
  return result.lastInsertRowId;
}

export function deleteSheet(id: number): void {
  db.runSync('DELETE FROM sheets WHERE id = ?', [id]);
}

export function updateSheetName(id: number, name: string): void {
  db.runSync('UPDATE sheets SET name = ? WHERE id = ?', [name, id]);
}

export function getSheetEnabledTaxOptions(sheetId: number): number[] {
  const row = db.getFirstSync<{ enabled_tax_options: string }>(
    'SELECT enabled_tax_options FROM sheets WHERE id = ?',
    [sheetId],
  );
  if (!row) return DEFAULT_TAX_OPTIONS;
  try {
    return JSON.parse(row.enabled_tax_options) as number[];
  } catch {
    return DEFAULT_TAX_OPTIONS;
  }
}

export function setSheetEnabledTaxOptions(sheetId: number, options: number[]): void {
  db.runSync(
    'UPDATE sheets SET enabled_tax_options = ? WHERE id = ?',
    [JSON.stringify(options), sheetId],
  );
}

// ─── Sheet People ─────────────────────────────────────────────────────────────

export function getSheetPeople(sheetId: number): SheetPerson[] {
  return db.getAllSync<SheetPerson>(
    'SELECT * FROM sheet_people WHERE sheet_id = ? ORDER BY name COLLATE NOCASE',
    [sheetId],
  );
}

export function addPersonToSheet(sheetId: number, name: string): number {
  const result = db.runSync(
    'INSERT INTO sheet_people (sheet_id, name) VALUES (?, ?)',
    [sheetId, name],
  );
  return result.lastInsertRowId;
}

export function removePersonFromSheet(personId: number): void {
  db.runSync('DELETE FROM sheet_people WHERE id = ?', [personId]);
}

// ─── Expenses ─────────────────────────────────────────────────────────────────

export function getExpenses(sheetId: number): Expense[] {
  return db.getAllSync<Expense>(
    `
    SELECT
      e.id,
      e.sheet_id,
      e.item_name,
      e.raw_price,
      e.tax_rate,
      e.total_price,
      e.created_at,
      e.quantity,
      e.is_liquor,
      e.liquor_state_tax,
      e.liquor_county_tax,
      COUNT(es.id)   AS split_count,
      CASE
        WHEN COUNT(es.id) > 0 THEN ROUND(e.total_price / COUNT(es.id), 2)
        ELSE 0
      END            AS per_person
    FROM expenses e
    LEFT JOIN expense_splits es ON es.expense_id = e.id
    WHERE e.sheet_id = ?
    GROUP BY e.id
    ORDER BY e.created_at ASC
  `,
    [sheetId],
  );
}

export function getExpense(id: number): Expense | null {
  return db.getFirstSync<Expense>(
    `
    SELECT
      e.id,
      e.sheet_id,
      e.item_name,
      e.raw_price,
      e.tax_rate,
      e.total_price,
      e.created_at,
      e.quantity,
      e.is_liquor,
      e.liquor_state_tax,
      e.liquor_county_tax,
      COUNT(es.id)   AS split_count,
      CASE
        WHEN COUNT(es.id) > 0 THEN ROUND(e.total_price / COUNT(es.id), 2)
        ELSE 0
      END            AS per_person
    FROM expenses e
    LEFT JOIN expense_splits es ON es.expense_id = e.id
    WHERE e.id = ?
    GROUP BY e.id
  `,
    [id],
  );
}

export function addExpense(
  sheetId: number,
  itemName: string,
  rawPrice: number,
  taxRate: number,
  totalPrice: number,
  personIds: number[],
  quantity: number = 1,
  isLiquor: boolean = false,
  liquorStateTax: number = 0,
  liquorCountyTax: number = 0,
): number {
  const result = db.runSync(
    `INSERT INTO expenses
      (sheet_id, item_name, raw_price, tax_rate, total_price, created_at,
       quantity, is_liquor, liquor_state_tax, liquor_county_tax)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      sheetId,
      itemName,
      rawPrice,
      taxRate,
      totalPrice,
      new Date().toISOString(),
      quantity,
      isLiquor ? 1 : 0,
      liquorStateTax,
      liquorCountyTax,
    ],
  );
  const expenseId = result.lastInsertRowId;

  for (const personId of personIds) {
    db.runSync(
      'INSERT INTO expense_splits (expense_id, person_id) VALUES (?, ?)',
      [expenseId, personId],
    );
  }

  return expenseId;
}

export function updateExpense(
  id: number,
  itemName: string,
  rawPrice: number,
  taxRate: number,
  totalPrice: number,
  personIds: number[],
  quantity: number,
  isLiquor: boolean,
  liquorStateTax: number,
  liquorCountyTax: number,
): void {
  db.runSync(
    `UPDATE expenses
     SET item_name = ?, raw_price = ?, tax_rate = ?, total_price = ?,
         quantity = ?, is_liquor = ?, liquor_state_tax = ?, liquor_county_tax = ?
     WHERE id = ?`,
    [itemName, rawPrice, taxRate, totalPrice, quantity, isLiquor ? 1 : 0, liquorStateTax, liquorCountyTax, id],
  );
  db.runSync('DELETE FROM expense_splits WHERE expense_id = ?', [id]);
  for (const personId of personIds) {
    db.runSync(
      'INSERT INTO expense_splits (expense_id, person_id) VALUES (?, ?)',
      [id, personId],
    );
  }
}

export function deleteExpense(id: number): void {
  db.runSync('DELETE FROM expenses WHERE id = ?', [id]);
}

// ─── Expense Splits ───────────────────────────────────────────────────────────

export function getExpenseSplits(expenseId: number): ExpenseSplit[] {
  return db.getAllSync<ExpenseSplit>(
    `
    SELECT
      es.id,
      es.expense_id,
      es.person_id,
      sp.name AS person_name
    FROM expense_splits es
    JOIN sheet_people sp ON sp.id = es.person_id
    WHERE es.expense_id = ?
    ORDER BY sp.name COLLATE NOCASE
  `,
    [expenseId],
  );
}

// ─── Export Helpers ───────────────────────────────────────────────────────────

/** Returns only the people who appear in at least one expense in the sheet. */
export function getInvolvedPeople(sheetId: number): SheetPerson[] {
  return db.getAllSync<SheetPerson>(
    `
    SELECT DISTINCT sp.id, sp.sheet_id, sp.name
    FROM sheet_people sp
    JOIN expense_splits es ON es.person_id = sp.id
    JOIN expenses e         ON e.id = es.expense_id
    WHERE e.sheet_id = ?
    ORDER BY sp.name COLLATE NOCASE
  `,
    [sheetId],
  );
}
