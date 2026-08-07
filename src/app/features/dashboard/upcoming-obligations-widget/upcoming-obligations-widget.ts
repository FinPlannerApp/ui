import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { firstValueFrom } from 'rxjs';
import { GenericApi } from '../../../core/services/generic-api';
import { UpcomingObligation } from '../../../core/models/obligation.model';

@Component({
  selector: 'app-upcoming-obligations-widget',
  standalone: true,
  imports: [CommonModule, CardModule],
  templateUrl: './upcoming-obligations-widget.html',
  styleUrl: './upcoming-obligations-widget.scss'
})
export class UpcomingObligationsWidget implements OnInit {
  private api = inject(GenericApi);

  obligations = signal<UpcomingObligation[]>([]);
  isLoading = signal(true);

  async ngOnInit(): Promise<void> {
    try {
      const result = await firstValueFrom(this.api.get<UpcomingObligation[]>('RecurringTransactions/upcoming-obligations?daysAhead=30'));
      this.obligations.set(result.value ?? []);
    } catch (err) {
      // Non-critical dashboard widget — fail quietly, leave it empty
      // rather than disrupting the rest of the dashboard.
    } finally {
      this.isLoading.set(false);
    }
  }

  daysUntil(dateStr: string): number {
    const days = (new Date(dateStr).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24);
    return Math.max(0, Math.round(days));
  }
}
