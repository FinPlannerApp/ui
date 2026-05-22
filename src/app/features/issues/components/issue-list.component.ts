import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IssueService } from '../services/issue.service';
import { Issue } from '../models/issue.model';
import { Router, RouterLink } from '@angular/router';
import { sharedPrimeModules } from '../../../shared/prime-imports';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { PaginatorModule } from 'primeng/paginator';
import { MessageService } from 'primeng/api';
import { InputTextModule } from 'primeng/inputtext';
import { SelectButtonModule } from 'primeng/selectbutton';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { Auth } from '../../../core/services/auth';

@Component({
    selector: 'app-issue-list',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink, TagModule, DividerModule, PaginatorModule, InputTextModule, SelectButtonModule, IconFieldModule, InputIconModule, ...sharedPrimeModules],
    providers: [MessageService],
    templateUrl: './issue-list.component.html',
    styles: [`
        .kanban-wrapper {
            display: flex;
            flex-direction: row;
            overflow-x: auto;
            gap: 1.25rem;
            padding-bottom: 1.25rem;
            scroll-behavior: smooth;
            align-items: stretch;
            min-height: 65vh;
        }
        .kanban-column {
            width: 320px;
            flex: 0 0 320px;
            display: flex;
            flex-direction: column;
            background: var(--surface-card);
            border-radius: 12px;
            border: 1px solid var(--surface-border);
            padding: 1rem;
        }
        .kanban-cards-container {
            overflow-y: auto;
            flex: 1;
            max-height: 600px;
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
    `]
})
export class IssueListComponent {
    private issueService = inject(IssueService);
    private messageService = inject(MessageService);
    private router = inject(Router);
    public auth = inject(Auth);
    
    issues = signal<Issue[]>([]);
    currentSort = signal('pain');
    searchQuery = signal('');
    typeFilter = signal<string | null>(null);
    
    // Pagination
    totalItems = signal(0);
    currentPage = signal(1);
    pageSize = signal(10);

    // View Mode
    viewMode = signal<'list' | 'kanban'>('list');
    kanbanStatuses = ['New', 'Acknowledged', 'Triaged', 'Planned', 'InProgress', 'Released', 'Verified', 'Closed'];
    kanbanIssues = signal<Record<string, Issue[]>>({});
    draggedIssue = signal<Issue | null>(null);

    typeOptions = [
        { label: 'All', value: null },
        { label: '🐛 Bugs', value: 'Bug' },
        { label: '✨ Features', value: 'Feature' },
        { label: '❓ Questions', value: 'Question' }
    ];
    // Advanced Filters
    allCategories = signal<any[]>([]);
    selectedCategory = signal<number | null>(null);
    severities = ['Critical', 'Major', 'Minor'];
    selectedSeverity = signal<string | null>(null);

    constructor() {
        this.loadIssues('pain');
        this.issueService.getTaxonomies().subscribe(data => this.allCategories.set(data));
    }

    loadIssues(sort: string) {
        this.currentSort.set(sort);
        const search = this.searchQuery()?.trim() || undefined;
        const type = this.typeFilter() || undefined;
        const cat = this.selectedCategory() || undefined;
        const sev = this.selectedSeverity() || undefined;
        
        const limit = this.viewMode() === 'kanban' ? 100 : this.pageSize();
        
        this.issueService.getIssues(undefined, sort, this.currentPage(), limit, search, type, cat, sev).subscribe(res => {
            const issuesData = Array.isArray(res?.data) ? res.data : [];
            this.issues.set(issuesData);
            this.totalItems.set(res?.totalItems ?? 0);
            
            this.updateKanbanBoard(issuesData);
        });
    }

    updateKanbanBoard(issues: Issue[]) {
        const columns: Record<string, Issue[]> = {};
        for (const status of this.kanbanStatuses) {
            columns[status] = issues.filter(i => i.status === status);
        }
        this.kanbanIssues.set(columns);
    }

    dragStart(issue: Issue) {
        this.draggedIssue.set(issue);
    }
    
    dragEnd() {
        this.draggedIssue.set(null);
    }
    
    drop(status: string) {
        const issue = this.draggedIssue();
        if (issue && issue.status !== status) {
            this.issueService.updateStatus(issue.id, status).subscribe(res => {
                if (res.success) {
                    this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Status updated' });
                    this.loadIssues(this.currentSort());
                }
            });
        }
    }

    onSearch() {
        this.currentPage.set(1);
        this.loadIssues(this.currentSort());
    }

    onTypeFilter(event: any) {
        this.typeFilter.set(event.value);
        this.currentPage.set(1);
        this.loadIssues(this.currentSort());
    }

    onFilterChange() {
        this.currentPage.set(1);
        this.loadIssues(this.currentSort());
    }

    toggleViewMode() {
        const mode = this.viewMode() === 'list' ? 'kanban' : 'list';
        this.viewMode.set(mode);
        this.loadIssues(this.currentSort());
    }

    onPageChange(event: any) {
        this.currentPage.set(Math.floor(event.first / event.rows) + 1);
        this.pageSize.set(event.rows);
        this.loadIssues(this.currentSort());
    }

    vote(id: number, value: number) {
        this.issueService.voteIssue(id, value).subscribe({
            next: (res) => {
                if (!res.success) {
                    this.messageService.add({ severity: 'warn', summary: 'Info', detail: res.message });
                    return;
                }
                this.messageService.add({ severity: 'success', summary: 'Voted', detail: res.message });
                const updated = this.issues().map(issue => {
                    if (issue.id === id) {
                        return { ...issue, votes: res.votes, painScore: res.painScore, userVote: res.userVote };
                    }
                    return issue;
                });
                this.issues.set(updated);
            }
        });
    }

    openDetail(id: number) {
        const base = this.auth.isLoggedIn() ? '/app/issues' : '/feedback';
        this.router.navigate([base, id]);
    }

    /** Strip HTML tags from WYSIWYG content for list preview */
    stripHtml(html: string): string {
        if (!html) return '';
        return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
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

    getStatusSeverity(status: string): 'danger' | 'success' | 'info' | 'warn' | 'secondary' | 'contrast' {
        switch (status) {
            case 'New': return 'warn';
            case 'Closed': return 'danger';
            case 'Verified': case 'Released': return 'success';
            case 'InProgress': return 'info';
            default: return 'secondary';
        }
    }

    // ngModel bridge for signals
    get searchQueryValue() { return this.searchQuery(); }
    set searchQueryValue(v: string) { this.searchQuery.set(v); }
}
