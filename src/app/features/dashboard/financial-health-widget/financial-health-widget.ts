import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardState } from '../../../core/state/dashboard-state.service';
import { sharedPrimeModules } from '../../../shared/prime-imports';

@Component({
    selector: 'app-financial-health-widget',
    standalone: true,
    imports: [CommonModule, ...sharedPrimeModules],
    templateUrl: './financial-health-widget.html',
})
export class FinancialHealthWidget {
    state = inject(DashboardState);
    health = this.state.financialHealth;

    showDrawer = signal(false);

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
}
