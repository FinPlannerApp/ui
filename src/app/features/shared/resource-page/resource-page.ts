import { Component, inject, Input, OnInit, Type, ChangeDetectionStrategy, ChangeDetectorRef, signal } from '@angular/core';
import { ConfirmationService } from 'primeng/api';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { GenericCrud } from '../../../core/services/generic-crud';
import { ColumnDefinition, DataTable } from '../../../shared/components/data-table/data-table';
import { firstValueFrom } from 'rxjs';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NotificationService } from '../../../core/services/notification.service';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { BreadcrumbService } from '../../../core/layout/breadcrumb.service';
import { SelectModule } from 'primeng/select';
import { GenericApi } from '../../../core/services/generic-api';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-resource-page',
  imports: [CommonModule, FormsModule, InputTextModule, CardModule, ButtonModule, TableModule, DataTable, ProgressSpinnerModule, ConfirmDialogModule, ToastModule, RouterLink, SelectModule, IconFieldModule, InputIconModule, TooltipModule],
  templateUrl: './resource-page.html',
  providers: [DialogService, ConfirmationService, GenericCrud],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResourcePage<T extends { id: number }> implements OnInit {
  // Use modern inject() for cleaner code
  public crudService = inject(GenericCrud<T>);
  private dialogService = inject(DialogService);
  private confirmationService = inject(ConfirmationService);
  private notificationService = inject(NotificationService); // Injected wrapper
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);
  private breadcrumbService = inject(BreadcrumbService);
  private apiService = inject(GenericApi);

  // Filters (Using Signals)
  searchTerm = signal<string>('');
  selectedCategoryId = signal<number | null>(null);
  categories = signal<any[]>([]);
  showCategoryFilter = signal<boolean>(false);

  @Input() title: string = '';
  @Input() backLinkPath?: string;
  @Input() backLinkLabel?: string;
  @Input({ required: true }) endpoint!: string;
  @Input({ required: true }) columns!: ColumnDefinition[];
  @Input({ required: true }) formComponent!: Type<any>;

  get singularTitle(): string {
    if (!this.title) return '';
    if (this.title.endsWith('Categories')) {
      return this.title.slice(0, -10) + 'Category';
    }
    if (this.title.endsWith('s')) {
      return this.title.slice(0, -1);
    }
    return this.title;
  }

  // --- OBSERVABLES FOR THE TEMPLATE ---
  items$ = this.crudService.items$;
  isLoading$ = this.crudService.isLoading$;

  ref: DynamicDialogRef | null = null;
  ready = false;
  lastLazyLoadEvent: any;
  
  async ngOnInit(): Promise<void> {
    const routeData = await firstValueFrom(this.route.data);
    const params = await firstValueFrom(this.route.paramMap);

    this.title = routeData['title'];
    this.columns = routeData['columns'];
    this.backLinkPath = routeData['backLinkPath'];
    this.backLinkLabel = routeData['backLinkLabel'];

    // Support lazy loadFormComponent (new) or static formComponent (legacy)
    if (typeof routeData['loadFormComponent'] === 'function') {
      this.formComponent = await routeData['loadFormComponent']();
    } else {
      this.formComponent = routeData['formComponent'];
    }

    let endpoint = routeData['endpoint'];
    if (params.has('id')) {
      endpoint = endpoint.replace(':id', params.get('id')!);
    }
    this.endpoint = endpoint;

    // Show category filter only for Accounts
    if (this.title === 'Accounts') {
      this.showCategoryFilter.set(true);
      this.fetchCategories();
    }

    // Set Breadcrumbs
    this.breadcrumbService.setItems([
      { label: this.title }
    ]);

    // Handle Soft Reset
    this.breadcrumbService.refresh$.subscribe(() => {
      this.refreshData();
    });

    this.ready = true;
    this.cdr.markForCheck();
  }

  async fetchCategories() {
    const response = await firstValueFrom(this.apiService.get<any[]>('AccountCategories'));
    if (response.isSuccess && response.value) {
      this.categories.set(response.value);
    }
  }

  refreshData() {
    this.onLazyLoad({
      first: 0,
      rows: this.lastLazyLoadEvent?.rows || 10,
      sortField: this.lastLazyLoadEvent?.sortField,
      sortOrder: this.lastLazyLoadEvent?.sortOrder
    });
  }

  onSearch(): void {
    this.refreshData();
  }

  clearSearch(): void {
    this.searchTerm.set('');
    this.refreshData();
  }

  onLazyLoad(event: any): void {
    this.lastLazyLoadEvent = event;
    if (!this.endpoint) return; // Guard against early calls

    const pageNumber = event.first / event.rows + 1;
    const pageSize = event.rows;
    const sortBy = event.sortField;
    const sortOrder = event.sortOrder === 1 ? 'asc' : 'desc';

    this.crudService.search(this.endpoint, {
      pageNumber,
      pageSize,
      sortBy,
      sortOrder,
      globalSearch: this.searchTerm(),
      accountCategoryId: this.selectedCategoryId()
    });
  }

  onFilterChange() {
    this.refreshData();
  }

  async showForm(itemToEdit?: T): Promise<void> {
    const isEditMode = !!itemToEdit;
    this.ref = this.dialogService.open(this.formComponent, {
      header: `${isEditMode ? 'Edit' : 'New'} ${this.singularTitle}`,
      width: '450px',
      modal: true,
      closable: true,
      closeOnEscape: true,
      dismissableMask: false,
      data: {
        itemToEdit: itemToEdit,
        endpoint: this.endpoint
      }
    });

    if (this.ref) {
      const result = await firstValueFrom(this.ref.onClose);
      if (result === true) {
        // Reload list as the form has modified the data
        this.crudService.search(this.endpoint, { pageNumber: 1, pageSize: 10 });
      }
    }
  }

  deleteItem(item: T): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete this item?`,
      header: 'Delete Confirmation',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        // The service now handles the delete logic
        this.crudService.delete(this.endpoint, item)
          .then(() => this.notificationService.showSuccess('Item deleted'))
          .catch(err => this.notificationService.showError(err.message || 'Operation failed'));
      }
    });
  }
}
