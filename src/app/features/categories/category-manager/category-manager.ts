import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { DialogService } from 'primeng/dynamicdialog';
import { firstValueFrom } from 'rxjs';
import { sharedPrimeModules } from '../../../shared/prime-imports';
import { Category, TransactionCategory } from '../category';
import { CategoryForm } from '../category-form/category-form';
import { NotificationService } from '../../../core/services/notification.service';

interface Group { parent: TransactionCategory; children: TransactionCategory[]; }

/** Transaction categories as a tree: main categories with their sub-categories underneath. */
@Component({
  selector: 'app-category-manager',
  standalone: true,
  imports: [FormsModule, RouterLink, ...sharedPrimeModules],
  providers: [DialogService, ConfirmationService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-3xl mx-auto flex flex-col gap-4">
      <nav class="text-xs"><a routerLink="/app/dashboard" class="no-underline text-[var(--text-muted)]">← Back to dashboard</a></nav>
      <header class="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 class="text-2xl font-extrabold m-0">Transaction categories</h1>
          <p class="text-xs m-0 mt-1" style="color:var(--text-dim)">
            Group related spending: <b>Food</b> → Groceries, Dining out. A budget on the main category covers its sub-categories too.
          </p>
        </div>
        <p-button label="New category" icon="pi pi-plus" (onClick)="open()"></p-button>
      </header>

      <input class="p-inputtext w-full" placeholder="Search categories or sub-categories" aria-label="Search categories"
             [ngModel]="q()" (ngModelChange)="q.set($event)" />

      @if (loading()) { <p class="text-sm" style="color:var(--text-dim)">Loading…</p> }

      @for (g of groups(); track g.parent.id) {
        <section class="glass-card rounded-2xl p-4">
          <div class="flex items-center justify-between gap-2">
            <h2 class="text-base font-extrabold m-0 flex items-center gap-2">
              <i class="pi pi-folder text-amber-400"></i>{{ g.parent.name }}
              @if (g.parent.isTransferCategory) { <span class="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300">transfer</span> }
              <span class="text-[11px] font-normal" style="color:var(--text-dim)">{{ g.children.length }} sub</span>
            </h2>
            <div class="flex items-center gap-1">
              @if (!g.parent.isTransferCategory) {
                <p-button icon="pi pi-plus" label="Sub-category" size="small" [text]="true" (onClick)="open(undefined, g.parent.id)"></p-button>
              }
              <p-button icon="pi pi-pencil" size="small" [text]="true" [rounded]="true" pTooltip="Edit" (onClick)="open(g.parent)"></p-button>
              <p-button icon="pi pi-trash" size="small" [text]="true" [rounded]="true" severity="danger" pTooltip="Delete" (onClick)="remove(g.parent, g.children.length)"></p-button>
            </div>
          </div>
          @if (g.children.length) {
            <ul class="list-none m-0 mt-2 p-0 flex flex-col">
              @for (c of g.children; track c.id) {
                <li class="flex items-center justify-between gap-2 py-1.5 pl-6 border-t border-white/5">
                  <span class="text-sm"><i class="pi pi-angle-right text-[10px] mr-1.5" style="color:var(--text-dim)"></i>{{ c.name }}</span>
                  <span class="flex items-center">
                    <p-button icon="pi pi-pencil" size="small" [text]="true" [rounded]="true" pTooltip="Edit or move" (onClick)="open(c)"></p-button>
                    <p-button icon="pi pi-trash" size="small" [text]="true" [rounded]="true" severity="danger" pTooltip="Delete" (onClick)="remove(c, 0)"></p-button>
                  </span>
                </li>
              }
            </ul>
          }
        </section>
      } @empty {
        @if (!loading()) { <p class="text-sm" style="color:var(--text-dim)">No categories {{ q() ? 'match your search' : 'yet' }}.</p> }
      }
    </div>
  `
})
export class CategoryManager implements OnInit {
  private categories = inject(Category);
  private dialogs = inject(DialogService);
  private confirm = inject(ConfirmationService);
  private notify = inject(NotificationService);

  all = signal<TransactionCategory[]>([]);
  loading = signal(true);
  q = signal('');

  groups = computed<Group[]>(() => {
    const q = this.q().trim().toLowerCase();
    const list = this.all();
    const parents = list.filter(c => !c.parentCategoryId);
    return parents.map(parent => ({ parent, children: list.filter(c => c.parentCategoryId === parent.id) }))
      .filter(g => !q || g.parent.name.toLowerCase().includes(q) || g.children.some(c => c.name.toLowerCase().includes(q)))
      .map(g => (q && !g.parent.name.toLowerCase().includes(q)) ? { ...g, children: g.children.filter(c => c.name.toLowerCase().includes(q)) } : g);
  });

  async ngOnInit(): Promise<void> { await this.reload(); }

  private async reload(): Promise<void> {
    this.loading.set(true);
    try { this.all.set(await firstValueFrom(this.categories.getTransactionCategories(true))); }
    finally { this.loading.set(false); }
  }

  open(item?: TransactionCategory, parentCategoryId?: number): void {
    const ref = this.dialogs.open(CategoryForm, {
      header: item ? `Edit "${item.name}"` : (parentCategoryId ? 'New sub-category' : 'New category'),
      width: '460px', style: { maxWidth: '92vw' }, modal: true,
      data: { endpoint: 'TransactionCategories', itemToEdit: item, parentCategoryId }
    });
    ref?.onClose.subscribe(async (r: unknown) => { if (r) await this.reload(); });
  }

  remove(c: TransactionCategory, childCount: number): void {
    if (childCount > 0) { this.notify.showError('Delete or move its sub-categories first.'); return; }
    this.confirm.confirm({
      header: 'Delete category', icon: 'pi pi-exclamation-triangle', acceptButtonStyleClass: 'p-button-danger',
      message: `Delete "${c.name}"? Transactions already filed under it keep their history.`,
      accept: async () => {
        try { await firstValueFrom(this.categories.deleteTransactionCategory(c.id)); await this.reload(); }
        catch (e: any) { this.notify.showError(e?.description || e?.message || 'Could not delete.'); }
      }
    });
  }
}
