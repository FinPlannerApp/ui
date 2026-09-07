import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { sharedPrimeModules } from '../../../shared/prime-imports';
import { SplitService } from '../split.service';
import { InvitePreview } from '../../../core/models/split.model';
import { Auth } from '../../../core/services/auth';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-split-invite-landing',
  standalone: true,
  imports: [CommonModule, FormsModule, ...sharedPrimeModules],
  templateUrl: './split-invite-landing.html'
})
export class SplitInviteLanding implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private splitService = inject(SplitService);
  private auth = inject(Auth);
  private notificationService = inject(NotificationService);

  token = this.route.snapshot.paramMap.get('token') ?? '';
  preview = signal<InvitePreview | null>(null);
  isLoading = signal(true);
  loadFailed = signal(false);
  isJoining = signal(false);

  displayName = signal('');

  isLoggedIn = this.auth.isLoggedIn;

  async ngOnInit(): Promise<void> {
    if (!this.token) {
      this.loadFailed.set(true);
      this.isLoading.set(false);
      return;
    }

    try {
      const previewData = await this.splitService.previewInvite(this.token);
      this.preview.set(previewData);

      const userName = this.auth.currentUserDetails()?.name || this.auth.currentUser() || '';
      if (userName && !this.displayName()) {
        this.displayName.set(userName);
      }

      const pendingToken = sessionStorage.getItem('pending_split_invite_token');
      if (pendingToken === this.token && this.isLoggedIn() && userName) {
        sessionStorage.removeItem('pending_split_invite_token');
        sessionStorage.removeItem('pending_return_url');
        await this.join();
        return;
      }
    } catch {
      this.loadFailed.set(true);
    } finally {
      this.isLoading.set(false);
    }
  }

  goToLogin(): void {
    if (this.token) {
      sessionStorage.setItem('pending_split_invite_token', this.token);
      sessionStorage.setItem('pending_return_url', `/split/join/${this.token}`);
    }
    this.router.navigate(['/login'], { queryParams: { returnUrl: `/split/join/${this.token}` } });
  }

  goToRegister(): void {
    if (this.token) {
      sessionStorage.setItem('pending_split_invite_token', this.token);
      sessionStorage.setItem('pending_return_url', `/split/join/${this.token}`);
    }
    this.router.navigate(['/register'], { queryParams: { returnUrl: `/split/join/${this.token}` } });
  }

  async join(): Promise<void> {
    const name = this.displayName().trim();
    if (!name) {
      this.notificationService.showError('Enter a name to join with.');
      return;
    }

    this.isJoining.set(true);
    try {
      const result = await this.splitService.joinViaInvite(this.token, name);
      this.notificationService.showSuccess('Joined the trip.');
      this.router.navigate(['/app/split', result.groupId]);
    } catch (err: any) {
      this.notificationService.showError(err?.message || 'Failed to join.');
    } finally {
      this.isJoining.set(false);
    }
  }
}
