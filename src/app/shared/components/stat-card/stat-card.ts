import { Component, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

export type StatVariant = 'primary' | 'success' | 'danger' | 'warning' | 'info' | 'purple' | 'amber';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './stat-card.html',
  styles: [`
    :host {
      display: block;
      height: 100%;
    }
  `]
})
export class StatCard {
  label = input.required<string>();
  value = input.required<string | number>();
  icon = input<string>('pi pi-circle');
  subtitle = input<string>();
  trend = input<string>();
  trendPositive = input<boolean>(true);
  variant = input<StatVariant>('primary');

  badgeStyles = computed(() => {
    switch (this.variant()) {
      case 'success':
        return {
          cardBorder: 'border-emerald-500/20',
          iconBg: 'bg-emerald-500/10',
          iconText: 'text-emerald-400',
          valueText: 'text-emerald-400'
        };
      case 'danger':
        return {
          cardBorder: 'border-rose-500/20',
          iconBg: 'bg-rose-500/10',
          iconText: 'text-rose-400',
          valueText: 'text-rose-400'
        };
      case 'warning':
      case 'amber':
        return {
          cardBorder: 'border-amber-500/20',
          iconBg: 'bg-amber-500/10',
          iconText: 'text-amber-400',
          valueText: 'text-amber-400'
        };
      case 'info':
        return {
          cardBorder: 'border-blue-500/20',
          iconBg: 'bg-blue-500/10',
          iconText: 'text-blue-400',
          valueText: 'text-blue-400'
        };
      case 'purple':
        return {
          cardBorder: 'border-purple-500/20',
          iconBg: 'bg-purple-500/10',
          iconText: 'text-purple-400',
          valueText: 'text-purple-400'
        };
      default:
        return {
          cardBorder: 'border-[var(--glass-border)]',
          iconBg: 'bg-primary/10',
          iconText: 'text-primary',
          valueText: 'text-[var(--text-main)]'
        };
    }
  });

  trendClass = computed(() => this.trendPositive() ? 'text-emerald-400' : 'text-rose-400');
}
