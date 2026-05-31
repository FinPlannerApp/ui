import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { sharedPrimeModules } from '../../../shared/prime-imports';
import { IssueService } from '../services/issue.service';
import { Auth } from '../../../core/services/auth';

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [CommonModule, RouterLink, ...sharedPrimeModules],
  templateUrl: './leaderboard.component.html'
})
export class LeaderboardComponent implements OnInit {
  private issueService = inject(IssueService);
  public auth = inject(Auth);
  loading = signal(true);
  leaders = signal<any[]>([]);

  ngOnInit() {
    this.issueService.getLeaderboard().subscribe(data => {
      this.leaders.set(data);
      this.loading.set(false);
    });
  }
}
