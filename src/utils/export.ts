import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';
import {
  getExpenses,
  getExpenseSplits,
  getInvolvedPeople,
} from '../db/database';

// ─── Shared data builder ──────────────────────────────────────────────────────

function buildSheetData(sheetId: number) {
  const expenses = getExpenses(sheetId);
  const people = getInvolvedPeople(sheetId);

  const headers = [
    'Item Name',
    'Item Total',
    'Item Total with Tax',
    'Quantity',
    'Item Split By',
    ...people.map((p) => p.name),
  ];

  const dataRows: (string | number)[][] = expenses.map((expense) => {
    const splits = getExpenseSplits(expense.id);
    const splitPersonIds = new Set(splits.map((s) => s.person_id));
    const sharePerPerson =
      expense.split_count > 0
        ? parseFloat((expense.total_price / expense.split_count).toFixed(2))
        : 0;

    return [
      expense.item_name,
      parseFloat(expense.raw_price.toFixed(2)),
      parseFloat(expense.total_price.toFixed(2)),
      expense.quantity ?? 1,
      expense.split_count,
      ...people.map((p) =>
        splitPersonIds.has(p.id) ? sharePerPerson : '',
      ),
    ];
  });

  const totalRaw = parseFloat(
    expenses.reduce((s, e) => s + e.raw_price, 0).toFixed(2),
  );
  const totalWithTax = parseFloat(
    expenses.reduce((s, e) => s + e.total_price, 0).toFixed(2),
  );
  const personTotals = people.map((_p, pi) =>
    parseFloat(
      dataRows
        .reduce((sum, row) => {
          const val = row[5 + pi];
          return sum + (typeof val === 'number' ? val : 0);
        }, 0)
        .toFixed(2),
    ),
  );

  const totalRow: (string | number)[] = [
    'TOTAL',
    totalRaw,
    totalWithTax,
    '',
    '',
    ...personTotals,
  ];

  return { headers, dataRows, totalRow, people, expenses };
}

// ─── Excel export ─────────────────────────────────────────────────────────────

export async function exportSheetToExcel(
  sheetId: number,
  sheetName: string,
): Promise<void> {
  const { headers, dataRows, totalRow } = buildSheetData(sheetId);

  const aoa = [headers, ...dataRows, totalRow];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Yellow header row
  for (let col = 0; col < headers.length; col++) {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!ws[cellRef]) ws[cellRef] = { v: headers[col], t: 's' };
    ws[cellRef].s = {
      fill: { fgColor: { rgb: 'FFD700' }, patternType: 'solid' },
      font: { bold: true },
    };
  }

  // Green total row (last row)
  const totalRowIndex = aoa.length - 1;
  for (let col = 0; col < headers.length; col++) {
    const cellRef = XLSX.utils.encode_cell({ r: totalRowIndex, c: col });
    if (!ws[cellRef]) ws[cellRef] = { v: '', t: 's' };
    ws[cellRef].s = {
      fill: { fgColor: { rgb: '34C759' }, patternType: 'solid' },
      font: { bold: true, color: { rgb: 'FFFFFF' } },
    };
  }

  ws['!cols'] = headers.map((h, i) => {
    const maxLen = Math.max(
      h.length,
      ...aoa.slice(1).map((row) => String(row[i] ?? '').length),
    );
    return { wch: Math.min(maxLen + 2, 30) };
  });

  XLSX.utils.book_append_sheet(wb, ws, 'Expenses');

  const base64 = XLSX.write(wb, {
    type: 'base64',
    bookType: 'xlsx',
    cellStyles: true,
  });

  const safeSheetName = sheetName.replace(/[^a-zA-Z0-9_\- ]/g, '_');
  const filename = `${safeSheetName}_expenses.xlsx`;
  const fileUri = (FileSystem.documentDirectory ?? '') + filename;

  await FileSystem.writeAsStringAsync(fileUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const isAvailable = await Sharing.isAvailableAsync();
  if (isAvailable) {
    await Sharing.shareAsync(fileUri, {
      mimeType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle: `Export "${sheetName}"`,
    });
  }
}

// ─── PDF export ───────────────────────────────────────────────────────────────

export async function exportSheetToPdf(
  sheetId: number,
  sheetName: string,
): Promise<void> {
  const { headers, dataRows, totalRow, people } = buildSheetData(sheetId);

  const colCount = headers.length;

  // Build header cells
  const headerCells = headers
    .map(
      (h) =>
        `<th style="background:#FFD700;color:#333;font-weight:700;padding:8px 10px;border:1px solid #ccc;text-align:left;">${h}</th>`,
    )
    .join('');

  // Build data row cells
  const dataCellRows = dataRows
    .map((row) => {
      const cells = row
        .map((cell) => {
          const val = cell === '' ? '' : String(cell);
          return `<td style="padding:7px 10px;border:1px solid #e0e0e0;">${val}</td>`;
        })
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');

  // Build total row cells
  const totalCells = totalRow
    .map((cell) => {
      const val = cell === '' ? '' : String(cell);
      return `<td style="padding:7px 10px;border:1px solid #ccc;font-weight:700;color:#fff;background:#34C759;">${val}</td>`;
    })
    .join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <style>
    body { font-family: -apple-system, Helvetica, Arial, sans-serif; margin: 32px; color: #333; }
    h1 { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
    .subtitle { font-size: 12px; color: #888; margin-bottom: 20px; }
    table { border-collapse: collapse; width: 100%; font-size: 13px; }
    tr:nth-child(even) { background: #f9f9f9; }
  </style>
</head>
<body>
  <h1>${sheetName}</h1>
  <p class="subtitle">Exported ${new Date().toLocaleDateString()}</p>
  <table>
    <thead><tr>${headerCells}</tr></thead>
    <tbody>
      ${dataCellRows}
      <tr>${totalCells}</tr>
    </tbody>
  </table>
</body>
</html>`;

  const { uri } = await Print.printToFileAsync({ html });

  const safeSheetName = sheetName.replace(/[^a-zA-Z0-9_\- ]/g, '_');
  const destUri =
    (FileSystem.documentDirectory ?? '') + `${safeSheetName}_expenses.pdf`;

  await FileSystem.copyAsync({ from: uri, to: destUri });

  const isAvailable = await Sharing.isAvailableAsync();
  if (isAvailable) {
    await Sharing.shareAsync(destUri, {
      mimeType: 'application/pdf',
      dialogTitle: `Export "${sheetName}"`,
    });
  }
}
