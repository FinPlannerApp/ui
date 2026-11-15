import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RevealDirective } from '../../../shared/directives/reveal.directive';

@Component({
  selector: 'app-pricing',
  imports: [RouterLink, RevealDirective],
  templateUrl: './pricing.html',
})
export class Pricing {
  readonly included = [
    'Unlimited accounts, cards, loans and wallets',
    'Real Available Cash, health score and insights',
    'Bulk entry, recurring bills and subscriptions',
    'Budgets, goals and savings buckets',
    'Split with friends, UPI settle-up',
    'Reports and CSV export',
    'Installable app on every device',
    'Light and dark themes',
  ];
}
