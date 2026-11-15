import { Injectable, signal } from '@angular/core';
import { ApiResult, GenericApi } from '../../core/services/generic-api';
import { map, Observable, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UpsertCategoryRequest } from '../../core/models/api-contracts';
import { AccountType } from '../../core/models/account-type.model';

export interface AccountCategory {
  id: number;
  name: string;
  isLiability: boolean;
  accountType: AccountType;
}

export interface TransactionCategory {
  id: number;
  name: string;
  isTransferCategory: boolean;
  parentCategoryId?: number | null;
  parentCategoryName?: string | null;
  /** "Food › Groceries" for a sub-category, just the name otherwise. Filled in by `withPaths`. */
  path?: string;
  hasChildren?: boolean;
}

const SEP = ' › ';

/**
 * Adds display paths ("Food › Groceries") and orders the list parent-first, children under their parent.
 * Typing either "Groc" or "Food" in a picker then finds the right entries, because both are in the label.
 */
export function withPaths<T extends TransactionCategory>(list: T[]): T[] {
  const byId = new Map(list.map(c => [c.id, c]));
  const parentsWithKids = new Set(list.filter(c => c.parentCategoryId).map(c => c.parentCategoryId!));
  const enriched = list.map(c => {
    const parent = c.parentCategoryId ? byId.get(c.parentCategoryId) : undefined;
    const parentName = parent?.name ?? c.parentCategoryName ?? null;
    return { ...c, parentCategoryName: parentName, path: parentName ? `${parentName}${SEP}${c.name}` : c.name, hasChildren: parentsWithKids.has(c.id) };
  });
  const topName = (c: TransactionCategory) => (c.parentCategoryName ?? c.name).toLowerCase();
  return enriched.sort((a, b) =>
    topName(a).localeCompare(topName(b)) ||
    Number(!!a.parentCategoryId) - Number(!!b.parentCategoryId) ||
    a.name.localeCompare(b.name));
}

/** Split typed text such as "Food > Pizza", "Food / Pizza" or "Food › Pizza" into parent and name. */
export function splitCategoryText(text: string): { parent?: string; name: string } {
  const parts = text.split(/\s*[›>\/]\s*/).map(t => t.trim()).filter(Boolean);
  return parts.length >= 2 ? { parent: parts[0], name: parts.slice(1).join(' ') } : { name: text.trim() };
}

/** Find the category a piece of text means: full path first, then an exact name (sub-category names win over nothing). */
export function findCategoryByText<T extends TransactionCategory>(list: T[], text: string): T | undefined {
  const { parent, name } = splitCategoryText(text);
  const n = name.toLowerCase();
  if (parent) {
    const p = parent.toLowerCase();
    return list.find(c => c.name.toLowerCase() === n && (c.parentCategoryName ?? '').toLowerCase() === p);
  }
  return list.find(c => c.name.toLowerCase() === n);
}

@Injectable({
  providedIn: 'root'
})
export class Category {
  private accountCategoryEndpoint = 'AccountCategories';
  private transactionCategoryEndpoint = 'TransactionCategories';

  private _accountCategories = signal<AccountCategory[] | null>(null);
  private _transactionCategories = signal<TransactionCategory[] | null>(null);

  constructor(private apiService: GenericApi) { }

  // --- Account Category Methods ---

  getAccountCategories(force: boolean = false): Observable<AccountCategory[]> {
    if (!force && this._accountCategories() !== null) {
      return of(this._accountCategories()!);
    }
    return this.apiService.get<AccountCategory[]>(this.accountCategoryEndpoint).pipe(
      map(response => response.value || []),
      tap(list => this._accountCategories.set(list))
    );
  }

  upsertAccountCategory(categoryData: UpsertCategoryRequest): Observable<AccountCategory> {
    return this.apiService.upsert<AccountCategory>(this.accountCategoryEndpoint, categoryData).pipe(
      map(response => response.value),
      tap(saved => {
        if (saved && this._accountCategories()) {
          this._accountCategories.update(current => {
            const idx = (current || []).findIndex(c => c.id === saved.id);
            if (idx !== -1) {
              const updated = [...(current || [])];
              updated[idx] = saved;
              return updated;
            }
            return [...(current || []), saved];
          });
        }
      })
    );
  }

  deleteAccountCategory(id: number): Observable<boolean> {
    return this.apiService.delete<boolean>(this.accountCategoryEndpoint, id).pipe(
      map(response => response.value),
      tap(success => {
        if (success && this._accountCategories()) {
          this._accountCategories.update(current => (current || []).filter(c => c.id !== id));
        }
      })
    );
  }

  // --- Transaction Category Methods ---

  getTransactionCategories(force: boolean = false): Observable<TransactionCategory[]> {
    if (!force && this._transactionCategories() !== null) {
      return of(this._transactionCategories()!);
    }
    return this.apiService.get<TransactionCategory[]>(this.transactionCategoryEndpoint).pipe(
      map(response => withPaths(response.value || [])),
      tap(list => this._transactionCategories.set(list))
    );
  }

  upsertTransactionCategory(categoryData: UpsertCategoryRequest): Observable<TransactionCategory> {
    return this.apiService.upsert<TransactionCategory>(this.transactionCategoryEndpoint, categoryData).pipe(
      map(response => response.value),
      tap(saved => {
        if (saved && this._transactionCategories()) {
          this._transactionCategories.update(current => {
            const list = [...(current || [])];
            const idx = list.findIndex(c => c.id === saved.id);
            if (idx !== -1) list[idx] = saved; else list.push(saved);
            return withPaths(list);
          });
        }
      })
    );
  }

  deleteTransactionCategory(id: number): Observable<boolean> {
    return this.apiService.delete<boolean>(this.transactionCategoryEndpoint, id).pipe(
      map(response => response.value),
      tap(success => {
        if (success && this._transactionCategories()) {
          this._transactionCategories.update(current => withPaths((current || []).filter(c => c.id !== id)));
        }
      })
    );
  }
}
