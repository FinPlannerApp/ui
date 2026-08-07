import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { GenericApi } from '../../core/services/generic-api';
import { NotificationService } from '../../core/services/notification.service';
import { sharedPrimeModules } from '../../shared/prime-imports';
import { DecisionJournalEntry } from './decision-journal.model';

@Component({
  selector: 'app-decision-journal',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink, ...sharedPrimeModules],
  templateUrl: './decision-journal.html',
  styleUrl: './decision-journal.scss'
})
export class DecisionJournal implements OnInit {
  private api = inject(GenericApi);
  private notificationService = inject(NotificationService);
  private fb = inject(FormBuilder);

  entries = signal<DecisionJournalEntry[]>([]);
  isLoading = signal(true);
  showForm = signal(false);
  outcomeDrafts = new Map<number, string>();

  entryForm: FormGroup = this.fb.group({
    id: [null],
    title: ['', Validators.required],
    reasoning: ['', Validators.required],
    amount: [null],
    decisionDate: [new Date(), Validators.required]
  });

  async ngOnInit(): Promise<void> {
    await this.loadEntries();
  }

  private async loadEntries(): Promise<void> {
    this.isLoading.set(true);
    try {
      const result = await firstValueFrom(
        this.api.post<any>('DecisionJournal/search', { pageNumber: 1, pageSize: 50, sortBy: 'decisionDate', sortOrder: 'desc' })
      );
      this.entries.set(result.value.data);
    } catch (err) {
      this.notificationService.showError('Could not load journal entries.');
    } finally {
      this.isLoading.set(false);
    }
  }

  getOutcomeDraft(entry: DecisionJournalEntry): string {
    return this.outcomeDrafts.get(entry.id) ?? entry.outcome ?? '';
  }

  setOutcomeDraft(entry: DecisionJournalEntry, value: any): void {
    const val = typeof value === 'string' ? value : (value?.target?.value ?? '');
    this.outcomeDrafts.set(entry.id, val);
  }

  async saveEntry(): Promise<void> {
    if (this.entryForm.invalid) {
      this.entryForm.markAllAsTouched();
      return;
    }

    const raw = this.entryForm.getRawValue();
    try {
      await firstValueFrom(this.api.post<any>('DecisionJournal/upsert', {
        ...raw,
        decisionDate: raw.decisionDate.toISOString()
      }));
      this.notificationService.showSuccess('Entry saved.');
      this.entryForm.reset({ id: null, title: '', reasoning: '', amount: null, decisionDate: new Date() });
      this.showForm.set(false);
      await this.loadEntries();
    } catch (err: any) {
      this.notificationService.showError(err?.message || 'Failed to save entry.');
    }
  }

  async saveOutcome(entry: DecisionJournalEntry): Promise<void> {
    const outcome = this.getOutcomeDraft(entry).trim();
    if (!outcome) return;

    try {
      await firstValueFrom(this.api.post<any>('DecisionJournal/record-outcome', { id: entry.id, outcome }));
      this.notificationService.showSuccess('Reflection saved.');
      await this.loadEntries();
    } catch (err: any) {
      this.notificationService.showError(err?.message || 'Failed to save reflection.');
    }
  }

  async deleteEntry(entry: DecisionJournalEntry): Promise<void> {
    try {
      await firstValueFrom(this.api.post<any>('DecisionJournal/delete', { id: entry.id }));
      this.notificationService.showSuccess('Entry deleted.');
      await this.loadEntries();
    } catch (err: any) {
      this.notificationService.showError(err?.message || 'Failed to delete entry.');
    }
  }
}
