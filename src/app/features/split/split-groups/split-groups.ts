import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { sharedPrimeModules } from '../../../shared/prime-imports';
import { SplitService } from '../split.service';
import { SplitGroup } from '../../../core/models/split.model';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-split-groups',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ...sharedPrimeModules],
  templateUrl: './split-groups.html',
  styleUrl: './split-groups.scss'
})
export class SplitGroups implements OnInit {
  private splitService = inject(SplitService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);

  groups = signal<SplitGroup[]>([]);
  isLoading = signal(true);
  showCreateForm = signal(false);

  formGroupName = signal('');
  formCreatorName = signal('');

  async ngOnInit(): Promise<void> {
    await this.load();
  }

  private async load(): Promise<void> {
    this.isLoading.set(true);
    try {
      this.groups.set(await this.splitService.getMyGroups());
    } catch {
      this.notificationService.showError('Could not load your groups.');
    } finally {
      this.isLoading.set(false);
    }
  }

  openCreateForm(): void {
    this.formGroupName.set('');
    this.showCreateForm.set(true);
  }

  async createGroup(): Promise<void> {
    const name = this.formGroupName().trim();
    const creatorName = this.formCreatorName().trim();
    if (!name || !creatorName) return;

    try {
      const group = await this.splitService.createGroup({ name, creatorName });
      this.showCreateForm.set(false);
      this.router.navigate(['/app/split', group.id]);
    } catch (err: any) {
      this.notificationService.showError(err?.message || 'Failed to create group.');
    }
  }

  shareLink(group: SplitGroup): string {
    return `${window.location.origin}/split/public/${group.shareToken}`;
  }

  async copyShareLink(group: SplitGroup, event: Event): Promise<void> {
    event.stopPropagation();
    event.preventDefault();
    await navigator.clipboard.writeText(this.shareLink(group));
    this.notificationService.showSuccess('Share link copied.');
  }
}
