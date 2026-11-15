/**
 * Client-side statement reading. Nothing here talks to the server: the file is read, turned into a table,
 * mapped to columns and redacted in the browser. Only normalised rows are ever sent.
 */

export type ColumnRole = 'ignore' | 'date' | 'description' | 'debit' | 'credit' | 'amount' | 'drcr' | 'balance' | 'ref';

export interface ColumnMapping {
  roles: ColumnRole[];
  headerRow: number;      // index of the header row in the table (-1 = none)
  dayFirst: boolean;
  positiveIsOut: boolean; // single "amount" column: positive numbers are money going out (card statements)
}

export interface ParsedRow {
  date: Date;
  description: string;
  amount: number;
  type: 'Income' | 'Expense';
  rawRef?: string;
  balance?: number;
}

export interface NormaliseResult {
  rows: ParsedRow[];
  skipped: number;
  chain: { checked: number; broken: number } | null;
}

// ───────────────────────── reading files ─────────────────────────

export class PasswordNeeded extends Error {
  constructor(public wrong: boolean) {
    super(wrong ? 'That password is not correct.' : 'This PDF is password protected.');
  }
}

export async function readStatementFile(file: File, password?: string): Promise<string[][]> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.pdf')) return readPdf(file, password);
  if (name.endsWith('.xlsx')) return readXlsx(file);
  if (name.endsWith('.xls')) throw new Error('Old .xls files are not supported. Open it in Excel and save as .xlsx or .csv, or download the CSV from your bank.');
  return parseCsv(await file.text());
}

export function parseCsv(text: string): string[][] {
  text = text.replace(/^﻿/, '');
  const firstLines = text.split(/\r?\n/).slice(0, 15).join('\n');
  const delims = [',', ';', '\t', '|'];
  const delim = delims.map(d => ({ d, n: firstLines.split(d).length })).sort((a, b) => b.n - a.n)[0].d;
  const rows: string[][] = [];
  let row: string[] = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === delim) { row.push(cell.trim()); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell.trim()); cell = '';
      if (row.some(x => x !== '')) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell.trim());
  if (row.some(x => x !== '')) rows.push(row);
  return squareUp(rows);
}

async function readXlsx(file: File): Promise<string[][]> {
  const ExcelJS: any = await import('exceljs');
  const wb = new (ExcelJS.Workbook ?? ExcelJS.default.Workbook)();
  try { await wb.xlsx.load(await file.arrayBuffer()); }
  catch { throw new Error('Could not open this Excel file. If it is password protected, open it in Excel, remove the password and save a copy, or use the PDF/CSV version.'); }
  const ws = wb.worksheets.find((w: any) => w.rowCount > 1) ?? wb.worksheets[0];
  if (!ws) throw new Error('The workbook has no sheets.');
  const out: string[][] = [];
  ws.eachRow({ includeEmpty: false }, (r: any) => {
    const cells: string[] = [];
    for (let c = 1; c <= ws.columnCount; c++) cells.push(cellText(r.getCell(c).value));
    if (cells.some(x => x !== '')) out.push(cells);
  });
  return squareUp(out);
}

function cellText(v: any): string {
  if (v == null) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'object') {
    if ('result' in v) return cellText(v.result);
    if ('richText' in v) return v.richText.map((t: any) => t.text).join('');
    if ('text' in v) return String(v.text);
    return '';
  }
  return String(v).trim();
}

interface PdfItem { text: string; x: number; w: number; y: number; }

async function readPdf(file: File, password?: string): Promise<string[][]> {
  const pdfjs: any = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  let doc: any;
  try {
    doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), password }).promise;
  } catch (e: any) {
    if (e?.name === 'PasswordException') throw new PasswordNeeded(e.code === 2);
    throw e;
  }
  const lines: PdfItem[][] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const items: PdfItem[] = content.items
      .filter((i: any) => typeof i.str === 'string' && i.str.trim() !== '')
      .map((i: any) => ({ text: i.str.trim(), x: i.transform[4], w: i.width ?? 0, y: i.transform[5] }));
    // group by baseline
    items.sort((a, b) => b.y - a.y || a.x - b.x);
    let cur: PdfItem[] = [];
    let curY = Number.NaN;
    for (const it of items) {
      if (cur.length && Math.abs(it.y - curY) > 3) { lines.push(cur.sort((a, b) => a.x - b.x)); cur = []; }
      if (!cur.length) curY = it.y;
      cur.push(it);
    }
    if (cur.length) lines.push(cur.sort((a, b) => a.x - b.x));
  }
  if (lines.every(l => l.length === 0) || lines.length < 3)
    throw new Error('No readable text found. Scanned PDFs are not supported — download the CSV/Excel version from your bank instead.');
  return alignPdf(lines);
}

const HEADER_WORDS = /^(date|txn date|tran date|transaction date|value date|narration|description|particulars|details|remarks|transaction details|debit|withdrawal|withdrawals|dr|credit|deposit|deposits|cr|amount|balance|closing balance|ref|reference|chq|cheque|ref no|chq\/ref|instrument)/i;

/** Turn positioned PDF lines into a table: columns are anchored to the header line's x positions. */
function alignPdf(lines: PdfItem[][]): string[][] {
  // join neighbouring words into cells (gap smaller than ~1.5 char widths = same cell)
  const cellsOf = (items: PdfItem[]) => {
    const out: { text: string; x: number; r: number }[] = [];
    for (const it of items) {
      const last = out[out.length - 1];
      if (last && it.x - last.r < 6) { last.text += ' ' + it.text; last.r = it.x + it.w; }
      else out.push({ text: it.text, x: it.x, r: it.x + it.w });
    }
    return out;
  };
  const cellLines = lines.map(cellsOf);
  const hi = cellLines.findIndex(c => c.filter(x => HEADER_WORDS.test(x.text)).length >= 3);
  if (hi < 0) return squareUp(cellLines.map(c => c.map(x => x.text)));

  const head = cellLines[hi];
  const out: string[][] = [head.map(h => h.text)];
  const isNum = (t: string) => /^[\(\-]?[₹]?\s*\d[\d,]*(\.\d+)?\s*(cr|dr)?\)?$/i.test(t.replace(/\s/g, ''));
  for (let li = hi + 1; li < cellLines.length; li++) {
    const row = new Array(head.length).fill('');
    for (const c of cellLines[li]) {
      let best = 0, bestD = Infinity;
      for (let k = 0; k < head.length; k++) {
        const d = isNum(c.text) ? Math.abs(c.r - head[k].r) : Math.abs(c.x - head[k].x);
        if (d < bestD) { bestD = d; best = k; }
      }
      row[best] = row[best] ? row[best] + ' ' + c.text : c.text;
    }
    out.push(row);
  }
  return out;
}

function squareUp(rows: string[][]): string[][] {
  const w = Math.max(0, ...rows.map(r => r.length));
  return rows.map(r => r.concat(new Array(w - r.length).fill('')));
}

// ───────────────────────── column detection ─────────────────────────

const ROLE_WORDS: [ColumnRole, RegExp][] = [
  ['date', /^(txn\.?\s*date|tran\.?\s*date|transaction date|posting date|date|value date)$/i],
  ['description', /(narration|description|particulars|details|remarks|transaction details|merchant)/i],
  ['debit', /(debit|withdrawal|withdrawals|paid out|money out|dr\.? amount|spent)/i],
  ['credit', /(credit|deposit|deposits|paid in|money in|cr\.? amount|received)/i],
  ['drcr', /^(dr\s*\/\s*cr|cr\s*\/\s*dr|type|dr\/cr)$/i],
  ['balance', /(balance)/i],
  ['ref', /(ref|chq|cheque|utr|instrument|transaction id|txn id)/i],
  ['amount', /^(amount|transaction amount|amt)/i],
];

export function detectMapping(table: string[][]): ColumnMapping {
  let best = -1, bestScore = 0;
  for (let i = 0; i < Math.min(table.length, 60); i++) {
    const hits = table[i].filter(c => c && ROLE_WORDS.some(([, re]) => re.test(c.trim()))).length;
    if (hits > bestScore) { bestScore = hits; best = i; }
  }
  const width = table[0]?.length ?? 0;
  const roles: ColumnRole[] = new Array(width).fill('ignore');
  if (best >= 0 && bestScore >= 2) {
    const used = new Set<ColumnRole>();
    table[best].forEach((c, idx) => {
      const hit = ROLE_WORDS.find(([role, re]) => re.test((c ?? '').trim()) && !used.has(role));
      if (hit) { roles[idx] = hit[0]; used.add(hit[0]); }
    });
    return { roles, headerRow: best, dayFirst: true, positiveIsOut: false };
  }
  return { roles, headerRow: -1, dayFirst: true, positiveIsOut: false };
}

// ───────────────────────── normalising ─────────────────────────

const MONTHS: Record<string, number> = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

export function parseDate(raw: string, dayFirst: boolean): Date | null {
  const s = (raw ?? '').trim();
  if (!s) return null;
  let m = s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})/);
  if (m) return mk(+m[1], +m[2] - 1, +m[3]);
  m = s.match(/^(\d{1,2})[-\/. ]([A-Za-z]{3,9})[-\/. ,]*(\d{2,4})/);
  if (m && MONTHS[m[2].slice(0, 3).toLowerCase()] !== undefined) return mk(yr(+m[3]), MONTHS[m[2].slice(0, 3).toLowerCase()], +m[1]);
  m = s.match(/^(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2,4})/);
  if (m) return dayFirst ? mk(yr(+m[3]), +m[2] - 1, +m[1]) : mk(yr(+m[3]), +m[1] - 1, +m[2]);
  return null;
}
const yr = (y: number) => (y < 100 ? 2000 + y : y);
function mk(y: number, mo: number, d: number): Date | null {
  if (mo < 0 || mo > 11 || d < 1 || d > 31) return null;
  // noon UTC so timezone conversion never moves the day
  return new Date(Date.UTC(y, mo, d, 12, 0, 0));
}

export function parseAmount(raw: string): { value: number; drcr?: 'Dr' | 'Cr' } | null {
  let s = (raw ?? '').trim();
  if (!s) return null;
  let drcr: 'Dr' | 'Cr' | undefined;
  const t = s.match(/(cr|dr)\.?\s*$/i) ?? s.match(/^(cr|dr)\.?\s/i);
  if (t) { drcr = t[1].toLowerCase() === 'cr' ? 'Cr' : 'Dr'; s = s.replace(/(cr|dr)\.?/i, ''); }
  let neg = false;
  if (/^\(.*\)$/.test(s.trim())) { neg = true; s = s.trim().slice(1, -1); }
  s = s.replace(/[₹$,\s]|rs\.?|inr/gi, '');
  if (s.startsWith('-')) { neg = !neg; s = s.slice(1); }
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  const v = parseFloat(s);
  if (!isFinite(v)) return null;
  return { value: neg ? -v : v, drcr };
}

export function normalise(table: string[][], map: ColumnMapping): NormaliseResult {
  const col = (r: ColumnRole) => map.roles.indexOf(r);
  const iDate = col('date'), iDesc = col('description'), iDeb = col('debit'), iCred = col('credit');
  const iAmt = col('amount'), iDrCr = col('drcr'), iBal = col('balance'), iRef = col('ref');
  const rows: ParsedRow[] = [];
  let skipped = 0;
  if (iDate < 0 || (iDeb < 0 && iCred < 0 && iAmt < 0)) return { rows, skipped: table.length, chain: null };

  for (let i = map.headerRow + 1; i < table.length; i++) {
    const r = table[i];
    const d = parseDate(r[iDate], map.dayFirst);
    const desc = iDesc >= 0 ? (r[iDesc] ?? '').trim() : '';
    if (!d) {
      // continuation of the previous narration (wrapped PDF line) — has text but no date and no amounts
      const hasAmt = [iDeb, iCred, iAmt].some(k => k >= 0 && parseAmount(r[k]) != null);
      if (rows.length && desc && !hasAmt) rows[rows.length - 1].description += ' ' + desc;
      else skipped++;
      continue;
    }
    let amount = 0; let type: 'Income' | 'Expense' | null = null;
    const deb = iDeb >= 0 ? parseAmount(r[iDeb]) : null;
    const cre = iCred >= 0 ? parseAmount(r[iCred]) : null;
    if (deb && deb.value !== 0) { amount = Math.abs(deb.value); type = 'Expense'; }
    else if (cre && cre.value !== 0) { amount = Math.abs(cre.value); type = 'Income'; }
    else if (iAmt >= 0) {
      const a = parseAmount(r[iAmt]);
      if (a && a.value !== 0) {
        amount = Math.abs(a.value);
        let flag: 'Dr' | 'Cr' | undefined = a.drcr;
        if (!flag && iDrCr >= 0) { const f = (r[iDrCr] ?? '').trim().toLowerCase(); flag = f.startsWith('cr') || f === 'c' ? 'Cr' : f.startsWith('dr') || f === 'd' ? 'Dr' : undefined; }
        if (flag) type = flag === 'Cr' ? 'Income' : 'Expense';
        else type = (a.value < 0) !== map.positiveIsOut ? 'Expense' : 'Income';
      }
    }
    if (!type || amount === 0) { skipped++; continue; }
    const bal = iBal >= 0 ? parseAmount(r[iBal]) : null;
    rows.push({
      date: d, description: desc, amount: Math.round(amount * 100) / 100, type,
      rawRef: iRef >= 0 ? (r[iRef] ?? '').trim() || undefined : undefined,
      balance: bal ? (bal.drcr === 'Dr' ? -bal.value : bal.value) : undefined,
    });
  }
  return { rows, skipped, chain: balanceChain(rows) };
}

/** Does each row's balance follow from the previous one? Works for oldest-first or newest-first files. */
function balanceChain(rows: ParsedRow[]): { checked: number; broken: number } | null {
  const withBal = rows.filter(r => r.balance != null);
  if (withBal.length < 3 || withBal.length < rows.length * 0.8) return null;
  const run = (list: ParsedRow[]) => {
    let checked = 0, broken = 0;
    for (let i = 1; i < list.length; i++) {
      const prev = list[i - 1], cur = list[i];
      if (prev.balance == null || cur.balance == null) continue;
      checked++;
      const expect = prev.balance + (cur.type === 'Income' ? cur.amount : -cur.amount);
      if (Math.abs(expect - cur.balance) > 0.011) broken++;
    }
    return { checked, broken };
  };
  const fwd = run(withBal);
  const rev = run([...withBal].reverse());
  return fwd.broken <= rev.broken ? fwd : rev;
}

// ───────────────────────── redaction & hashing ─────────────────────────

export function redact(text: string, holderName: string): string {
  let t = text ?? '';
  t = t.replace(/[A-Z]{5}\d{4}[A-Z]/g, '[PAN]');
  t = t.replace(/([\w.+-]{1,})@([\w-]+(?:\.[\w.]+)?)/g, (_m, u: string, h: string) => u.slice(0, 2) + '•••@' + h);
  t = t.replace(/\d[\d -]{7,}\d/g, m => { const d = m.replace(/\D/g, ''); return d.length >= 9 ? '•••' + d.slice(-4) : m; });
  for (const part of (holderName ?? '').split(/\s+/).filter(p => p.length >= 3)) {
    t = t.replace(new RegExp(part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '•••');
  }
  return t.replace(/\s+/g, ' ').trim().slice(0, 200);
}

export async function hashRef(parts: (string | number)[]): Promise<string> {
  const data = new TextEncoder().encode(parts.join('|'));
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}
