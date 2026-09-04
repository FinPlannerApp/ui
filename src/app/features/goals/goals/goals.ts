import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { sharedPrimeModules } from '../../../shared/prime-imports';
import { GoalService } from '../goal.service';
import { Goal, BucketOption } from '../../../core/models/goal.model';
import { NotificationService } from '../../../core/services/notification.service';
import { toDateOnlyString, fromDateOnlyString } from '../../../core/utils/date-utils';

@Component({
  selector: 'app-goals',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ...sharedPrimeModules],
  templateUrl: './goals.html',
})
export class Goals implements OnInit {
  private goalService = inject(GoalService);
  private notificationService = inject(NotificationService);
  private confirmationService = inject(ConfirmationService);

  goals = signal<Goal[]>([]);
  buckets = signal<BucketOption[]>([]);
  isLoading = signal(true);
  showForm = signal(false);
  editingId = signal<number | null>(null);

  // Form state
  formName = signal('');
  formTargetAmount = signal<number | null>(null);
  formTargetDate = signal<Date | null>(null);
  formTrackingMode = signal<'bucket' | 'manual'>('manual');
  formBucketId = signal<number | null>(null);
  formManualAmount = signal<number>(0);

  bucketOptions = computed(() =>
    this.buckets().map(b => ({ label: `${b.accountName} — ${b.name} (${b.allocatedAmount})`, value: b.id }))
  );

  async ngOnInit(): Promise<void> {
    await this.loadGoals();
    try {
      this.buckets.set(await this.goalService.getAllBuckets());
    } catch {
      // Non-critical buckets load
    }
    this.isLoading.set(false);
  }

  private async loadGoals(): Promise<void> {
    try {
      this.goals.set(await this.goalService.getAll());
    } catch {
      this.notificationService.showError('Could not load goals.');
    }
  }

  openCreateForm(): void {
    this.editingId.set(null);
    this.formName.set('');
    this.formTargetAmount.set(null);
    this.formTargetDate.set(null);
    this.formTrackingMode.set('manual');
    this.formBucketId.set(null);
    this.formManualAmount.set(0);
    this.showForm.set(true);
  }

  openEditForm(goal: Goal): void {
    this.editingId.set(goal.id);
    this.formName.set(goal.name);
    this.formTargetAmount.set(goal.targetAmount);
    this.formTargetDate.set(fromDateOnlyString(goal.targetDate));
    this.formTrackingMode.set(goal.savingsBucketId ? 'bucket' : 'manual');
    this.formBucketId.set(goal.savingsBucketId);
    this.formManualAmount.set(goal.savingsBucketId ? 0 : goal.currentAmount);
    this.showForm.set(true);
  }

  async save(): Promise<void> {
    const name = this.formName().trim();
    const target = this.formTargetAmount();
    if (!name || target === null || target <= 0) return;

    const isBucketMode = this.formTrackingMode() === 'bucket';
    if (isBucketMode && this.formBucketId() === null) {
      this.notificationService.showError('Pick a bucket, or switch to manual tracking.');
      return;
    }

    try {
      const savedGoal = await this.goalService.upsert({
        id: this.editingId() ?? undefined,
        name,
        targetAmount: target,
        targetDate: toDateOnlyString(this.formTargetDate()),
        savingsBucketId: isBucketMode ? this.formBucketId() : null,
        manualCurrentAmount: isBucketMode ? 0 : this.formManualAmount()
      });

      if (savedGoal) {
        this.goals.update(current => {
          const idx = current.findIndex(g => g.id === savedGoal.id);
          if (idx !== -1) {
            const copy = [...current];
            copy[idx] = savedGoal;
            return copy;
          }
          return [savedGoal, ...current];
        });
      }

      this.notificationService.showSuccess('Goal saved.');
      this.showForm.set(false);
      await this.loadGoals();
    } catch (err: any) {
      this.notificationService.showError(err?.message || 'Failed to save goal.');
    }
  }

  confirmDelete(goal: Goal): void {
    this.confirmationService.confirm({
      header: 'Delete Goal',
      message: `Delete "${goal.name}"? This only removes the goal — if it's linked to a savings bucket, the bucket and its allocated money are unaffected.`,
      icon: 'pi pi-exclamation-triangle',
      accept: async () => {
        try {
          await this.goalService.delete(goal.id);
          this.goals.update(current => current.filter(g => g.id !== goal.id));
          this.notificationService.showSuccess('Goal deleted.');
          await this.loadGoals();
        } catch (err: any) {
          this.notificationService.showError(err?.message || 'Failed to delete goal.');
        }
      }
    });
  }
}
