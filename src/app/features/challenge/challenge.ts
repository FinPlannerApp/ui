import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AccordionModule } from 'primeng/accordion';
import { ProgressBarModule } from 'primeng/progressbar';
import { TextareaModule } from 'primeng/textarea';
import { ChallengeService } from './challenge.service';
import { ChallengeDay, ChallengeOverview } from './challenge.model';
import { NotificationService } from '../../core/services/notification.service';
import { sharedPrimeModules } from '../../shared/prime-imports';

@Component({
  selector: 'app-challenge',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AccordionModule, ProgressBarModule, TextareaModule, ...sharedPrimeModules],
  templateUrl: './challenge.html',
  styleUrl: './challenge.scss'
})
export class Challenge implements OnInit {
  private challengeService = inject(ChallengeService);
  private notificationService = inject(NotificationService);

  overview = signal<ChallengeOverview | null>(null);
  isLoading = signal(true);

  // Tracks which specific day is mid-save, so only that day's button shows
  // a loading state rather than freezing the whole page for one click.
  savingDayId = signal<number | null>(null);

  // Draft reflection text per day, keyed by day id — lets the user type
  // without saving on every keystroke; only sent when they mark the day
  // complete (or re-save an already-completed reflection day).
  reflectionDrafts = new Map<number, string>();

  weeks = computed(() => {
    const days = this.overview()?.days ?? [];
    const grouped = new Map<number, ChallengeDay[]>();
    for (const day of days) {
      const list = grouped.get(day.weekNumber) ?? [];
      list.push(day);
      grouped.set(day.weekNumber, list);
    }
    return Array.from(grouped.entries())
      .sort(([a], [b]) => a - b)
      .map(([weekNumber, days]) => ({ weekNumber, days }));
  });

  // Which week's accordion panel is open by default — whichever week
  // contains the user's suggested current day. A plain string, matching
  // p-accordion v20's confirmed API (value="0" style, not an array) —
  // verified against a source specifically covering the v17→v20 migration,
  // not assumed from older PrimeNG docs.
  defaultOpenWeek = computed(() => {
    const day = this.overview()?.currentDayNumber ?? 1;
    return Math.min(4, Math.ceil(day / 7)).toString();
  });

  progressPercent = computed(() => {
    const o = this.overview();
    if (!o || o.totalActionableDays === 0) return 0;
    return Math.round((o.completedDaysCount / o.totalActionableDays) * 100);
  });

  async ngOnInit(): Promise<void> {
    await this.loadChallenge();
  }

  private async loadChallenge(): Promise<void> {
    this.isLoading.set(true);
    try {
      const data = await this.challengeService.getMyChallenge();
      this.overview.set(data);
      // Seed drafts with whatever's already saved, so re-opening a day
      // shows existing reflection text rather than a blank box.
      for (const day of data.days) {
        if (day.reflectionText) {
          this.reflectionDrafts.set(day.id, day.reflectionText);
        }
      }
    } catch (err) {
      this.notificationService.showError('Could not load your challenge progress.');
    } finally {
      this.isLoading.set(false);
    }
  }

  getDraft(day: ChallengeDay): string {
    return this.reflectionDrafts.get(day.id) ?? '';
  }

  setDraft(day: ChallengeDay, value: string): void {
    this.reflectionDrafts.set(day.id, value);
  }

  async toggleDay(day: ChallengeDay): Promise<void> {
    if (day.isRestDay || this.savingDayId()) return;

    this.savingDayId.set(day.id);
    try {
      if (day.isCompleted) {
        await this.challengeService.unmarkDay({ challengeDayId: day.id });
      } else {
        const reflectionText = day.requiresReflection ? this.getDraft(day) : undefined;
        if (day.requiresReflection && !reflectionText?.trim()) {
          this.notificationService.showError('Write a few words before marking this day complete.');
          return;
        }
        await this.challengeService.markDayComplete({ challengeDayId: day.id, reflectionText });
      }
      await this.loadChallenge(); // reload — streak/completion counts may have changed
    } catch (err) {
      this.notificationService.showError('Something went wrong saving that.');
    } finally {
      this.savingDayId.set(null);
    }
  }

  async saveReflectionOnly(day: ChallengeDay): Promise<void> {
    // For editing the reflection text on a day that's ALREADY completed —
    // re-sends markDayComplete, which the backend treats as an update to
    // the reflection text without touching the completion timestamp again.
    if (!day.isCompleted || this.savingDayId()) return;

    this.savingDayId.set(day.id);
    try {
      await this.challengeService.markDayComplete({
        challengeDayId: day.id,
        reflectionText: this.getDraft(day)
      });
      this.notificationService.showSuccess('Reflection updated.');
    } catch (err) {
      this.notificationService.showError('Could not save your reflection.');
    } finally {
      this.savingDayId.set(null);
    }
  }
}
