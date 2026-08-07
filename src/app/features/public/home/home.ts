import { Component, inject, OnInit, ChangeDetectionStrategy, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

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
  imports: [RouterLink, ButtonModule],
  templateUrl: './home.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Home implements OnInit {
  private http = inject(HttpClient);

  stats = signal<PublicStats>({
    totalUsers: 0,
    totalAccounts: 0,
    totalTransactions: 0,
    totalTransactionVolume: 0
  });

  ngOnInit() {
    this.http.get<ApiResult<PublicStats>>(
      `${environment.apiBaseUrl}/Dashboard/public-stats`
    ).subscribe({
      next: (res) => {
        if (res.isSuccess && res.value) {
          this.stats.set(res.value);
        }
      },
      error: () => {
        // Fallback to zeros — no fake data
      }
    });
  }

  formatValue(val: number): string {
    if (!val) return '0';
    if (val >= 10000000) return (val / 10000000).toFixed(2) + ' Cr';
    if (val >= 100000) return (val / 100000).toFixed(2) + ' L';
    if (val >= 1000) return (val / 1000).toFixed(2) + ' k';
    return val.toString();
  }
}
