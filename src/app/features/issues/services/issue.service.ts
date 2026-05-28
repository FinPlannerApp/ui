import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Issue, CreateIssueDto, IssueLabel, Milestone } from '../models/issue.model';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class IssueService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiBaseUrl}/issues`;

    // --- Issues ---
    getIssues(status?: string, sort = 'pain', page = 1, pageSize = 10, search?: string, type?: string, categoryId?: number, severity?: string): Observable<any> {
        let params = new HttpParams().set('sort', sort).set('page', page.toString()).set('pageSize', pageSize.toString());
        if (status) params = params.set('status', status);
        if (search) params = params.set('search', search);
        if (type) params = params.set('type', type);
        if (categoryId) params = params.set('categoryId', categoryId.toString());
        if (severity) params = params.set('severity', severity);
        return this.http.get<any>(this.apiUrl, { params });
    }

    getIssueDetail(id: number): Observable<any> { return this.http.get<any>(`${this.apiUrl}/${id}`); }
    checkSimilar(title: string, description: string): Observable<Issue[]> { return this.http.post<Issue[]>(`${this.apiUrl}/check-similar`, { title, description }); }
    createIssue(issue: CreateIssueDto): Observable<number> { return this.http.post<number>(this.apiUrl, issue); }
    updateIssue(id: number, data: any): Observable<any> { return this.http.put<any>(`${this.apiUrl}/${id}`, data); }
    updateStatus(id: number, status: string): Observable<any> { return this.http.put<any>(`${this.apiUrl}/${id}/status`, { status }); }

    // --- Close / Reopen ---
    closeIssue(id: number): Observable<any> { return this.http.post<any>(`${this.apiUrl}/${id}/close`, {}); }
    reopenIssue(id: number): Observable<any> { return this.http.post<any>(`${this.apiUrl}/${id}/reopen`, {}); }

    // --- Taxonomy ---
    seedTaxonomy(): Observable<any> { return this.http.post(`${this.apiUrl}/seed`, {}); }
    getTaxonomies(): Observable<any[]> { return this.http.get<any[]>(`${this.apiUrl}/taxonomy`); }
    createTaxonomy(name: string, parentId: number | null = null): Observable<any> { return this.http.post<any>(`${this.apiUrl}/taxonomy`, { name, parentId }); }

    // --- Voting ---
    voteIssue(id: number, value: number): Observable<any> { return this.http.post<any>(`${this.apiUrl}/${id}/vote`, { value }); }
    getIssueVoters(id: number): Observable<any[]> { return this.http.get<any[]>(`${this.apiUrl}/${id}/voters`); }

    // --- Comments ---
    getComments(issueId: number): Observable<any[]> { return this.http.get<any[]>(`${this.apiUrl}/${issueId}/comments`); }
    addComment(issueId: number, content: string, parentCommentId?: number, type: string = 'General'): Observable<any> { return this.http.post<any>(`${this.apiUrl}/${issueId}/comments`, { content, parentCommentId, type }); }
    editComment(commentId: number, content: string): Observable<any> { return this.http.put<any>(`${this.apiUrl}/comments/${commentId}`, { content }); }
    deleteComment(commentId: number): Observable<any> { return this.http.delete<any>(`${this.apiUrl}/comments/${commentId}`); }
    voteComment(commentId: number, value: number): Observable<any> { return this.http.post<any>(`${this.apiUrl}/comments/${commentId}/vote`, { value }); }

    // --- Labels ---
    getLabels(): Observable<IssueLabel[]> { return this.http.get<IssueLabel[]>(`${this.apiUrl}/labels`); }
    createLabel(name: string, color: string, description?: string): Observable<IssueLabel> { return this.http.post<IssueLabel>(`${this.apiUrl}/labels`, { name, color, description }); }
    addLabel(issueId: number, labelId: number): Observable<any> { return this.http.post<any>(`${this.apiUrl}/${issueId}/labels/${labelId}`, {}); }
    removeLabel(issueId: number, labelId: number): Observable<any> { return this.http.delete<any>(`${this.apiUrl}/${issueId}/labels/${labelId}`); }

    // --- Assignees ---
    addAssignee(issueId: number, userId: string): Observable<any> { return this.http.post<any>(`${this.apiUrl}/${issueId}/assignees`, { userId }); }
    removeAssignee(issueId: number, userId: string): Observable<any> { return this.http.delete<any>(`${this.apiUrl}/${issueId}/assignees/${userId}`); }

    // --- Milestones ---
    getMilestones(): Observable<Milestone[]> { return this.http.get<Milestone[]>(`${this.apiUrl}/milestones`); }
    createMilestone(title: string, description?: string, dueDate?: string): Observable<Milestone> { return this.http.post<Milestone>(`${this.apiUrl}/milestones`, { title, description, dueDate }); }

    // --- Reactions ---
    toggleReaction(commentId: number, emoji: string): Observable<any> { return this.http.post<any>(`${this.apiUrl}/comments/${commentId}/reactions`, { emoji }); }
    getReactions(commentId: number): Observable<any[]> { return this.http.get<any[]>(`${this.apiUrl}/comments/${commentId}/reactions`); }

    // --- Relations ---
    getRelations(id: number): Observable<any[]> { return this.http.get<any[]>(`${this.apiUrl}/${id}/relations`); }
    addRelation(id: number, targetIssueId: number, relationType: string): Observable<any> { return this.http.post<any>(`${this.apiUrl}/${id}/relations`, { targetIssueId, relationType }); }
    removeRelation(id: number, targetIssueId: number, relationType: string): Observable<any> { return this.http.delete<any>(`${this.apiUrl}/${id}/relations/${targetIssueId}/${relationType}`); }

    // --- Activities ---
    getActivities(id: number): Observable<any[]> { return this.http.get<any[]>(`${this.apiUrl}/${id}/activities`); }

    // --- Comment Quality Toggles ---
    toggleHelpful(commentId: number): Observable<any> { return this.http.post<any>(`${environment.apiBaseUrl}/comments/${commentId}/helpful`, {}); }
    toggleRootCause(commentId: number): Observable<any> { return this.http.post<any>(`${environment.apiBaseUrl}/comments/${commentId}/root-cause`, {}); }
    toggleReproConfirmed(commentId: number): Observable<any> { return this.http.post<any>(`${environment.apiBaseUrl}/comments/${commentId}/repro-confirmed`, {}); }

    // --- Attachments ---
    uploadAttachment(issueId: number, file: File): Observable<any> {
        const formData = new FormData();
        formData.append('file', file);
        return this.http.post<any>(`${this.apiUrl}/${issueId}/attachments`, formData);
    }
    getAttachments(issueId: number): Observable<any[]> { return this.http.get<any[]>(`${this.apiUrl}/${issueId}/attachments`); }

    // --- Gamification & Analytics ---
    private gamificationUrl = `${environment.apiBaseUrl}/gamification`;
    getLeaderboard(): Observable<any[]> { return this.http.get<any[]>(`${this.gamificationUrl}/leaderboard`); }
    getAnalytics(): Observable<any> { return this.http.get<any>(`${this.apiUrl}/analytics`); }
    getAllBadges(): Observable<any[]> { return this.http.get<any[]>(`${this.gamificationUrl}/badges`); }
    getMyGamificationProfile(): Observable<any> { return this.http.get<any>(`${this.gamificationUrl}/profile`); }
}
