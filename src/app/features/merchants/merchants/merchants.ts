import { Component, OnInit, inject, signal } from '@angular/core';
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
  imports: [CommonModule, FormsModule, RouterLink, ...sharedPrimeModules],
  templateUrl: './merchants.html',
  styleUrl: './merchants.scss'
})
export class Merchants implements OnInit {
  private merchantService = inject(MerchantService);
  private notificationService = inject(NotificationService);
  private confirmationService = inject(ConfirmationService);

  merchants = signal<Merchant[]>([]);
  isLoading = signal(true);
  showForm = signal(false);
  editingId = signal<number | null>(null);

  formName = signal('');
  formAliases = signal<string[]>([]);
  newAliasDraft = signal('');

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  private async load(): Promise<void> {
    this.isLoading.set(true);
    try {
      this.merchants.set(await this.merchantService.getAll());
    } catch {
      this.notificationService.showError('Could not load merchants.');
    } finally {
      this.isLoading.set(false);
    }
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
      await this.merchantService.upsert({
        id: this.editingId() ?? undefined,
        name,
        aliases: this.formAliases()
      });
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
          this.notificationService.showSuccess('Merchant deleted.');
          await this.load();
        } catch (err: any) {
          this.notificationService.showError(err?.message || 'Failed to delete merchant.');
        }
      }
    });
  }
}
