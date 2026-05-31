import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';

@Component({
    selector: 'app-stat-card',
    standalone: true,
    imports: [CommonModule, CardModule],
    templateUrl: './stat-card.html',
    styles: [`
    :host {
      display: block;
      height: 100%;
    }
    .text-muted-color {
      color: var(--text-muted);
    }
  `]
})
export class StatCard {
    label = input.required<string>();
    value = input.required<string | number>();
    icon = input<string>('pi pi-circle');
    iconColor = input<string>('var(--primary-color)');
    secondaryValue = input<string>();
    trend = input<string>();
    trendPositive = input<boolean>(true);

    get trendClass(): string {
        return this.trendPositive() ? 'text-green-500' : 'text-red-500';
    }
}
