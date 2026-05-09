import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';
import { GroupExpense } from '../types';

// ─── Shared data builder ──────────────────────────────────────────────────────

function buildGroupData(
  expenses: GroupExpense[],
  members: Record<string, { displayName: string; username: string }>,
) {
  const memberList = Object.entries(members).map(([uid, m]) => ({
    uid,
    name: m.displayName,
  }));

  const headers = [
    'Item Name',
    'Item Total',
    'Item Total with Tax',
    'Quantity',
    'Paid By',
    'Split By',
    ...memberList.map((m) => m.name),
  ];

  const dataRows: (string | number)[][] = expenses.map((expense) => {
    const splitUids = new Set(Object.keys(expense.splits));
    const splitCount = splitUids.size;
    const sharePerPerson =
      splitCount > 0
        ? parseFloat((expense.totalPrice / splitCount).toFixed(2))
        : 0;
    const paidByName = members[expense.paidBy]?.displayName ?? expense.paidBy;

    return [
      expense.itemName,
      parseFloat(expense.rawPrice.toFixed(2)),
      parseFloat(expense.totalPrice.toFixed(2)),
      expense.quantity,
      paidByName,
      splitCount,
      ...memberList.map((m) => (splitUids.has(m.uid) ? sharePerPerson : '')),
    ];
  });

  const totalRaw = parseFloat(
    expenses.reduce((s, e) => s + e.rawPrice, 0).toFixed(2),
  );
  const totalWithTax = parseFloat(
    expenses.reduce((s, e) => s + e.totalPrice, 0).toFixed(2),
  );
  const personTotals = memberList.map((_m, pi) =>
    parseFloat(
      dataRows
        .reduce((sum, row) => {
          const val = row[6 + pi];
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
    '',
    ...personTotals,
  ];

  return { headers, dataRows, totalRow, memberList, expenses };
}

// ─── Excel export ─────────────────────────────────────────────────────────────

export async function exportGroupToExcel(
  groupName: string,
  expenses: GroupExpense[],
  members: Record<string, { displayName: string; username: string }>,
): Promise<void> {
  const { headers, dataRows, totalRow } = buildGroupData(expenses, members);

  const aoa = [headers, ...dataRows, totalRow];
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  for (let col = 0; col < headers.length; col++) {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!ws[cellRef]) ws[cellRef] = { v: headers[col], t: 's' };
    ws[cellRef].s = {
      fill: { fgColor: { rgb: 'FFD700' }, patternType: 'solid' },
      font: { bold: true },
    };
  }

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

  const safeName = groupName.replace(/[^a-zA-Z0-9_\- ]/g, '_');
  const fileUri = (FileSystem.documentDirectory ?? '') + `${safeName}_expenses.xlsx`;
  await FileSystem.writeAsStringAsync(fileUri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle: `Export "${groupName}"`,
    });
  }
}

// ─── PDF export ───────────────────────────────────────────────────────────────

export async function exportGroupToPdf(
  groupName: string,
  expenses: GroupExpense[],
  members: Record<string, { displayName: string; username: string }>,
): Promise<void> {
  const { headers, dataRows, totalRow } = buildGroupData(expenses, members);

  const headerCells = headers
    .map(
      (h) =>
        `<th style="background:#FFD700;color:#333;font-weight:700;padding:8px 10px;border:1px solid #ccc;text-align:left;">${h}</th>`,
    )
    .join('');

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
  <h1>${groupName}</h1>
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
  const safeName = groupName.replace(/[^a-zA-Z0-9_\- ]/g, '_');
  const destUri = (FileSystem.documentDirectory ?? '') + `${safeName}_expenses.pdf`;
  await FileSystem.copyAsync({ from: uri, to: destUri });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(destUri, {
      mimeType: 'application/pdf',
      dialogTitle: `Export "${groupName}"`,
    });
  }
}
