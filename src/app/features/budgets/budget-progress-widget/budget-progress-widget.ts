import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';
import { ProgressBarModule } from 'primeng/progressbar';
import { CardModule } from 'primeng/card';
import { DashboardState } from '../../../core/state/dashboard-state.service';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { BUDGET_STATUS_COLORS, BudgetStatus } from '../../../core/models/budget.model';

@Component({
    selector: 'app-budget-progress-widget',
    standalone: true,
    imports: [CommonModule, ProgressBarModule, CardModule, CurrencyPipe, DecimalPipe, RouterLink, ButtonModule],
    templateUrl: './budget-progress-widget.html',
      changeDetection: ChangeDetectionStrategy.OnPush
})
export class BudgetProgressWidget {
    public state = inject(DashboardState);
    budgets = this.state.budgets;

    /** Same grading as /budgets: green → amber from the budget's alert level → red at 100% → deep red when overspent. */
    colorOf(b: any): string {
        const status: BudgetStatus = b.status ?? (b.percentageUsed > 100 ? 'over' : b.percentageUsed >= 100 ? 'limit' : b.percentageUsed >= (b.alertThresholdPercent ?? 80) ? 'alert' : 'safe');
        return BUDGET_STATUS_COLORS[status];
    }
}
