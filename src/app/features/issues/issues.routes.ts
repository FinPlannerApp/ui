import { Routes } from '@angular/router';
import { IssueSubmissionComponent } from './components/issue-submission.component';
import { IssueListComponent } from './components/issue-list.component';
import { IssueDetailComponent } from './components/issue-detail.component';
import { AnalyticsDashboardComponent } from './components/analytics-dashboard.component';
import { LeaderboardComponent } from './components/leaderboard.component';
import { RoadmapComponent } from './components/roadmap.component';
import { adminGuard } from '../../core/guards/admin-guard';

export const ISSUES_ROUTES: Routes = [
    {
        path: '',
        component: IssueListComponent,
        data: { title: 'Feedback Hub' }
    },
    {
        path: 'new',
        component: IssueSubmissionComponent,
        data: { title: 'Report / Request' }
    },
    {
        path: 'analytics',
        component: AnalyticsDashboardComponent,
        canActivate: [adminGuard],
        data: { title: 'Feedback Analytics' }
    },
    {
        path: 'leaderboard',
        component: LeaderboardComponent,
        data: { title: 'Community Leaderboard' }
    },
    {
        path: 'roadmap',
        component: RoadmapComponent,
        data: { title: 'Product Roadmap' }
    },
    {
        path: ':id',
        component: IssueDetailComponent,
        data: { title: 'Issue Detail' }
    },
];
