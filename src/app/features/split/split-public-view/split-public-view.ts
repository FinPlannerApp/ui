import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { sharedPrimeModules } from '../../../shared/prime-imports';
import { SplitService } from '../split.service';
import { PublicGroupView } from '../../../core/models/split.model';
import { OnlineStatusService } from '../../../core/services/online-status.service';

@Component({
  selector: 'app-split-public-view',
  standalone: true,
  imports: [CommonModule, ...sharedPrimeModules],
  templateUrl: './split-public-view.html',
  styleUrl: './split-public-view.scss'
})
export class SplitPublicView implements OnInit {
  private route = inject(ActivatedRoute);
  private splitService = inject(SplitService);
  public onlineStatus = inject(OnlineStatusService);

  view = signal<PublicGroupView | null>(null);
  isLoading = signal(true);
  loadFailed = signal(false);

  async ngOnInit(): Promise<void> {
    const token = this.route.snapshot.paramMap.get('token');
    if (!token) {
      this.loadFailed.set(true);
      this.isLoading.set(false);
      return;
    }

    try {
      this.view.set(await this.splitService.getPublicView(token));
    } catch {
      this.loadFailed.set(true);
    } finally {
      this.isLoading.set(false);
    }
  }
}
