import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule, CurrencyPipe, DecimalPipe } from '@angular/common';
import { ProgressBarModule } from 'primeng/progressbar';
import { CardModule } from 'primeng/card';
import { DashboardState } from '../../../core/state/dashboard-state.service';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';

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
}
