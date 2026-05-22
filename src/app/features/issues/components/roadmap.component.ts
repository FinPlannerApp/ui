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
  template: `
    <p-toast></p-toast>
    <div class="p-4 md:p-6" style="max-width: 1400px; margin: 0 auto;">
      <!-- Title & Header -->
      <div class="flex align-items-center justify-content-between mb-5">
        <div class="flex align-items-center gap-3">
          <p-button icon="pi pi-arrow-left" severity="secondary" [outlined]="true" [rounded]="true" [routerLink]="auth.isLoggedIn() ? '/app/issues' : '/feedback'"></p-button>
          <div>
            <h1 class="m-0 text-3xl font-bold">🗺️ Product Roadmap</h1>
            <p class="text-color-secondary mt-1 mb-0">See what we're planning, currently building, and what has already shipped.</p>
          </div>
        </div>
      </div>

      @if (loading()) {
        <div class="flex justify-content-center p-6"><p-progressSpinner></p-progressSpinner></div>
      } @else {
        <!-- Stats Dashboard Banner -->
        <div class="grid mb-5">
          <div class="col-12 sm:col-6 lg:col-3">
            <div class="p-4 surface-card border-round shadow-1 border-left-3 border-orange-500 h-full flex flex-column justify-content-between hover:shadow-3 transition-shadow duration-200">
              <div class="flex align-items-center justify-content-between">
                <span class="text-color-secondary font-medium text-sm uppercase tracking-wider">Planned Features</span>
                <i class="pi pi-calendar text-orange-500 text-xl"></i>
              </div>
              <div class="mt-3 flex align-items-baseline gap-2">
                <span class="text-4xl font-bold">{{totalPlanned()}}</span>
                <span class="text-xs text-color-secondary">Queued for development</span>
              </div>
            </div>
          </div>
          <div class="col-12 sm:col-6 lg:col-3">
            <div class="p-4 surface-card border-round shadow-1 border-left-3 border-blue-500 h-full flex flex-column justify-content-between hover:shadow-3 transition-shadow duration-200">
              <div class="flex align-items-center justify-content-between">
                <span class="text-color-secondary font-medium text-sm uppercase tracking-wider">In Progress</span>
                <i class="pi pi-cog pi-spin text-blue-500 text-xl"></i>
              </div>
              <div class="mt-3 flex align-items-baseline gap-2">
                <span class="text-4xl font-bold">{{totalInProgress()}}</span>
                <span class="text-xs text-color-secondary">Currently active</span>
              </div>
            </div>
          </div>
          <div class="col-12 sm:col-6 lg:col-3">
            <div class="p-4 surface-card border-round shadow-1 border-left-3 border-green-500 h-full flex flex-column justify-content-between hover:shadow-3 transition-shadow duration-200">
              <div class="flex align-items-center justify-content-between">
                <span class="text-color-secondary font-medium text-sm uppercase tracking-wider">Released</span>
                <i class="pi pi-check-circle text-green-500 text-xl"></i>
              </div>
              <div class="mt-3 flex align-items-baseline gap-2">
                <span class="text-4xl font-bold">{{totalReleased()}}</span>
                <span class="text-xs text-color-secondary">Fully completed & live</span>
              </div>
            </div>
          </div>
          <div class="col-12 sm:col-6 lg:col-3">
            <div class="p-4 surface-card border-round shadow-1 border-left-3 border-purple-500 h-full flex flex-column justify-content-between hover:shadow-3 transition-shadow duration-200">
              <div class="flex align-items-center justify-content-between">
                <span class="text-color-secondary font-medium text-sm uppercase tracking-wider">Community Engagement</span>
                <i class="pi pi-users text-purple-500 text-xl"></i>
              </div>
              <div class="mt-3 flex align-items-baseline gap-2">
                <span class="text-4xl font-bold">{{totalVotes()}}</span>
                <span class="text-xs text-color-secondary">Upvotes from users</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Leaderboard Promotion & Feedback Actions -->
        <div class="surface-card p-4 border-round shadow-1 mb-5 flex flex-column md:flex-row align-items-center justify-content-between gap-3 hover:shadow-3 transition-shadow duration-200" style="background: linear-gradient(135deg, rgba(99, 102, 241, 0.04) 0%, rgba(168, 85, 247, 0.04) 100%); border: 1px solid rgba(99, 102, 241, 0.1);">
          <div class="flex align-items-center gap-3 flex-column md:flex-row text-center md:text-left">
            <div class="flex align-items-center justify-content-center bg-indigo-500 border-circle text-white shadow-2" style="width: 56px; height: 56px;">
              <i class="pi pi-sparkles text-2xl"></i>
            </div>
            <div>
              <h3 class="m-0 text-lg font-bold text-color">Community Feedback Hub Portal</h3>
              <p class="text-color-secondary mt-1 mb-0 text-sm">Submit bugs or suggest features. Upvote existing items to increase their **Pain Score** and help our team prioritize development!</p>
            </div>
          </div>
          <div class="flex gap-2">
            <p-button label="Submit Feedback" icon="pi pi-plus" severity="primary" [routerLink]="auth.isLoggedIn() ? '/app/issues/new' : '/feedback/new'"></p-button>
            <p-button label="Leaderboard" icon="pi pi-trophy" severity="secondary" [outlined]="true" [routerLink]="auth.isLoggedIn() ? '/app/issues/leaderboard' : '/feedback/leaderboard'"></p-button>
          </div>
        </div>

        <!-- Roadmap Kanban Horizontally Scrolling Viewport -->
        <div class="kanban-wrapper">
          @for (column of columns; track column.status) {
            <div class="kanban-column shadow-2 border-top-3" [ngStyle]="{'border-top-color': column.color}">
              <div class="p-3 flex flex-column h-full">
                <!-- Column Header -->
                <div class="flex align-items-center justify-content-between mb-4">
                  <h2 class="text-xl font-bold m-0 flex align-items-center gap-2">
                    <i [class]="column.icon" [style.color]="column.color"></i>
                    {{column.title}}
                  </h2>
                  <div class="flex align-items-center gap-2">
                    <p-tag [value]="getIssuesForStatus(column.status).length.toString()" severity="secondary" [rounded]="true"></p-tag>
                    @if (auth.isAdmin()) {
                      <p-button icon="pi pi-plus" [rounded]="true" [text]="true" size="small" severity="success"
                        pTooltip="Add Item to Phase" (onClick)="openAddDialog(column.status)"></p-button>
                    }
                  </div>
                </div>
                
                <!-- Kanban Cards Stack -->
                <div class="kanban-cards-container flex flex-column gap-3">
                  @for (issue of getIssuesForStatus(column.status); track issue.id) {
                    <div class="kanban-card p-3 border-1 surface-border border-round bg-card-glow hover:surface-hover transition-all transition-duration-300 shadow-1 hover:shadow-3 cursor-pointer"
                      style="border-left: 4px solid var(--surface-300);"
                      [style.border-left-color]="issue.type === 'Feature' ? '#10b981' : issue.type === 'Bug' ? '#ef4444' : '#3b82f6'"
                      [class.cursor-move]="auth.isAdmin()"
                      pDraggable="roadmap" [pDraggableDisabled]="!auth.isAdmin()" (onDragStart)="dragStart(issue)" (onDragEnd)="dragEnd()"
                      [routerLink]="auth.isLoggedIn() ? ['/app/issues', issue.id] : ['/feedback', issue.id]">
                      
                      <!-- Card Header -->
                      <div class="flex justify-content-between align-items-start mb-2">
                        <p-tag [value]="issue.type" [severity]="issue.type === 'Feature' ? 'success' : issue.type === 'Bug' ? 'danger' : 'info'" size="small"></p-tag>
                        <div class="flex align-items-center gap-2">
                          @if (issue.severity) {
                            <span class="flex align-items-center gap-1 text-xs text-color-secondary font-semibold" pTooltip="Severity">
                              <span class="border-circle" [style.background-color]="issue.severity === 'Critical' ? '#ef4444' : issue.severity === 'Major' ? '#f59e0b' : '#3b82f6'" style="width: 8px; height: 8px; display: inline-block;"></span>
                              {{issue.severity}}
                            </span>
                          }
                          @if (issue.milestoneTitle) {
                            <span class="text-xs text-color-secondary"><i class="pi pi-flag mr-1"></i>{{issue.milestoneTitle}}</span>
                          }
                          @if (auth.isAdmin()) {
                            <p-button icon="pi pi-ellipsis-v" [rounded]="true" [text]="true" size="small" severity="secondary"
                              (onClick)="$event.stopPropagation(); menu.toggle($event); selectedIssue.set(issue)"></p-button>
                          }
                        </div>
                      </div>
                      
                      <!-- Title & Details -->
                      <div class="font-bold text-color text-base mb-2 line-height-3">{{issue.title}}</div>
                      <div class="text-sm text-color-secondary line-height-3" style="display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;" [innerHTML]="stripHtml(issue.description)"></div>
                      
                      <!-- Card Footer / Voting Hub -->
                      <div class="flex align-items-center justify-content-between mt-3 pt-2 border-top-1 surface-border text-sm">
                        <div class="flex align-items-center gap-1">
                          <p-button icon="pi pi-thumbs-up" [rounded]="true" [text]="true" size="small"
                            [severity]="issue.userVote === 1 ? 'success' : 'secondary'"
                            pTooltip="Upvote"
                            (onClick)="$event.stopPropagation(); quickVote(issue, 1)"></p-button>
                          <span class="font-bold text-color" [ngClass]="{
                            'text-green-500': issue.votes > 0,
                            'text-red-500': issue.votes < 0
                          }">{{issue.votes}}</span>
                          <p-button icon="pi pi-thumbs-down" [rounded]="true" [text]="true" size="small"
                            [severity]="issue.userVote === -1 ? 'danger' : 'secondary'"
                            pTooltip="Downvote"
                            (onClick)="$event.stopPropagation(); quickVote(issue, -1)"></p-button>
                        </div>
                        <span class="text-primary no-underline font-semibold hover:underline">View Details →</span>
                      </div>
                    </div>
                  }
                  
                  <!-- Admin drag/drop zone -->
                  @if (auth.isAdmin()) {
                    <div class="p-3 border-1 border-dashed surface-border border-round text-center text-color-secondary text-sm hover:surface-hover transition-colors"
                      pDroppable="roadmap" [pDroppableDisabled]="!auth.isAdmin()" (onDrop)="drop(column.status)"
                      style="min-height: 60px; display: flex; align-items: center; justify-content: center;">
                      <span><i class="pi pi-arrows-alt mr-1"></i> Drop here to move to {{column.title}}</span>
                    </div>
                  }
                  
                  @if (getIssuesForStatus(column.status).length === 0 && !auth.isAdmin()) {
                    <div class="text-center p-4 text-color-secondary surface-card border-round">
                      <i class="pi pi-inbox text-3xl mb-2 text-color-secondary opacity-50"></i>
                      <div class="text-sm">No items in this phase</div>
                    </div>
                  }
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>

    <!-- Context Menu for Admins -->
    <p-menu #menu [model]="contextMenuItems" [popup]="true" appendTo="body"></p-menu>

    <!-- Unified Add/Edit WYSIWYG Dialog -->
    <p-dialog [(visible)]="showAddDialog" [header]="isEditing() ? '⚙️ Edit Roadmap Item' : '✨ Add Roadmap Item to ' + addToStatus()" [modal]="true" [style]="{width: '650px'}" [closable]="true" [dismissableMask]="true">
      <div class="flex flex-column gap-4 pt-2">
        <div class="flex flex-column gap-2">
          <label class="font-semibold text-color">Title *</label>
          <input pInputText [(ngModel)]="newTitle" placeholder="e.g. Plaid Bank Sync Integration" class="w-full" />
        </div>
        <div class="flex flex-column gap-2">
          <label class="font-semibold text-color">Description (WYSIWYG Rich Text) *</label>
          <p-editor [(ngModel)]="newDescription" [style]="{'height':'200px'}" placeholder="Write feature specifications, tasks, or milestones..."></p-editor>
        </div>
        <div class="grid">
          <div class="col-12 sm:col-6 flex flex-column gap-2">
            <label class="font-semibold text-color">Type</label>
            <p-selectButton [options]="typeOptions" [(ngModel)]="newType" optionLabel="label" optionValue="value"></p-selectButton>
          </div>
          <div class="col-12 sm:col-6 flex flex-column gap-2">
            <label class="font-semibold text-color">Severity</label>
            <p-select [options]="severityOptions" [(ngModel)]="newSeverity" placeholder="Select severity" appendTo="body" class="w-full"></p-select>
          </div>
        </div>
      </div>
      <ng-template pTemplate="footer">
        <div class="flex justify-content-end gap-2 mt-3">
          <p-button label="Cancel" severity="secondary" [outlined]="true" (onClick)="showAddDialog = false"></p-button>
          @if (isEditing()) {
            <p-button label="Save Changes" icon="pi pi-check" (onClick)="saveRoadmapItem()" [disabled]="!newTitle || !newDescription"></p-button>
          } @else {
            <p-button label="Create & Add to Roadmap" icon="pi pi-plus" (onClick)="createRoadmapItem()" [disabled]="!newTitle || !newDescription"></p-button>
          }
        </div>
      </ng-template>
    </p-dialog>
  `,
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
