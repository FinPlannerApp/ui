import { Component, inject, OnInit, ChangeDetectionStrategy, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Auth } from '../../../core/services/auth';
import { environment } from '../../../../environments/environment';
import { CountUpDirective, RevealDirective, SpotlightDirective } from '../../../shared/directives/reveal.directive';

export interface PublicStats {
  totalUsers: number;
  totalAccounts: number;
  totalTransactions: number;
  totalTransactionVolume: number;
}

interface ApiResult<T> {
  isSuccess: boolean;
  value: T;
}

@Component({
  selector: 'app-home',
  imports: [RouterLink, RevealDirective, CountUpDirective, SpotlightDirective],
  templateUrl: './home.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Home implements OnInit {
  private http = inject(HttpClient);
  private auth = inject(Auth);
  isLoggedIn = this.auth.isLoggedIn;

  stats = signal<PublicStats>({ totalUsers: 0, totalAccounts: 0, totalTransactions: 0, totalTransactionVolume: 0 });

  /** Looped twice so the marquee can translate -50% seamlessly. */
  readonly marquee = [
    ['pi-building-columns', 'Bank accounts'], ['pi-credit-card', 'Credit cards'], ['pi-percentage', 'Loans & EMIs'],
    ['pi-wallet', 'UPI & wallets'], ['pi-money-bill', 'Cash'], ['pi-users', 'Split with friends'],
    ['pi-sync', 'Recurring bills'], ['pi-flag', 'Goals'], ['pi-chart-line', 'Reports'], ['pi-bolt', 'Bulk entry'],
  ].flatMap(x => [x, x]);

  readonly bars = [38, 52, 44, 66, 58, 74, 62, 88];

  readonly faqs = [
    { q: 'Is Financial Planner free?', a: 'Yes. Everything in the app is free to use right now. If paid plans ever appear, they will be announced in the app and on this site before anything changes.' },
    { q: 'Does it connect to my bank automatically?', a: 'Not today. You add transactions yourself — one at a time, or up to 500 at once with bulk add, which checks your balances before saving. Statement import (CSV / Excel / PDF, parsed on your device) is on the roadmap.' },
    { q: 'What is “Real Available Cash”?', a: 'The money you can actually spend: liquid cash minus credit-card dues (including unpaid statements) minus the bills, EMIs and subscriptions due soon. Emergency-fund and held-for-others money is kept out of it.' },
    { q: 'Can I split expenses with people who are not on the app?', a: 'Yes. Add them by name, share an invite link, or send a read-only link. Members can later claim their name by signing in.' },
    { q: 'Can I use it on my phone?', a: 'Yes — it is an installable web app (PWA) that works on phone, tablet and desktop. Use “Add to Home Screen” in your browser.' },
    { q: 'Who can see my data?', a: 'Only you, through your sign-in. Each device you use gets its own session, signing in from a new device needs an email code, and you can sign out any time.' },
  ];

  ngOnInit() {
    this.http.get<ApiResult<PublicStats>>(`${environment.apiBaseUrl}/Dashboard/public-stats`).subscribe({
      next: (res) => { if (res.isSuccess && res.value) this.stats.set(res.value); },
      error: () => { /* no stats section when unavailable — never fake numbers */ }
    });
  }

  compact(val: number): { n: number; suffix: string } {
    if (val >= 10000000) return { n: +(val / 10000000).toFixed(2), suffix: ' Cr' };
    if (val >= 100000) return { n: +(val / 100000).toFixed(2), suffix: ' L' };
    if (val >= 1000) return { n: +(val / 1000).toFixed(1), suffix: 'k' };
    return { n: val, suffix: '' };
  }
}
