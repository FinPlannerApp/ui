import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { sharedPrimeModules } from '../../../shared/prime-imports';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectButtonModule } from 'primeng/selectbutton';
import { IssueService } from '../services/issue.service';
import { Issue } from '../models/issue.model';
import { Auth } from '../../../core/services/auth';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-roadmap',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, TagModule, DividerModule, DialogModule, InputTextModule, SelectButtonModule, ...sharedPrimeModules],
  providers: [MessageService],
  templateUrl: './roadmap.component.html',
  styles: [`
    .kanban-wrapper {
      display: flex;
      flex-direction: row;
      overflow-x: auto;
      gap: 1.5rem;
      padding-bottom: 1.5rem;
      scroll-behavior: smooth;
      align-items: stretch;
      min-height: 65vh;
    }
    .kanban-column {
      width: 380px;
      flex: 0 0 380px;
      display: flex;
      flex-direction: column;
      background: var(--surface-card);
      border-radius: 12px;
      border: 1px solid var(--surface-border);
    }
    .kanban-cards-container {
      overflow-y: auto;
      flex: 1;
      max-height: 620px;
      padding-right: 0.35rem;
    }
    /* Premium scrollbars */
    .kanban-wrapper::-webkit-scrollbar,
    .kanban-cards-container::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    .kanban-wrapper::-webkit-scrollbar-track,
    .kanban-cards-container::-webkit-scrollbar-track {
      background: rgba(0, 0, 0, 0.03);
      border-radius: 3px;
    }
    .kanban-wrapper::-webkit-scrollbar-thumb,
    .kanban-cards-container::-webkit-scrollbar-thumb {
      background: rgba(99, 102, 241, 0.2);
      border-radius: 3px;
    }
    .kanban-wrapper::-webkit-scrollbar-thumb:hover,
    .kanban-cards-container::-webkit-scrollbar-thumb:hover {
      background: rgba(99, 102, 241, 0.4);
    }
    .kanban-card {
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .kanban-card:hover {
      transform: translateY(-2px);
    }
  `]
})
export class RoadmapComponent implements OnInit {
  private issueService = inject(IssueService);
  private messageService = inject(MessageService);
  private router = inject(Router);
  public auth = inject(Auth);

  loading = signal(true);
  issues = signal<Issue[]>([]);
  draggedIssue = signal<Issue | null>(null);
  selectedIssue = signal<Issue | null>(null);

  // Dialog controls
  showAddDialog = false;
  isEditing = signal(false);
  addToStatus = signal('Planned');
  newTitle = '';
  newDescription = '';
  newType = 'Feature';
  newSeverity = 'Minor';

  typeOptions = [
    { label: '✨ Feature', value: 'Feature' },
    { label: '🐛 Bug', value: 'Bug' },
    { label: '❓ Question', value: 'Question' }
  ];
  severityOptions = ['Minor', 'Major', 'Critical'];

  columns = [
    { title: 'Planned', status: 'Planned', icon: 'pi pi-calendar', color: '#f59e0b' },
    { title: 'In Progress', status: 'InProgress', icon: 'pi pi-spin pi-cog', color: '#3b82f6' },
    { title: 'Released', status: 'Released', icon: 'pi pi-check-circle', color: '#10b981' }
  ];

  // Computed Engagement and Statistics Dashboard Signals
  totalPlanned = computed(() => this.issues().filter(i => i.status === 'Planned').length);
  totalInProgress = computed(() => this.issues().filter(i => i.status === 'InProgress').length);
  totalReleased = computed(() => this.issues().filter(i => i.status === 'Released').length);
  totalVotes = computed(() => this.issues().reduce((sum, i) => sum + (i.votes || 0), 0));

  contextMenuItems = [
    { label: 'Edit Item Details', icon: 'pi pi-pencil', command: () => this.openEditDialog() },
    { label: 'Move to Planned', icon: 'pi pi-calendar', command: () => this.moveItem('Planned') },
    { label: 'Move to In Progress', icon: 'pi pi-cog', command: () => this.moveItem('InProgress') },
    { label: 'Move to Released', icon: 'pi pi-check-circle', command: () => this.moveItem('Released') },
    { separator: true },
    {
      label: 'View Details', icon: 'pi pi-eye', command: () => {
        const issue = this.selectedIssue();
        if (issue) {
          const base = this.auth.isLoggedIn() ? '/app/issues' : '/feedback';
          this.router.navigate([base, issue.id]);
        }
      }
    },
  ];

  ngOnInit() {
    this.loadRoadmap();
  }

  loadRoadmap() {
    this.issueService.getIssues(undefined, 'votes', 1, 200).subscribe(res => {
      const allIssues: Issue[] = Array.isArray(res?.data) ? res.data : [];
      const roadmapStatuses = ['Planned', 'InProgress', 'Released'];
      this.issues.set(allIssues.filter(i => roadmapStatuses.includes(i.status)));
      this.loading.set(false);
    });
  }

  getIssuesForStatus(status: string): Issue[] {
    return this.issues().filter(i => i.status === status);
  }

  // --- Drag & Drop ---
  dragStart(issue: Issue) {
    this.draggedIssue.set(issue);
  }

  dragEnd() {
    this.draggedIssue.set(null);
  }

  drop(status: string) {
    const issue = this.draggedIssue();
    if (issue && issue.status !== status) {
      this.moveToStatus(issue.id, status);
    }
  }

  // --- Voting Hub actions ---
  quickVote(issue: Issue, value: number) {
    if (!this.auth.isLoggedIn()) {
      this.messageService.add({ severity: 'error', summary: 'Login Required', detail: 'You must be logged in to vote.' });
      return;
    }
    this.issueService.voteIssue(issue.id, value).subscribe({
      next: (res) => {
        if (!res.success) {
          this.messageService.add({ severity: 'warn', summary: 'Info', detail: res.message });
          return;
        }
        this.messageService.add({ severity: 'success', summary: 'Voted', detail: res.message });
        this.loadRoadmap();
      }
    });
  }

  // --- Admin Actions ---
  moveItem(status: string) {
    const issue = this.selectedIssue();
    if (issue) {
      this.moveToStatus(issue.id, status);
    }
  }

  moveToStatus(issueId: number, status: string) {
    this.issueService.updateStatus(issueId, status).subscribe(res => {
      if (res.success) {
        this.messageService.add({ severity: 'success', summary: 'Moved', detail: `Item successfully moved to ${status}` });
        this.loadRoadmap();
      } else {
        this.messageService.add({ severity: 'error', summary: 'Unauthorized', detail: res.message || 'Only administrators can manage the roadmap.' });
      }
    }, () => {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to transition roadmap item.' });
    });
  }

  openAddDialog(status: string) {
    this.isEditing.set(false);
    this.addToStatus.set(status);
    this.newTitle = '';
    this.newDescription = '';
    this.newType = 'Feature';
    this.newSeverity = 'Minor';
    this.showAddDialog = true;
  }

  openEditDialog() {
    const issue = this.selectedIssue();
    if (!issue) return;
    this.isEditing.set(true);
    this.newTitle = issue.title;
    this.newDescription = issue.description || '';
    this.newType = issue.type;
    this.newSeverity = issue.severity || 'Minor';
    this.showAddDialog = true;
  }

  createRoadmapItem() {
    if (!this.newTitle.trim() || !this.newDescription.trim()) return;

    const dto = {
      title: this.newTitle.trim(),
      description: this.newDescription.trim(),
      type: this.newType,
      severity: this.newSeverity,
      impactsMoney: false,
      frequency: 'Sometimes'
    };

    this.issueService.createIssue(dto as any).subscribe({
      next: (issueId) => {
        const targetStatus = this.addToStatus();
        this.issueService.updateStatus(issueId, targetStatus).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Created', detail: `Roadmap item added to ${targetStatus}` });
            this.showAddDialog = false;
            this.loadRoadmap();
          }
        });
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to create item. Please login first.' });
      }
    });
  }

  saveRoadmapItem() {
    const issue = this.selectedIssue();
    if (!issue) return;
    if (!this.newTitle.trim() || !this.newDescription.trim()) return;

    const dto = {
      title: this.newTitle.trim(),
      description: this.newDescription.trim(),
      type: this.newType,
      severity: this.newSeverity
    };

    this.issueService.updateIssue(issue.id, dto as any).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Roadmap item updated successfully.' });
          this.showAddDialog = false;
          this.loadRoadmap();
        } else {
          this.messageService.add({ severity: 'error', summary: 'Error', detail: res.message || 'Failed to update.' });
        }
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to update. Please check admin permissions.' });
      }
    });
  }

  stripHtml(html: string): string {
    if (!html) return '';
    return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim();
  }
}
