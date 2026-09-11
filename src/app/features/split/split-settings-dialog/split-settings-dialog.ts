import { Component, computed, inject, input, model, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConfirmationService } from 'primeng/api';
import { sharedPrimeModules } from '../../../shared/prime-imports';
import { SplitService } from '../split.service';
import { GroupBalances, SplitGroup, SplitMember } from '../../../core/models/split.model';
import { NotificationService } from '../../../core/services/notification.service';
import { Auth } from '../../../core/services/auth';

@Component({
  selector: 'app-split-settings-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, ...sharedPrimeModules],
  providers: [ConfirmationService],
  templateUrl: './split-settings-dialog.html'
})
export class SplitSettingsDialog {
  private splitService = inject(SplitService);
  private notificationService = inject(NotificationService);
  private confirmationService = inject(ConfirmationService);
  private authService = inject(Auth);

  // Model & Inputs
  visible = model<boolean>(false);
  group = input<SplitGroup | null>(null);
  balances = input<GroupBalances | null>(null);
  initialTab = input<'members' | 'config' | 'share' | 'danger'>('members');

  // Outputs to parent component
  reloadGroup = output<void>();
  openImport = output<void>();

  settingsTab = signal<'members' | 'config' | 'share' | 'danger'>('members');

  // State signals
  showAddMember = signal(false);
  newMemberName = signal('');
  newMemberUpi = signal('');

  editingMemberId = signal<number | null>(null);
  editMemberUpi = signal('');

  renamingMemberId = signal<number | null>(null);
  renameMemberName = signal('');

  editingTripName = signal(false);
  tripNameInput = signal('');

  generatedInviteLink = signal<string | null>(null);

  // Computed properties
  isGroupAdmin = computed(() => {
    const g = this.group();
    if (!g) return false;
    const currentUserId = this.authService.currentUserDetails()?.id;
    return g.createdByUserId === currentUserId;
  });

  currentUserMember = computed(() => {
    const g = this.group();
    if (!g) return null;
    const currentUserId = this.authService.currentUserDetails()?.id;
    return g.members.find(m => m.linkedUserId && m.linkedUserId === currentUserId) ?? null;
  });

  isGroupLocked = computed(() => this.group()?.status === 1);
  isGroupClosed = computed(() => {
    const s = this.group()?.status;
    return s === 2 || s === 3;
  });

  visibleDebts = computed(() => {
    const plan = this.balances()?.simplifiedPlan ?? [];
    if (this.isGroupAdmin()) return plan;
    const myMemberId = this.currentUserMember()?.id;
    if (!myMemberId) return [];
    return plan.filter(d => d.fromMemberId === myMemberId || d.toMemberId === myMemberId);
  });

  canEditUpi(member: SplitMember): boolean {
    const g = this.group();
    if (!g) return false;
    const currentUserId = this.authService.currentUserDetails()?.id;
    const isMember = g.members.some(m => m.linkedUserId && m.linkedUserId === currentUserId);
    if (!isMember) return false;

    if (this.isGroupAdmin()) return true;

    if (member.linkedUserId) {
      return member.linkedUserId === currentUserId;
    }
    return true;
  }

  canRenameMember(member: SplitMember): boolean {
    const g = this.group();
    if (!g) return false;
    const currentUserId = this.authService.currentUserDetails()?.id;
    if (this.isGroupAdmin()) return true;
    if (member.linkedUserId) {
      return member.linkedUserId === currentUserId;
    }
    return true;
  }

  startEditUpi(member: SplitMember): void {
    this.editingMemberId.set(member.id);
    this.editMemberUpi.set(member.upiId ?? '');
  }

  cancelEditUpi(): void {
    this.editingMemberId.set(null);
  }

  async saveEditUpi(memberId: number): Promise<void> {
    const upiId = this.editMemberUpi().trim();
    try {
      await this.splitService.updateMemberUpi(memberId, upiId);
      this.editingMemberId.set(null);
      this.notificationService.showSuccess('UPI ID updated successfully.');
      this.reloadGroup.emit();
    } catch (err: any) {
      this.notificationService.showError(err?.message || 'Failed to update UPI.');
    }
  }

  openRenameMember(member: SplitMember): void {
    this.renamingMemberId.set(member.id);
    this.renameMemberName.set(member.name);
  }

  cancelRenameMember(): void {
    this.renamingMemberId.set(null);
    this.renameMemberName.set('');
  }

  async saveMemberRename(memberId: number): Promise<void> {
    const name = this.renameMemberName().trim();
    if (!name) {
      this.notificationService.showError('Name cannot be empty.');
      return;
    }
    try {
      await this.splitService.renameMember(memberId, name);
      this.renamingMemberId.set(null);
      this.notificationService.showSuccess('Member renamed successfully.');
      this.reloadGroup.emit();
    } catch (err: any) {
      this.notificationService.showError(err?.message || 'Failed to rename member.');
    }
  }

  async addMember(): Promise<void> {
    const g = this.group();
    if (!g) return;
    const name = this.newMemberName().trim();
    if (!name) return;
    try {
      await this.splitService.addMember(g.id, name, this.newMemberUpi().trim() || null);
      this.newMemberName.set('');
      this.newMemberUpi.set('');
      this.showAddMember.set(false);
      this.notificationService.showSuccess('Member added successfully.');
      this.reloadGroup.emit();
    } catch (err: any) {
      this.notificationService.showError(err?.message || 'Failed to add member.');
    }
  }

  openEditTripName(): void {
    this.tripNameInput.set(this.group()?.name ?? '');
    this.editingTripName.set(true);
  }

  cancelEditTripName(): void {
    this.editingTripName.set(false);
  }

  async saveTripName(): Promise<void> {
    const g = this.group();
    if (!g) return;
    const name = this.tripNameInput().trim();
    if (!name) {
      this.notificationService.showError('Trip name cannot be empty.');
      return;
    }
    try {
      await this.splitService.updateGroup(g.id, name);
      this.editingTripName.set(false);
      this.notificationService.showSuccess('Trip name updated successfully.');
      this.reloadGroup.emit();
    } catch (err: any) {
      this.notificationService.showError(err?.message || 'Failed to update trip name.');
    }
  }

  async toggleLockGroup(): Promise<void> {
    const g = this.group();
    if (!g) return;
    const isLocked = this.isGroupLocked();
    const actionName = isLocked ? 'Unlock' : 'Lock';
    const message = isLocked
      ? 'Unlocking this group allows new members to join via invite links.'
      : 'Locking this group stops new users from joining via invite links. Existing members can still log expenses and settle up.';

    this.confirmationService.confirm({
      header: `${actionName} Group`,
      message,
      icon: isLocked ? 'pi pi-lock-open' : 'pi pi-lock',
      accept: async () => {
        try {
          if (isLocked) {
            await this.splitService.unlockGroup(g.id);
          } else {
            await this.splitService.lockGroup(g.id);
          }
          this.reloadGroup.emit();
        } catch (err: any) {
          this.notificationService.showError(err?.message || `Failed to ${actionName.toLowerCase()} group.`);
        }
      }
    });
  }

  async closeGroupAction(): Promise<void> {
    const g = this.group();
    if (!g) return;
    const debts = this.balances()?.simplifiedPlan ?? [];
    const totalUnsettled = debts.reduce((sum, d) => sum + d.amount, 0);

    let message = 'Closing this trip group will archive it, mark it complete, and stop new expenses.';
    if (totalUnsettled > 0) {
      message += ` ⚠️ Note: There are still ${debts.length} unsettled debt(s) totaling ₹${totalUnsettled.toFixed(2)}.`;
    }

    this.confirmationService.confirm({
      header: 'Close / Archive Group',
      message,
      icon: 'pi pi-archive',
      accept: async () => {
        try {
          await this.splitService.closeGroup(g.id);
          this.notificationService.showSuccess('Trip group has been closed.');
          this.reloadGroup.emit();
        } catch (err: any) {
          this.notificationService.showError(err?.message || 'Failed to close group.');
        }
      }
    });
  }

  shareLink(): string {
    const token = this.group()?.shareToken;
    return token ? `${window.location.origin}/split/public/${token}` : '';
  }

  async copyShareLink(): Promise<void> {
    await navigator.clipboard.writeText(this.shareLink());
    this.notificationService.showSuccess('Share link copied.');
  }

  async createInvite(): Promise<void> {
    const g = this.group();
    if (!g) return;
    try {
      const created = await this.splitService.createInvite({
        groupId: g.id,
        expiresAt: null,
        maxUses: null
      });
      this.generatedInviteLink.set(`${window.location.origin}/split/join/${created.token}`);
    } catch (err: any) {
      this.notificationService.showError(err?.message || 'Failed to create invite.');
    }
  }

  async copyInviteLink(): Promise<void> {
    const link = this.generatedInviteLink();
    if (!link) return;
    await navigator.clipboard.writeText(link);
    this.notificationService.showSuccess('Invite link copied.');
    this.generatedInviteLink.set(null);
  }

  shareViaWhatsApp(): void {
    const g = this.group();
    if (!g) return;
    const link = this.shareLink() || this.generatedInviteLink() || window.location.href;
    const text = encodeURIComponent(`Hey! Join/view our trip group '${g.name}' on FinPlanner:\n${link}`);
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  }
}
