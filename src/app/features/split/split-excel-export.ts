import type { Cell, Row, Workbook, Worksheet } from 'exceljs';
import { GroupExport, SettlementMethod, SettlementStatus, SplitType } from '../../core/models/split.model';

const HEADER_FILL = 'FF3B3F8F';
const HEADER_FONT = 'FFFFFFFF';
const SUBTLE_FILL = 'FFF1F2F9';
const GREEN = 'FF15803D';
const RED = 'FFB91C1C';
const MUTED = 'FF6B7280';
const EPS = 0.005;

const SPLIT_TYPE_LABEL: Record<number, string> = {
  [SplitType.Equal]: 'Equal',
  [SplitType.Exact]: 'Exact amounts',
  [SplitType.Percentage]: 'Percentage',
  [SplitType.Shares]: 'Shares'
};
const METHOD_LABEL: Record<number, string> = {
  [SettlementMethod.Upi]: 'UPI',
  [SettlementMethod.Cash]: 'Cash',
  [SettlementMethod.BankTransfer]: 'Bank transfer',
  [SettlementMethod.Other]: 'Other'
};
const STATUS_LABEL: Record<number, string> = {
  [SettlementStatus.Pending]: 'Pending',
  [SettlementStatus.AwaitingConfirmation]: 'Awaiting confirmation',
  [SettlementStatus.Completed]: 'Completed'
};

function col(n: number): string {
  let s = '';
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

/** Date-only strings become UTC-midnight dates so Excel never shows the previous day. */
function toExcelDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const [y, m, d] = iso.split('T')[0].split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d));
}

function styleHeader(row: Row): void {
  row.height = 22;
  row.eachCell((cell: Cell) => {
    cell.font = { bold: true, color: { argb: HEADER_FONT } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = { bottom: { style: 'thin', color: { argb: 'FF2A2D6B' } } };
  });
}

function styleTotalRow(row: Row): void {
  row.eachCell((cell: Cell) => {
    cell.font = { bold: true };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SUBTLE_FILL } };
    cell.border = { top: { style: 'thin', color: { argb: 'FF9CA3AF' } } };
  });
}

function sectionTitle(sheet: Worksheet, rowNumber: number, text: string): void {
  const cell = sheet.getCell(rowNumber, 1);
  cell.value = text;
  cell.font = { bold: true, size: 13, color: { argb: HEADER_FILL } };
}

function signedColor(cell: Cell, value: number): void {
  if (value > EPS) cell.font = { ...(cell.font ?? {}), color: { argb: GREEN } };
  else if (value < -EPS) cell.font = { ...(cell.font ?? {}), color: { argb: RED } };
  else cell.font = { ...(cell.font ?? {}), color: { argb: MUTED } };
}

export async function exportSplitGroupToExcel(data: GroupExport): Promise<void> {
  const ExcelJS = await import('exceljs');
  const wb: Workbook = new ExcelJS.Workbook();
  wb.creator = 'FinPlanner';
  wb.created = new Date();

  const sym = data.currency === 'INR' ? '₹' : '';
  const money = sym ? `"${sym}" #,##0.00;[Red]-"${sym}" #,##0.00` : '#,##0.00;[Red]-#,##0.00';
  const signedMoney = sym ? `+"${sym}" #,##0.00;-"${sym}" #,##0.00;"${sym}" 0.00` : '+#,##0.00;-#,##0.00;0.00';

  const members = data.members;
  const memberIdx = new Map<number, number>(members.map((m, i) => [m.id, i]));
  const n = members.length;

  const expenses = [...data.expenses].sort((a, b) =>
    a.date === b.date ? a.id - b.id : (a.date < b.date ? -1 : 1));

  // ── Sheet 1: Summary ─────────────────────────────────────────────────────
  const summary = wb.addWorksheet('Summary', { views: [{ showGridLines: false }] });
  summary.getCell('A1').value = data.groupName;
  summary.getCell('A1').font = { bold: true, size: 18, color: { argb: HEADER_FILL } };
  summary.getCell('A2').value =
    `Exported ${new Date(data.exportedAtUtc).toLocaleString()} · ${expenses.length} expenses · ` +
    `${n} members · Currency ${data.currency}`;
  summary.getCell('A2').font = { color: { argb: MUTED } };

  const sumHeaderRow = 4;
  summary.getRow(sumHeaderRow).values = [
    'Member', 'Paid for expenses', 'Fair share', 'Settled: paid out', 'Settled: received', 'Net balance', 'Status'
  ];
  styleHeader(summary.getRow(sumHeaderRow));

  const balanceById = new Map(data.balances.balances.map(b => [b.memberId, b]));
  members.forEach((m, i) => {
    const r = sumHeaderRow + 1 + i;
    const b = balanceById.get(m.id);
    const net = b?.netBalance ?? 0;
    const row = summary.getRow(r);
    row.getCell(1).value = m.name;
    row.getCell(2).value = b?.totalPaid ?? 0;
    row.getCell(3).value = b?.totalShare ?? 0;
    row.getCell(4).value = b?.settledPaid ?? 0;
    row.getCell(5).value = b?.settledReceived ?? 0;
    row.getCell(6).value = { formula: `B${r}-C${r}+D${r}-E${r}`, result: net };
    row.getCell(7).value = {
      formula: `IF(F${r}>${EPS},"Gets back",IF(F${r}<-${EPS},"Owes","Settled"))`,
      result: net > EPS ? 'Gets back' : net < -EPS ? 'Owes' : 'Settled'
    };
    for (let c = 2; c <= 6; c++) row.getCell(c).numFmt = money;
    row.getCell(6).numFmt = signedMoney;
    row.getCell(6).font = { bold: true };
    signedColor(row.getCell(6), net);
    signedColor(row.getCell(7), net);
    row.getCell(7).alignment = { horizontal: 'center' };
  });

  const firstMemberRow = sumHeaderRow + 1;
  const lastMemberRow = sumHeaderRow + n;
  const totalRow = summary.getRow(lastMemberRow + 1);
  totalRow.getCell(1).value = 'Total';
  for (let c = 2; c <= 6; c++) {
    const L = col(c);
    totalRow.getCell(c).value = { formula: `SUM(${L}${firstMemberRow}:${L}${lastMemberRow})` };
    totalRow.getCell(c).numFmt = c === 6 ? signedMoney : money;
  }
  styleTotalRow(totalRow);

  let r = lastMemberRow + 3;
  summary.getCell(r, 1).value =
    'Net balance = Paid for expenses − Fair share + Settled paid out − Settled received. ' +
    'Positive means the person is owed money; negative means they owe money. The total net is always ₹0.';
  summary.getCell(r, 1).font = { italic: true, color: { argb: MUTED } };
  r += 2;

  sectionTitle(summary, r, 'Settle-up plan (fewest possible payments)');
  r += 1;
  summary.getRow(r).values = ['From (pays)', 'To (receives)', 'Amount'];
  styleHeader(summary.getRow(r));
  const plan = data.balances.simplifiedPlan;
  const planStart = r + 1;
  if (plan.length === 0) {
    summary.getCell(r + 1, 1).value = 'Everyone is settled up 🎉';
    summary.getCell(r + 1, 1).font = { color: { argb: GREEN }, bold: true };
    r += 2;
  } else {
    plan.forEach((d, i) => {
      const row = summary.getRow(planStart + i);
      row.getCell(1).value = d.fromMemberName;
      row.getCell(2).value = d.toMemberName;
      row.getCell(3).value = d.amount;
      row.getCell(3).numFmt = money;
    });
    const planEnd = planStart + plan.length - 1;
    const planTotal = summary.getRow(planEnd + 1);
    planTotal.getCell(1).value = `${plan.length} payment${plan.length === 1 ? '' : 's'}`;
    planTotal.getCell(3).value = { formula: `SUM(C${planStart}:C${planEnd})` };
    planTotal.getCell(3).numFmt = money;
    styleTotalRow(planTotal);
    r = planEnd + 3;
  }

  const categories = data.balances.categoryBreakdown ?? [];
  if (categories.length > 0) {
    sectionTitle(summary, r, 'Spend by category');
    r += 1;
    summary.getRow(r).values = ['Category', 'Expenses', 'Amount', 'Share of spend'];
    styleHeader(summary.getRow(r));
    const catStart = r + 1;
    const catEnd = catStart + categories.length - 1;
    categories.forEach((c, i) => {
      const row = summary.getRow(catStart + i);
      row.getCell(1).value = c.category;
      row.getCell(2).value = c.count;
      row.getCell(3).value = c.amount;
      row.getCell(3).numFmt = money;
      row.getCell(4).value = { formula: `C${catStart + i}/C${catEnd + 1}` };
      row.getCell(4).numFmt = '0.0%';
    });
    const catTotal = summary.getRow(catEnd + 1);
    catTotal.getCell(1).value = 'Total';
    catTotal.getCell(2).value = { formula: `SUM(B${catStart}:B${catEnd})` };
    catTotal.getCell(3).value = { formula: `SUM(C${catStart}:C${catEnd})` };
    catTotal.getCell(3).numFmt = money;
    catTotal.getCell(4).value = { formula: `SUM(D${catStart}:D${catEnd})` };
    catTotal.getCell(4).numFmt = '0.0%';
    styleTotalRow(catTotal);
  }

  summary.columns = [
    { width: 26 }, { width: 20 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 14 }
  ];

  // ── Sheet 2: Expenses (each person's share) ──────────────────────────────
  const exp = wb.addWorksheet('Expenses', { views: [{ state: 'frozen', xSplit: 2, ySplit: 1 }] });
  const fixedCols = ['Date', 'Description', 'Category', 'Split type', 'Total', 'Paid by'];
  exp.getRow(1).values = [...fixedCols, ...members.map(m => `${m.name}\n(share)`)];
  styleHeader(exp.getRow(1));
  exp.getRow(1).height = 34;

  expenses.forEach((e, i) => {
    const row = exp.getRow(2 + i);
    row.getCell(1).value = toExcelDate(e.date);
    row.getCell(1).numFmt = 'dd-mmm-yyyy';
    row.getCell(2).value = e.description;
    row.getCell(3).value = e.category ?? 'General';
    row.getCell(4).value = SPLIT_TYPE_LABEL[e.splitType] ?? '';
    row.getCell(5).value = e.amount;
    row.getCell(5).numFmt = money;
    row.getCell(6).value = e.payers.length === 1
      ? e.payers[0].memberName
      : e.payers.map(p => `${p.memberName} (${p.amountPaid.toFixed(2)})`).join(', ');
    members.forEach((m, mi) => {
      const share = e.participants.find(p => p.memberId === m.id)?.shareAmount ?? 0;
      const cell = row.getCell(fixedCols.length + 1 + mi);
      cell.value = share === 0 ? null : share;
      cell.numFmt = money;
    });
  });
  if (expenses.length > 0) {
    const last = 1 + expenses.length;
    const tr = exp.getRow(last + 1);
    tr.getCell(2).value = 'Total';
    tr.getCell(5).value = { formula: `SUM(E2:E${last})` };
    tr.getCell(5).numFmt = money;
    members.forEach((_, mi) => {
      const L = col(fixedCols.length + 1 + mi);
      const cell = tr.getCell(fixedCols.length + 1 + mi);
      cell.value = { formula: `SUM(${L}2:${L}${last})` };
      cell.numFmt = money;
    });
    styleTotalRow(tr);
    exp.autoFilter = { from: { row: 1, column: 1 }, to: { row: last, column: fixedCols.length + n } };
  }
  exp.columns = [
    { width: 13 }, { width: 30 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 24 },
    ...members.map(() => ({ width: 14 }))
  ];

  // ── Sheet 3: Expense Impact (paid − share, per expense) ──────────────────
  const imp = wb.addWorksheet('Expense Impact', { views: [{ state: 'frozen', xSplit: 2, ySplit: 1 }] });
  const impFixed = ['Date', 'Description', 'Total'];
  imp.getRow(1).values = [...impFixed, ...members.map(m => `${m.name}\n(+gets back / −owes)`)];
  styleHeader(imp.getRow(1));
  imp.getRow(1).height = 34;
  expenses.forEach((e, i) => {
    const row = imp.getRow(2 + i);
    row.getCell(1).value = toExcelDate(e.date);
    row.getCell(1).numFmt = 'dd-mmm-yyyy';
    row.getCell(2).value = e.description;
    row.getCell(3).value = e.amount;
    row.getCell(3).numFmt = money;
    members.forEach((m, mi) => {
      const paid = e.payers.filter(p => p.memberId === m.id).reduce((s, p) => s + p.amountPaid, 0);
      const share = e.participants.find(p => p.memberId === m.id)?.shareAmount ?? 0;
      const net = Math.round((paid - share) * 100) / 100;
      const cell = row.getCell(impFixed.length + 1 + mi);
      if (Math.abs(net) > EPS) {
        cell.value = net;
        cell.numFmt = signedMoney;
        signedColor(cell, net);
      }
    });
  });
  if (expenses.length > 0) {
    const last = 1 + expenses.length;
    const tr = imp.getRow(last + 1);
    tr.getCell(2).value = 'Total (before settlements)';
    members.forEach((_, mi) => {
      const L = col(impFixed.length + 1 + mi);
      const cell = tr.getCell(impFixed.length + 1 + mi);
      cell.value = { formula: `SUM(${L}2:${L}${last})` };
      cell.numFmt = signedMoney;
    });
    styleTotalRow(tr);
  }
  imp.columns = [{ width: 13 }, { width: 30 }, { width: 14 }, ...members.map(() => ({ width: 16 }))];

  // ── Sheet 4: Who Owes Whom (pairwise) ────────────────────────────────────
  const owes: number[][] = Array.from({ length: n }, () => Array<number>(n).fill(0));
  for (const e of expenses) {
    const paidTotal = e.payers.reduce((s, p) => s + p.amountPaid, 0);
    if (paidTotal <= 0) continue;
    for (const part of e.participants) {
      const a = memberIdx.get(part.memberId);
      if (a === undefined) continue;
      for (const payer of e.payers) {
        const b = memberIdx.get(payer.memberId);
        if (b === undefined || a === b) continue;
        owes[a][b] += part.shareAmount * (payer.amountPaid / paidTotal);
      }
    }
  }
  for (const s of data.settlements) {
    if (s.status !== SettlementStatus.Completed) continue;
    const a = memberIdx.get(s.fromMemberId);
    const b = memberIdx.get(s.toMemberId);
    if (a !== undefined && b !== undefined) owes[a][b] -= s.amount;
  }

  const who = wb.addWorksheet('Who Owes Whom', { views: [{ state: 'frozen', xSplit: 1, ySplit: 3 }] });
  who.getCell('A1').value =
    'Read across: the person in the row owes the person in the column. Amounts are netted between each pair and ' +
    'include confirmed settlements. The Summary sheet shows the same debts combined into the fewest payments.';
  who.getCell('A1').font = { italic: true, color: { argb: MUTED } };
  who.getRow(3).values = ['Owes →', ...members.map(m => m.name), 'Total owes'];
  styleHeader(who.getRow(3));
  members.forEach((m, a) => {
    const row = who.getRow(4 + a);
    row.getCell(1).value = m.name;
    row.getCell(1).font = { bold: true };
    members.forEach((_, b) => {
      const cell = row.getCell(2 + b);
      if (a === b) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
        return;
      }
      const net = Math.round((owes[a][b] - owes[b][a]) * 100) / 100;
      if (net > EPS) {
        cell.value = net;
        cell.numFmt = money;
        cell.font = { color: { argb: RED } };
      }
    });
    const L1 = col(2);
    const L2 = col(1 + n);
    const totalCell = row.getCell(2 + n);
    totalCell.value = { formula: `SUM(${L1}${4 + a}:${L2}${4 + a})` };
    totalCell.numFmt = money;
    totalCell.font = { bold: true };
  });
  const owedRow = who.getRow(4 + n);
  owedRow.getCell(1).value = 'Total owed to';
  members.forEach((_, b) => {
    const L = col(2 + b);
    owedRow.getCell(2 + b).value = { formula: `SUM(${L}4:${L}${3 + n})` };
    owedRow.getCell(2 + b).numFmt = money;
  });
  styleTotalRow(owedRow);
  who.columns = [{ width: 22 }, ...members.map(() => ({ width: 14 })), { width: 14 }];

  // ── Sheet 5: Settlements ─────────────────────────────────────────────────
  const st = wb.addWorksheet('Settlements', { views: [{ state: 'frozen', ySplit: 1 }] });
  st.getRow(1).values = ['From', 'To', 'Amount', 'Method', 'Status', 'Reference', 'Completed on'];
  styleHeader(st.getRow(1));
  data.settlements.forEach((s, i) => {
    const row = st.getRow(2 + i);
    row.getCell(1).value = s.fromMemberName;
    row.getCell(2).value = s.toMemberName;
    row.getCell(3).value = s.amount;
    row.getCell(3).numFmt = money;
    row.getCell(4).value = METHOD_LABEL[s.method] ?? '';
    row.getCell(5).value = STATUS_LABEL[s.status] ?? '';
    row.getCell(6).value = s.paymentReference;
    row.getCell(7).value = s.completedAt ? new Date(s.completedAt) : null;
    row.getCell(7).numFmt = 'dd-mmm-yyyy hh:mm';
    row.getCell(5).font = {
      color: { argb: s.status === SettlementStatus.Completed ? GREEN : MUTED },
      bold: s.status === SettlementStatus.Completed
    };
  });
  if (data.settlements.length === 0) {
    st.getCell('A2').value = 'No settlements recorded yet.';
    st.getCell('A2').font = { italic: true, color: { argb: MUTED } };
  }
  st.columns = [{ width: 22 }, { width: 22 }, { width: 14 }, { width: 14 }, { width: 22 }, { width: 28 }, { width: 20 }];

  // ── Download ─────────────────────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const fileBase = data.groupName.replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim() || 'trip';
  a.download = `${fileBase} - expense report.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}