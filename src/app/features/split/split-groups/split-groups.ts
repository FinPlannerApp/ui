import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { sharedPrimeModules } from '../../../shared/prime-imports';
import { SplitService } from '../split.service';
import { SplitGroup } from '../../../core/models/split.model';
import { NotificationService } from '../../../core/services/notification.service';
import { Auth } from '../../../core/services/auth';

import { EmptyState } from '../../../shared/empty-state/empty-state';

@Component({
  selector: 'app-split-groups',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ...sharedPrimeModules, EmptyState],
  templateUrl: './split-groups.html'
})
export class SplitGroups implements OnInit {
  private splitService = inject(SplitService);
  private notificationService = inject(NotificationService);
  private auth = inject(Auth);
  private router = inject(Router);

  groups = signal<SplitGroup[]>([]);
  isLoading = signal(true);
  showCreateForm = signal(false);

  formGroupName = signal('');
  formCreatorName = signal('');

  // Search & Filter
  searchQuery = signal('');
  statusFilter = signal<'all' | 'active' | 'closed'>('all');

  // Computed statistics
  totalSpendSum = computed(() => {
    return this.groups().reduce((acc, g) => acc + (g.totalSpend ?? 0), 0);
  });

  activeGroupsCount = computed(() => {
    return this.groups().filter(g => g.status === 0 || g.status === 1).length;
  });

  totalMembersCount = computed(() => {
    const memberIds = new Set<number>();
    for (const g of this.groups()) {
      for (const m of g.members) {
        memberIds.add(m.id);
      }
    }
    return memberIds.size;
  });

  filteredGroups = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const filter = this.statusFilter();

    return this.groups().filter(g => {
      // Status filter
      if (filter === 'active' && g.status !== 0 && g.status !== 1) return false;
      if (filter === 'closed' && g.status !== 2 && g.status !== 3) return false;

      // Query filter
      if (query) {
        const matchesName = g.name.toLowerCase().includes(query);
        const matchesMember = g.members.some(m => m.name.toLowerCase().includes(query));
        return matchesName || matchesMember;
      }
      return true;
    });
  });

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
    const userName = this.auth.currentUserDetails()?.name || this.auth.currentUser() || '';
    this.formCreatorName.set(userName);
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

  getGroupGradient(index: number): string {
    const gradients = [
      'from-indigo-600/20 via-purple-600/10 to-transparent',
      'from-blue-600/20 via-cyan-600/10 to-transparent',
      'from-emerald-600/20 via-teal-600/10 to-transparent',
      'from-amber-600/20 via-orange-600/10 to-transparent',
      'from-pink-600/20 via-rose-600/10 to-transparent'
    ];
    return gradients[index % gradients.length];
  }
}
