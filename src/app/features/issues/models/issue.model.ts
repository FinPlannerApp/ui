export interface Issue {
    id: number;
    title: string;
    description: string;
    status: string;
    type: string; // Bug, Feature, Question
    isClosed: boolean;
    closedAt?: string;
    closedByName?: string;
    painScore: number;
    categoryName: string;
    subcategoryName: string;
    severity?: string;
    frequency?: string;
    impactsMoney?: boolean;
    financialImpactAmount?: number;
    createdAt: string;
    updatedAt?: string;
    votes: number;
    commentCount: number;
    creatorId?: string;
    creatorName?: string;
    userVote: number;
    labels?: IssueLabel[];
    assignees?: Assignee[];
    milestoneId?: number;
    milestoneTitle?: string;
    gitHubIssueUrl?: string;
    acknowledgedAt?: string;
    resolvedAt?: string;
    attachments?: IssueAttachment[];
}

export interface IssueAttachment {
    id: number;
    fileName: string;
    filePath: string;
    contentType: string;
    fileSizeBytes: number;
    uploadedByUserId: string;
    createdAt: string;
}

export interface IssueLabel {
    id: number;
    name: string;
    color: string;
    description?: string;
}

export interface Assignee {
    userId: string;
    displayName: string;
}

export interface Milestone {
    id: number;
    title: string;
    description?: string;
    dueDate?: string;
    isClosed: boolean;
    openCount: number;
    closedCount: number;
    progress: number;
}

export interface CreateIssueDto {
    title: string;
    description: string;
    type?: string;
    priority?: string;
    categoryId?: number;
    subcategoryId?: number;
    severity: string;
    impactsMoney: boolean;
    financialImpactAmount?: number;
    frequency: string;
    gitHubIssueUrl?: string;
    structuredExpecations?: string;
}

export interface IssueTaxonomy {
    id: number;
    name: string;
    type: string;
    parentId?: number;
    children?: IssueTaxonomy[];
}

export interface Comment {
    id: number;
    content: string;
    creatorUserId: string;
    creatorName: string;
    createdAt: string;
    updatedAt?: string;
    parentCommentId: number | null;
    score: number;
    userVote: number;
    isEdited?: boolean;
    replies?: Comment[];
    reactions?: ReactionGroup[];
}

export interface ReactionGroup {
    emoji: string;
    count: number;
    reacted: boolean;
}
