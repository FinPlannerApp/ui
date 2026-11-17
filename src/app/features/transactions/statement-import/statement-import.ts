import { withPaths } from '../../categories/category';
import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { TransactionService } from '../transaction';
import { GenericApi } from '../../../core/services/generic-api';
import { sharedPrimeModules } from '../../../shared/prime-imports';
import {
  ColumnMapping, ColumnRole, ParsedRow, PasswordNeeded, detectMapping, hashRef, normalise, readStatementFile, redact
} from './statement-parser';

type Step = 'pick' | 'map' | 'review' | 'done';
type Action = 'Add' | 'Merge' | 'Skip';

interface ReviewRow {
  index: number;
  date: string;          // yyyy-MM-dd
  description: string;   // redacted
  amount: number;
  type: 'Income' | 'Expense';
  ref?: string;          // hashed
  status: 'New' | 'Duplicate' | 'Possible' | 'Imported';
  matchedId?: number;
  matchedText?: string;
  action: Action;
  categoryId: number | null;
}

const ROLE_OPTIONS: { label: string; value: ColumnRole }[] = [
  { label: 'Ignore', value: 'ignore' }, { label: 'Date', value: 'date' }, { label: 'Description', value: 'description' },
  { label: 'Debit / Withdrawal', value: 'debit' }, { label: 'Credit / Deposit', value: 'credit' },
  { label: 'Amount (one column)', value: 'amount' }, { label: 'Dr / Cr flag', value: 'drcr' },
  { label: 'Balance', value: 'balance' }, { label: 'Reference no.', value: 'ref' },
];

@Component({
  selector: 'app-statement-import',
  imports: [CommonModule, FormsModule, RouterLink, ...sharedPrimeModules],
  templateUrl: './statement-import.html',
})
export class StatementImport {
  private tx = inject(TransactionService);
  private api = inject(GenericApi);
  private toast = inject(MessageService);

  readonly roleOptions = ROLE_OPTIONS;
  readonly actionOptions = [{ label: 'Add', value: 'Add' }, { label: 'Merge', value: 'Merge' }, { label: 'Skip', value: 'Skip' }];

  step = signal<Step>('pick');
  busy = signal(false);
  error = signal<string | null>(null);

  accounts = signal<any[]>([]);
  categories = signal<any[]>([]);
  accountId = signal<number | null>(null);
  holderName = '';
  fileName = signal('');
  needPassword = signal(false);
  pdfPassword = '';
  private pendingFile: File | null = null;

  table = signal<string[][]>([]);
  mapping = signal<ColumnMapping>({ roles: [], headerRow: -1, dayFirst: true, positiveIsOut: false });
  parsed = signal<{ rows: ParsedRow[]; skipped: number; chain: { checked: number; broken: number } | null } | null>(null);

  review = signal<ReviewRow[]>([]);
  result = signal<{ added: number; merged: number; skipped: number } | null>(null);
  bulkCategory = signal<number | null>(null);
  private batchId = crypto.randomUUID();

  previewTable = computed(() => this.table().slice(0, 12));
  width = computed(() => this.table()[0]?.length ?? 0);
  counts = computed(() => {
    const r = this.review();
    return {
      add: r.filter(x => x.action === 'Add').length,
      merge: r.filter(x => x.action === 'Merge').length,
      skip: r.filter(x => x.action === 'Skip').length,
      isNew: r.filter(x => x.status === 'New').length,
      dup: r.filter(x => x.status === 'Duplicate' || x.status === 'Imported').length,
      possible: r.filter(x => x.status === 'Possible').length,
    };
  });
  canRead = computed(() => {
    const m = this.mapping();
    return m.roles.includes('date') && (m.roles.includes('debit') || m.roles.includes('credit') || m.roles.includes('amount'));
  });

  constructor() {
    this.api.search<any>('Accounts', { pageSize: 100 }).subscribe({
      next: res => this.accounts.set((res.value?.data || []).filter((a: any) => !a.isArchived)),
      error: () => this.error.set('Could not load your accounts.'),
    });
    this.api.search<any>('TransactionCategories', { pageSize: 100 }).subscribe({
      next: res => this.categories.set(withPaths<any>(res.value?.data || [])),
    });
  }

  // ── step 1 ──
  async onFile(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (!this.accountId()) { this.error.set('Choose the account this statement belongs to first.'); return; }
    this.pendingFile = file; this.pdfPassword = ''; this.needPassword.set(false);
    await this.load(file);
  }

  /** Retry the same PDF with the password the user typed. The password is only used in this browser tab to open the file. */
  async unlock() {
    if (this.pendingFile) await this.load(this.pendingFile, this.pdfPassword);
  }

  private async load(file: File, password?: string) {
    this.error.set(null); this.busy.set(true); this.fileName.set(file.name);
    try {
      const table = await readStatementFile(file, password);
      if (table.length < 2) throw new Error('The file looks empty.');
      this.needPassword.set(false); this.pendingFile = null; this.pdfPassword = '';
      this.table.set(table);
      const saved = this.loadProfile();
      const detected = detectMapping(table);
      const usable = saved && saved.roles.length === (table[0]?.length ?? 0) && saved.headerRow >= 0;
      this.mapping.set(usable ? { ...saved!, headerRow: detected.headerRow >= 0 ? detected.headerRow : saved!.headerRow } : detected);
      this.step.set('map');
    } catch (e: any) {
      if (e instanceof PasswordNeeded) {
        this.needPassword.set(true);
        this.error.set(e.wrong ? 'That password is not correct. Try again.' : null);
      } else this.error.set(e?.message ?? 'Could not read that file.');
    } finally { this.busy.set(false); }
  }

  // ── step 2 ──
  setRole(i: number, role: ColumnRole) {
    this.mapping.update(m => {
      const roles = [...m.roles];
      if (role !== 'ignore') roles.forEach((r, k) => { if (r === role) roles[k] = 'ignore'; });
      roles[i] = role;
      return { ...m, roles };
    });
  }
  setHeaderRow(v: number) { this.mapping.update(m => ({ ...m, headerRow: v })); }
  setDayFirst(v: boolean) { this.mapping.update(m => ({ ...m, dayFirst: v })); }
  setPositiveOut(v: boolean) { this.mapping.update(m => ({ ...m, positiveIsOut: v })); }

  async readRows() {
    this.error.set(null);
    const res = normalise(this.table(), this.mapping());
    if (res.rows.length === 0) { this.error.set('No transactions could be read with these settings. Check the column roles and the date order.'); return; }
    if (res.rows.length > 500) { this.error.set(`The file has ${res.rows.length} rows. Import one month (up to 500 rows) at a time.`); return; }
    this.parsed.set(res);
    this.busy.set(true);
    try {
      const accId = this.accountId()!;
      const rows: any[] = [];
      for (const r of res.rows) {
        const date = r.date.toISOString().slice(0, 10);
        const ref = r.rawRef ? await hashRef([accId, r.rawRef, date, r.type, r.amount]) : undefined;
        rows.push({ date, description: redact(r.description, this.holderName), amount: r.amount, type: r.type === 'Income' ? 0 : 1, ref });
      }
      const preview = await this.tx.importPreview({ accountId: accId, rows }).toPromise();
      this.saveProfile();
      this.review.set(rows.map((r, i) => {
        const m = preview.matches[i];
        const status = m.status as ReviewRow['status'];
        return {
          index: i, date: r.date, description: r.description, amount: r.amount,
          type: r.type === 0 ? 'Income' : 'Expense', ref: r.ref, status,
          matchedId: m.matchedTransactionId ?? undefined,
          matchedText: m.matchedDescription ? `${m.matchedDescription}${m.matchedDate ? ' · ' + String(m.matchedDate).slice(0, 10) : ''}` : undefined,
          action: status === 'New' ? 'Add' : status === 'Possible' ? 'Merge' : 'Skip',
          categoryId: null,
        } as ReviewRow;
      }));
      this.step.set('review');
    } catch (e: any) {
      this.error.set(e?.error?.description ?? e?.message ?? 'Could not compare with your existing entries.');
    } finally { this.busy.set(false); }
  }

  // ── step 3 ──
  setAction(row: ReviewRow, a: Action) {
    if (a === 'Merge' && !row.matchedId) return;
    this.review.update(list => list.map(r => (r.index === row.index ? { ...r, action: a } : r)));
  }
  setCategory(row: ReviewRow, id: number | null) {
    this.review.update(list => list.map(r => (r.index === row.index ? { ...r, categoryId: id } : r)));
  }
  applyBulkCategory() {
    const id = this.bulkCategory();
    this.review.update(list => list.map(r => (r.action === 'Add' ? { ...r, categoryId: id } : r)));
  }
  addAllNew() { this.review.update(l => l.map(r => (r.status === 'New' ? { ...r, action: 'Add' } : r))); }
  skipAllDup() { this.review.update(l => l.map(r => (r.status === 'Duplicate' || r.status === 'Imported' ? { ...r, action: 'Skip' } : r))); }
  mergeAllPossible() { this.review.update(l => l.map(r => (r.status === 'Possible' && r.matchedId ? { ...r, action: 'Merge' } : r))); }

  async commit() {
    const rows = this.review();
    if (!rows.some(r => r.action !== 'Skip')) { this.error.set('Every row is set to Skip — nothing to import.'); return; }
    this.error.set(null); this.busy.set(true);
    try {
      const body = {
        accountId: this.accountId(), batchId: this.batchId,
        rows: rows.map(r => ({
          date: r.date, description: r.description, amount: r.amount, type: r.type === 'Income' ? 0 : 1, ref: r.ref,
          action: r.action, mergeTransactionId: r.action === 'Merge' ? r.matchedId : null, categoryId: r.categoryId,
        })),
      };
      const res = await this.tx.importCommit(body).toPromise();
      this.result.set({ added: res.added, merged: res.merged, skipped: res.skipped });
      this.step.set('done');
      this.toast.add({ severity: 'success', summary: 'Statement imported', detail: `${res.added} added, ${res.merged} matched.` });
    } catch (e: any) {
      const failures = e?.value?.failures ?? [];
      const first = failures[0]?.errors?.[0];
      this.error.set((e?.error?.description ?? e?.message ?? 'Import failed. Nothing was saved.') + (first ? ` First problem: ${first}` : ''));
    } finally { this.busy.set(false); }
  }

  reset() {
    this.step.set('pick'); this.table.set([]); this.review.set([]); this.parsed.set(null);
    this.result.set(null); this.error.set(null); this.batchId = crypto.randomUUID();
  }

  // ── per-account remembered mapping (stays on this device) ──
  private key() { return `fp.stmt.profile.${this.accountId()}`; }
  private loadProfile(): ColumnMapping | null {
    try { const s = localStorage.getItem(this.key()); return s ? JSON.parse(s) : null; } catch { return null; }
  }
  private saveProfile() { try { localStorage.setItem(this.key(), JSON.stringify(this.mapping())); } catch { /* ignore */ } }
}
