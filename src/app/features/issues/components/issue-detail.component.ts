import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IssueService } from '../services/issue.service';
import { Comment, IssueLabel, Milestone } from '../models/issue.model';
import { sharedPrimeModules } from '../../../shared/prime-imports';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { TextareaModule } from 'primeng/textarea';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { Auth } from '../../../core/services/auth';
import { environment } from '../../../../environments/environment';

import { DialogModule } from 'primeng/dialog';

@Component({
    selector: 'app-issue-detail',
    standalone: true,
    imports: [CommonModule, FormsModule, TagModule, DividerModule, TextareaModule, ConfirmDialogModule, DialogModule, ...sharedPrimeModules],
    providers: [MessageService, ConfirmationService],
    templateUrl: './issue-detail.component.html'
})
export class IssueDetailComponent {
    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private issueService = inject(IssueService);
    private messageService = inject(MessageService);
    private confirmService = inject(ConfirmationService);
    public authService = inject(Auth);

    issue = signal<any>(null);
    comments = signal<Comment[]>([]);
    newComment = signal('');
    replyingTo = signal<number | null>(null);
    replyContent = signal('');
    
    // Edit states
    isEditingIssue = signal(false);
    editTitle = signal('');
    editDescription = signal('');
    editingCommentId = signal<number | null>(null);
    editCommentContent = signal('');

    // Depth colors for nested comments
    depthColors = ['var(--primary-color)', 'var(--green-500)', 'var(--orange-500)', 'var(--purple-500)', 'var(--cyan-500)'];
    reactionEmojis = ['👍', '👎', '❤️', '🎉', '😄', '😕', '👀', '🚀'];

    // Phase 2 signals
    allLabels = signal<IssueLabel[]>([]);
    allMilestones = signal<Milestone[]>([]);
    commentReactions = signal<Record<number, {emoji: string; count: number; reacted: boolean}[]>>({});
    
    // Phase 3 signals
    attachments = signal<any[]>([]);

    // Voters Admin signals
    voters = signal<{userId: string, displayName: string, value: number}[]>([]);
    showVotersDialog = signal(false);

    // Lightbox signals
    showLightbox = signal(false);
    lightboxImage = signal('');
    lightboxHeader = signal('');

    threadedComments = computed(() => {
        const flat = this.comments();
        const rootComments = flat.filter(c => !c.parentCommentId);
        const buildTree = (parent: Comment): Comment => {
            const replies = flat.filter(c => c.parentCommentId === parent.id);
            return { ...parent, replies: replies.map(r => buildTree(r)) };
        };
        return rootComments.map(c => buildTree(c));
    });

    currentUserId = computed(() => {
        const details = this.authService.currentUserDetails();
        return details ? (details as any).sub || (details as any).name : null;
    });

    constructor() {
        const id = Number(this.route.snapshot.paramMap.get('id'));
        if (id) {
            this.loadIssue(id);
            this.loadComments(id);
            this.loadAttachments(id);
        }
        this.issueService.getLabels().subscribe(l => this.allLabels.set(l));
        this.issueService.getMilestones().subscribe(m => this.allMilestones.set(m));
    }

    loadIssue(id: number) {
        this.issueService.getIssueDetail(id).subscribe(data => {
            this.issue.set(data);
        });
    }

    loadComments(id: number) {
        this.issueService.getComments(id).subscribe(data => {
            this.comments.set(Array.isArray(data) ? data : []);
        });
    }

    loadAttachments(id: number) {
        this.issueService.getAttachments(id).subscribe(data => {
            this.attachments.set(data);
        });
    }

    onUpload(event: any) {
        const issue = this.issue();
        if (!issue) return;
        const file = event.files[0];
        if (file) {
            this.issueService.uploadAttachment(issue.id, file).subscribe(() => {
                this.messageService.add({ severity: 'success', summary: 'Success', detail: 'File uploaded' });
                this.loadAttachments(issue.id);
            });
        }
    }

    // ===== Issue Voting =====
    vote(value: number) {
        const issue = this.issue();
        if (!issue) return;
        this.issueService.voteIssue(issue.id, value).subscribe({
            next: (res) => {
                if (!res.success) {
                    this.messageService.add({ severity: 'warn', summary: 'Info', detail: res.message });
                    return;
                }
                this.messageService.add({ severity: 'success', summary: 'Voted', detail: res.message });
                this.issue.set({ ...issue, votes: res.votes, painScore: res.painScore, userVote: res.userVote });
            }
        });
    }

    viewVoters() {
        if (!this.authService.isAdmin()) return;
        const issue = this.issue();
        if (!issue) return;

        this.issueService.getIssueVoters(issue.id).subscribe(data => {
            this.voters.set(data);
            this.showVotersDialog.set(true);
        });
    }

    // ===== Issue Edit =====
    startEditIssue() {
        const issue = this.issue();
        if (!issue) return;
        this.editTitle.set(issue.title);
        this.editDescription.set(issue.description);
        this.isEditingIssue.set(true);
    }

    cancelEditIssue() {
        this.isEditingIssue.set(false);
    }

    saveEditIssue() {
        const issue = this.issue();
        if (!issue) return;
        if (!this.editTitle().trim() || this.isHtmlEmpty(this.editDescription())) return;
        this.issueService.updateIssue(issue.id, {
            title: this.editTitle().trim(),
            description: this.editDescription().trim()
        }).subscribe({
            next: (res) => {
                if (!res.success) {
                    this.messageService.add({ severity: 'error', summary: 'Error', detail: res.message });
                    return;
                }
                this.issue.set({ ...issue, title: this.editTitle().trim(), description: this.editDescription().trim() });
                this.isEditingIssue.set(false);
                this.messageService.add({ severity: 'success', summary: 'Updated', detail: 'Issue updated successfully.' });
            }
        });
    }

    // ===== Issue Status =====
    updateStatus(status: string) {
        const issue = this.issue();
        if (!issue) return;
        this.issueService.updateStatus(issue.id, status).subscribe({
            next: (res) => {
                if (res.success) {
                    this.issue.set({ ...issue, status: res.status });
                    this.messageService.add({ severity: 'success', summary: 'Status Updated', detail: 'Status changed to ' + res.status });
                }
            }
        });
    }

    // ===== Comments =====
    submitComment() {
        const content = this.newComment().trim();
        if (this.isHtmlEmpty(content) || !this.issue()) return;
        this.issueService.addComment(this.issue().id, content).subscribe({
            next: () => {
                this.newComment.set('');
                this.loadComments(this.issue().id);
                this.messageService.add({ severity: 'success', summary: 'Comment added' });
            },
            error: () => {
                this.messageService.add({ severity: 'error', summary: 'Login required', detail: 'You must be logged in to comment.' });
            }
        });
    }

    submitReply(parentId: number) {
        const content = this.replyContent().trim();
        if (this.isHtmlEmpty(content) || !this.issue()) return;
        this.issueService.addComment(this.issue().id, content, parentId).subscribe({
            next: () => {
                this.replyingTo.set(null);
                this.replyContent.set('');
                this.loadComments(this.issue().id);
                this.messageService.add({ severity: 'success', summary: 'Reply added' });
            },
            error: () => {
                this.messageService.add({ severity: 'error', summary: 'Login required', detail: 'You must be logged in to reply.' });
            }
        });
    }

    // ===== Comment Edit =====
    startEditComment(comment: Comment) {
        this.editingCommentId.set(comment.id);
        this.editCommentContent.set(comment.content);
    }

    cancelEditComment() {
        this.editingCommentId.set(null);
        this.editCommentContent.set('');
    }

    saveEditComment(commentId: number) {
        const content = this.editCommentContent().trim();
        if (this.isHtmlEmpty(content)) return;
        this.issueService.editComment(commentId, content).subscribe({
            next: (res) => {
                if (!res.success) {
                    this.messageService.add({ severity: 'error', summary: 'Error', detail: res.message });
                    return;
                }
                this.editingCommentId.set(null);
                this.loadComments(this.issue().id);
                this.messageService.add({ severity: 'success', summary: 'Updated', detail: 'Comment updated.' });
            }
        });
    }

    // ===== Comment Delete =====
    confirmDeleteComment(commentId: number) {
        this.confirmService.confirm({
            message: 'Are you sure you want to delete this comment?',
            header: 'Delete Comment',
            icon: 'pi pi-exclamation-triangle',
            acceptButtonStyleClass: 'p-button-danger p-button-sm',
            rejectButtonStyleClass: 'p-button-secondary p-button-sm',
            accept: () => {
                this.issueService.deleteComment(commentId).subscribe({
                    next: (res) => {
                        if (res.success) {
                            this.loadComments(this.issue().id);
                            this.messageService.add({ severity: 'success', summary: 'Deleted', detail: 'Comment deleted.' });
                        }
                    }
                });
            }
        });
    }

    // ===== Comment Voting =====
    voteComment(commentId: number, value: number) {
        this.issueService.voteComment(commentId, value).subscribe({
            next: (res) => {
                if (!res.success) {
                    this.messageService.add({ severity: 'warn', summary: 'Info', detail: res.message });
                    return;
                }
                const updated = this.comments().map(c => {
                    if (c.id === commentId) {
                        return { ...c, score: res.score, userVote: res.userVote };
                    }
                    return c;
                });
                this.comments.set(updated);
            },
            error: () => {
                this.messageService.add({ severity: 'error', summary: 'Login required', detail: 'You must be logged in to vote.' });
            }
        });
    }

    goBack() {
        if (this.authService.isLoggedIn()) {
            this.router.navigate(['/app/issues']);
        } else {
            this.router.navigate(['/feedback']);
        }
    }

    getDepthColor(depth: number): string {
        return this.depthColors[depth % this.depthColors.length];
    }

    openLightbox(imageUrl: string, fileName: string) {
        this.lightboxImage.set(imageUrl);
        this.lightboxHeader.set(fileName);
        this.showLightbox.set(true);
    }

    getTimelineDotClass(status: string): string {
        switch (status) {
            case 'New': return 'bg-gray-100';
            case 'Acknowledged': return 'bg-blue-100';
            case 'Triaged': return 'bg-purple-100';
            case 'Planned': return 'bg-cyan-100';
            case 'InProgress': return 'bg-orange-100';
            case 'Released': return 'bg-green-100';
            case 'Verified': return 'bg-teal-100';
            case 'Closed': return 'bg-red-100';
            default: return 'bg-gray-100';
        }
    }

    getTimelineDotInnerClass(status: string): string {
        switch (status) {
            case 'New': return 'bg-gray-500';
            case 'Acknowledged': return 'bg-blue-500';
            case 'Triaged': return 'bg-purple-500';
            case 'Planned': return 'bg-cyan-500';
            case 'InProgress': return 'bg-orange-500';
            case 'Released': return 'bg-green-500';
            case 'Verified': return 'bg-teal-500';
            case 'Closed': return 'bg-red-500';
            default: return 'bg-gray-500';
        }
    }

    getTimelineIcon(status: string): string {
        switch (status) {
            case 'New': return 'pi-plus';
            case 'Acknowledged': return 'pi-info-circle';
            case 'Triaged': return 'pi-tag';
            case 'Planned': return 'pi-calendar';
            case 'InProgress': return 'pi-spin pi-spinner';
            case 'Released': return 'pi-send';
            case 'Verified': return 'pi-check-circle';
            case 'Closed': return 'pi-lock';
            default: return 'pi-refresh';
        }
    }

    getStatusSeverity(status: string): 'danger' | 'success' | 'info' | 'warn' | 'secondary' | 'contrast' {
        switch (status) {
            case 'New': return 'warn';
            case 'Acknowledged': return 'info';
            case 'Triaged': return 'contrast';
            case 'Planned': return 'secondary';
            case 'InProgress': return 'warn';
            case 'Released': return 'success';
            case 'Verified': return 'success';
            case 'Closed': return 'danger';
            default: return 'secondary';
        }
    }

    getTypeIcon(type: string): string {
        switch (type) {
            case 'Bug': return '🐛';
            case 'Feature': return '✨';
            case 'Question': return '❓';
            default: return '📋';
        }
    }

    getTypeSeverity(type: string): 'danger' | 'success' | 'info' | 'warn' | 'secondary' | 'contrast' {
        switch (type) {
            case 'Bug': return 'danger';
            case 'Feature': return 'success';
            case 'Question': return 'info';
            default: return 'secondary';
        }
    }

    /** Build full backend URL for attachment files */
    getAttachmentUrl(filePath: string): string {
        // filePath is like "/uploads/issues/3/file.png" — prepend backend origin
        const apiBase = environment.apiBaseUrl; // e.g. "https://localhost:7123/api"
        const origin = apiBase.replace(/\/api$/, ''); // "https://localhost:7123"
        return origin + filePath;
    }

    // ngModel bridge for signals
    get newCommentValue() { return this.newComment(); }
    set newCommentValue(v: string) { this.newComment.set(v); }

    get replyContentValue() { return this.replyContent(); }
    set replyContentValue(v: string) { this.replyContent.set(v); }

    get editTitleValue() { return this.editTitle(); }
    set editTitleValue(v: string) { this.editTitle.set(v); }

    get editDescriptionValue() { return this.editDescription(); }
    set editDescriptionValue(v: string) { this.editDescription.set(v); }

    get editCommentContentValue() { return this.editCommentContent(); }
    set editCommentContentValue(v: string) { this.editCommentContent.set(v); }

    statusOptions = ['New', 'Acknowledged', 'Triaged', 'Planned', 'InProgress', 'Released', 'Verified', 'Closed'];

    // ===== Phase 2: Close / Reopen =====
    closeIssue() {
        const issue = this.issue();
        if (!issue) return;
        this.issueService.closeIssue(issue.id).subscribe(res => {
            if (res.success) {
                this.issue.set({ ...issue, isClosed: true, status: 'Closed', closedAt: res.closedAt, closedByName: res.closedByName });
                this.messageService.add({ severity: 'info', summary: 'Closed', detail: 'Issue has been closed.' });
            }
        });
    }

    reopenIssue() {
        const issue = this.issue();
        if (!issue) return;
        this.issueService.reopenIssue(issue.id).subscribe(res => {
            if (res.success) {
                this.issue.set({ ...issue, isClosed: false, status: 'New', closedAt: null, closedByName: null });
                this.messageService.add({ severity: 'success', summary: 'Reopened', detail: 'Issue has been reopened.' });
            }
        });
    }

    // ===== Phase 2: Labels =====
    toggleLabel(labelId: number) {
        const issue = this.issue();
        if (!issue) return;
        const hasLabel = (issue.labels || []).some((l: any) => l.id === labelId);
        if (hasLabel) {
            this.issueService.removeLabel(issue.id, labelId).subscribe(() => this.loadIssue(issue.id));
        } else {
            this.issueService.addLabel(issue.id, labelId).subscribe(() => this.loadIssue(issue.id));
        }
    }

    isLabelActive(labelId: number): boolean {
        const issue = this.issue();
        return issue ? (issue.labels || []).some((l: any) => l.id === labelId) : false;
    }

    // ===== Phase 2: Reactions =====
    toggleReaction(commentId: number, emoji: string) {
        this.issueService.toggleReaction(commentId, emoji).subscribe(() => {
            this.loadReactionsFor(commentId);
        });
    }

    loadReactionsFor(commentId: number) {
        this.issueService.getReactions(commentId).subscribe(data => {
            this.commentReactions.update(r => ({ ...r, [commentId]: data }));
        });
    }

    getReactions(commentId: number) {
        return this.commentReactions()[commentId] || [];
    }

    isHtmlEmpty(html: string): boolean {
        if (!html) return true;
        const stripped = html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim();
        return stripped.length === 0;
    }
}
