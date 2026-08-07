import { ChangeDetectionStrategy, Component, ContentChild, EventEmitter, Input, Output, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TableModule } from 'primeng/table';
import { SkeletonModule } from 'primeng/skeleton';

export interface ColumnDefinition {
  field: string;
  header: string;
  isCurrency?: boolean;
  isDate?: boolean; // For date formatting
  isTransaction?: boolean; // For coloring income/expense
  isLink?: boolean; // To make the cell a link
  linkPath?: string; // e.g., 'accounts' or 'transactions'
  sortable?: boolean; // Whether the column can be sorted
}

@Component({
  selector: 'app-data-table',
  imports: [CommonModule, TableModule, RouterLink, SkeletonModule],
  standalone: true,
  templateUrl: './data-table.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DataTable {
  @Input() data: any[] | null = [];
  @Input() columns: ColumnDefinition[] | null | undefined = [];
  @Input() loading: boolean | null = false;
  @Input() lazy: boolean = false;
  @Input() totalRecords: number | null = 0;
  @Input() rows: number = 10;
  @Output() onLazyLoad = new EventEmitter<any>();
  @ContentChild('actions') actionsTemplate!: TemplateRef<any>;

  constructLink(path: string, item: any): string[] {
    const replacedPath = path.replace(':id', item.id);
    const segments = replacedPath.split('/');
    const cleanSegments = segments.filter(p => p.length > 0);
    return ['/', ...cleanSegments];
  }
}
