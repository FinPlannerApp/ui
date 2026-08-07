import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { DashboardState } from '../../../core/state/dashboard-state.service';

@Component({
    selector: 'app-financial-health-widget',
    standalone: true,
    imports: [CommonModule, CardModule],
    templateUrl: './financial-health-widget.html',
    styleUrl: './financial-health-widget.scss'
})
export class FinancialHealthWidget {
    state = inject(DashboardState);
    health = this.state.financialHealth;

    // Gauge calculations
    score = computed(() => this.health()?.score ?? 0);

    // Rotating the needle: 0 score = -90deg, 100 score = 90deg
    needleRotation = computed(() => {
        const s = this.score();
        return (s / 100) * 180 - 90;
    });

    statusClass = computed(() => {
        const s = this.score();
        if (s >= 80) return 'status-excellent';
        if (s >= 60) return 'status-good';
        if (s >= 40) return 'status-fair';
        return 'status-poor';
    });

    showBreakdown = signal(false);
}
