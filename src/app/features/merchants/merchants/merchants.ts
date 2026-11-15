import { PageHeader } from '../../../shared/components/page-header/page-header';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { sharedPrimeModules } from '../../../shared/prime-imports';
import { MerchantService } from '../merchant.service';
import { Merchant } from '../../../core/models/merchant.model';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-merchants',
  standalone: true,
  imports: [PageHeader, CommonModule, FormsModule, ...sharedPrimeModules],
  templateUrl: './merchants.html',
})
export class Merchants implements OnInit {
  private merchantService = inject(MerchantService);
  private notificationService = inject(NotificationService);
  private confirmationService = inject(ConfirmationService);

  private static readonly PAGE_SIZE = 30;
  merchants = signal<Merchant[]>([]);
  total = signal(0);
  page = signal(1);
  search = signal('');
  loadingMore = signal(false);
  hasMore = computed(() => this.merchants().length < this.total());
  private searchTimer: ReturnType<typeof setTimeout> | null = null;
  isLoading = signal(true);
  showForm = signal(false);
  editingId = signal<number | null>(null);

  formName = signal('');
  formAliases = signal<string[]>([]);
  newAliasDraft = signal('');

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  /** Loads the first page again (after a search, a save or a delete). */
  private async load(): Promise<void> {
    this.isLoading.set(true);
    try {
      const result = await this.merchantService.getPage(1, Merchants.PAGE_SIZE, this.search());
      this.merchants.set(result.data);
      this.total.set(result.totalRecords);
      this.page.set(1);
    } catch {
      this.notificationService.showError('Could not load merchants.');
    } finally {
      this.isLoading.set(false);
    }
  }

  /** Appends the next page; the list never holds more than what has been asked for. */
  async loadMore(): Promise<void> {
    if (this.loadingMore() || !this.hasMore()) return;
    this.loadingMore.set(true);
    try {
      const next = this.page() + 1;
      const result = await this.merchantService.getPage(next, Merchants.PAGE_SIZE, this.search());
      this.merchants.update(current => [...current, ...result.data.filter(m => !current.some(c => c.id === m.id))]);
      this.total.set(result.totalRecords);
      this.page.set(next);
    } catch {
      this.notificationService.showError('Could not load more merchants.');
    } finally {
      this.loadingMore.set(false);
    }
  }

  onSearch(text: string): void {
    this.search.set(text);
    if (this.searchTimer) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => void this.load(), 300);
  }

  openCreateForm(): void {
    this.editingId.set(null);
    this.formName.set('');
    this.formAliases.set([]);
    this.newAliasDraft.set('');
    this.showForm.set(true);
  }

  openEditForm(merchant: Merchant): void {
    this.editingId.set(merchant.id);
    this.formName.set(merchant.name);
    this.formAliases.set([...merchant.aliases]);
    this.newAliasDraft.set('');
    this.showForm.set(true);
  }

  addAlias(): void {
    const alias = this.newAliasDraft().trim();
    if (!alias || this.formAliases().includes(alias)) return;
    this.formAliases.update(list => [...list, alias]);
    this.newAliasDraft.set('');
  }

  removeAlias(alias: string): void {
    this.formAliases.update(list => list.filter(a => a !== alias));
  }

  async save(): Promise<void> {
    const name = this.formName().trim();
    if (!name) return;

    try {
      const savedMerchant = await this.merchantService.upsert({
        id: this.editingId() ?? undefined,
        name,
        aliases: this.formAliases()
      });

      if (savedMerchant) {
        this.merchants.update(current => {
          const idx = current.findIndex(m => m.id === savedMerchant.id);
          if (idx !== -1) {
            const copy = [...current];
            copy[idx] = savedMerchant;
            return copy;
          }
          return [savedMerchant, ...current];
        });
      }

      this.notificationService.showSuccess('Merchant saved.');
      this.showForm.set(false);
      await this.load();
    } catch (err: any) {
      this.notificationService.showError(err?.message || 'Failed to save merchant.');
    }
  }

  confirmDelete(merchant: Merchant): void {
    this.confirmationService.confirm({
      header: 'Delete Merchant',
      message: `Delete "${merchant.name}"? Transactions already tagged with it keep their history, but the merchant itself won't be selectable anymore.`,
      icon: 'pi pi-exclamation-triangle',
      accept: async () => {
        try {
          await this.merchantService.delete(merchant.id);
          this.merchants.update(current => current.filter(m => m.id !== merchant.id));
          this.notificationService.showSuccess('Merchant deleted.');
          await this.load();
        } catch (err: any) {
          this.notificationService.showError(err?.message || 'Failed to delete merchant.');
        }
      }
    });
  }
}
