import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { IssueService } from '../services/issue.service';
import { Issue, IssueTaxonomy } from '../models/issue.model';
import { debounceTime, distinctUntilChanged, switchMap, filter } from 'rxjs/operators';
import { sharedPrimeModules } from '../../../shared/prime-imports';
import { TextareaModule } from 'primeng/textarea';
import { MessageModule } from 'primeng/message';
import { MessageService } from 'primeng/api';

import { RouterLink, Router } from '@angular/router';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { Auth } from '../../../core/services/auth';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
    selector: 'app-issue-submission',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, TextareaModule, MessageModule, RouterLink, DialogModule, ButtonModule, ...sharedPrimeModules],
    providers: [MessageService],
    templateUrl: './issue-submission.component.html'
})
export class IssueSubmissionComponent {
    private fb = inject(FormBuilder);
    private issueService = inject(IssueService);
    private messageService = inject(MessageService);
    private router = inject(Router);
    private auth = inject(Auth);
    private notificationService = inject(NotificationService);

    categories = signal<IssueTaxonomy[]>([]);
    subcategories = signal<IssueTaxonomy[]>([]);
    similarIssues = signal<Issue[]>([]);
    isSubmitting = signal(false);

    form = this.fb.group({
        title: ['', Validators.required],
        description: ['', Validators.required],
        type: ['Bug'],
        categoryId: [null as number | null], // Made optional since taxonomy might not be seeded
        subcategoryId: [null as number | null],
        severity: ['Minor', Validators.required],
        frequency: ['Rare', Validators.required],
        impactsMoney: [false],
        financialImpactAmount: [null as number | null],
        gitHubIssueUrl: ['']
    });

    constructor() {
        if (!this.auth.isLoggedIn()) {
            this.notificationService.showError('You must log in to submit a new issue.', 'Authentication Required');
            this.router.navigate(['/login']);
            return;
        }
        this.loadTaxonomy();
        this.setupSimilarityCheck();
    }

    loadTaxonomy() {
        this.issueService.getTaxonomies().subscribe(cats => {
            this.categories.set(Array.isArray(cats) ? cats : []);
        });
    }

    onCategoryChange() {
        const catId = this.form.get('categoryId')?.value;
        const cat = this.categories().find(c => c.id == catId);
        this.subcategories.set(cat?.children || []);
        this.form.patchValue({ subcategoryId: null });
    }

    setupSimilarityCheck() {
        this.form.get('title')?.valueChanges.pipe(
            debounceTime(500),
            distinctUntilChanged(),
            filter(term => (term?.length || 0) > 3),
            switchMap(term => this.issueService.checkSimilar(term || '', this.form.get('description')?.value || ''))
        ).subscribe(issues => {
            this.similarIssues.set(Array.isArray(issues) ? issues : []);
        });
    }

    onSubmit() {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            this.messageService.add({ severity: 'error', summary: 'Validation Error', detail: 'Please fill out all required fields.' });
            return;
        }
        
        this.isSubmitting.set(true);
        this.issueService.createIssue(this.form.value as any).subscribe({
            next: (id) => {
                this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Issue #' + id + ' created successfully!' });
                this.isSubmitting.set(false);
                this.form.reset({ severity: 'Minor', frequency: 'Rare', impactsMoney: false, type: 'Bug' });
                this.similarIssues.set([]);
                
                // Redirect back to list
                setTimeout(() => {
                    this.router.navigate(['/app/issues']);
                }, 1000);
            },
            error: () => {
                this.isSubmitting.set(false);
                this.messageService.add({ severity: 'error', summary: 'Submission Failed', detail: 'Failed to submit issue. Please try again.' });
            }
        });
    }

    // New Category logic similar to account form
    currentFilter = signal('');
    isNewCategory = signal(false);

    filterCategories(event: any) {
        const query = event.filter?.trim() || '';
        this.currentFilter.set(query);
        
        if (!query) {
            this.isNewCategory.set(false);
            return;
        }

        const exists = this.categories().some(c => c.name.toLowerCase() === query.toLowerCase());
        this.isNewCategory.set(!exists);
    }

    addNewCategory() {
        const name = this.currentFilter().trim();
        if (!name) return;

        this.issueService.createTaxonomy(name, null).subscribe(newTax => {
            this.categories.update(cats => [...cats, newTax]);
            this.form.patchValue({ categoryId: newTax.id });
            this.isNewCategory.set(false);
            this.currentFilter.set('');
            this.messageService.add({ severity: 'success', summary: 'Success', detail: `Category '${name}' created!` });
        });
    }

    // New Subcategory logic
    currentSubFilter = signal('');
    isNewSubcategory = signal(false);

    filterSubcategories(event: any) {
        const query = event.filter?.trim() || '';
        this.currentSubFilter.set(query);
        
        if (!query) {
            this.isNewSubcategory.set(false);
            return;
        }

        const exists = this.subcategories().some(c => c.name.toLowerCase() === query.toLowerCase());
        this.isNewSubcategory.set(!exists);
    }

    addNewSubcategory() {
        const name = this.currentSubFilter().trim();
        const parentId = this.form.get('categoryId')?.value;
        if (!name || !parentId) return;

        this.issueService.createTaxonomy(name, parentId).subscribe(newTax => {
            this.subcategories.update(cats => [...cats, newTax]);
            this.form.patchValue({ subcategoryId: newTax.id });
            this.isNewSubcategory.set(false);
            this.currentSubFilter.set('');
            this.messageService.add({ severity: 'success', summary: 'Success', detail: `Subcategory '${name}' created!` });
        });
    }
}
