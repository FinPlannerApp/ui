import { Component, computed, ElementRef, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService, ConfirmationService } from 'primeng/api';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DatePickerModule } from 'primeng/datepicker';
import { DialogModule } from 'primeng/dialog';
import { Transaction, TransactionService } from '../transaction';
import { TransactionType } from '../../../core/models/transaction-type';
import { CategoryForm } from '../../categories/category-form/category-form';
import { AccountForm } from '../../accounts/account-form/account-form';
import { Account } from '../../accounts/account';
import { toDateOnlyString } from '../../../core/utils/date-utils';
import { Observable } from 'rxjs';
import { GenericApi, PaginatedResult } from '../../../core/services/generic-api';
import { sharedPrimeModules } from '../../../shared/prime-imports';
import * as XLSX from 'xlsx';

interface BulkTransactionRow {
    index: number;
    date: Date;
    accountId: any | null;
    transactionCategoryId: any | null;
    destinationAccountId: any | null;
    description: string;
    type: TransactionType;
    amount: number | null;
    status: 'empty' | 'valid' | 'invalid' | 'saving' | 'error';
    errorMessage?: string;
    isDeleted: boolean;
}

@Component({
    selector: 'app-bulk-transaction-add',
    imports: [
        CommonModule,
        FormsModule,
        ...sharedPrimeModules
    ],
    templateUrl: './bulk-transaction-add.html',
      providers: [DialogService]
})
export class BulkTransactionAdd {
    private transactionService = inject(TransactionService);
    private messageService = inject(MessageService);
    private apiService = inject(GenericApi);
    private dialogService = inject(DialogService);
    private confirmationService = inject(ConfirmationService);
    private router = inject(Router);

    rows = signal<BulkTransactionRow[]>([]);
    viewMode = signal<'grid' | 'card'>('grid');
    
    transactionTypes = [
        { label: 'Expense', value: TransactionType.Expense },
        { label: 'Income', value: TransactionType.Income }
    ];

    accounts = signal<any[]>([]);
    categories = signal<any[]>([]);

    filteredAccounts = signal<any[]>([]);
    filteredCategories = signal<any[]>([]);

    showAccountModal = signal(false);
    activeRowIndex = signal<number | null>(null);

    isSaving = signal(false);

    showImportSummary = signal(false);
    importSummaryData = signal({ total: 0, valid: 0, invalid: 0 });

    batchAccount = signal<any>(null);
    batchCategory = signal<any>(null);

    constructor() {
        this.loadInitialData();
        this.addEmptyRow();
    }

    loadInitialData() {
        // Load active accounts
        this.apiService.search<any>('Accounts', { pageSize: 1000 }).subscribe({
            next: (res) => {
                this.accounts.set(res.value?.data || []);
                this.reEvaluateRows();
            },
            error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load accounts.' })
        });

        // Load active categories
        this.apiService.search<any>('TransactionCategories', { pageSize: 1000 }).subscribe({
            next: (res) => {
                this.categories.set(res.value?.data || []);
                this.reEvaluateRows();
            },
            error: () => this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load categories.' })
        });
    }

    reEvaluateRows() {
        if (!this.rows()) return;
        this.rows.update(current => {
            current.forEach(r => {
                if (!r.isDeleted) {
                    this.onRowChange(r); // Re-run validation mapping
                }
            });
            return [...current];
        });
    }

    addEmptyRow() {
        const defaultDate = new Date();
        this.rows.update(current => [
            ...current,
            {
                index: current.length,
                date: defaultDate,
                accountId: null,
                transactionCategoryId: null,
                destinationAccountId: null,
                description: '',
                type: TransactionType.Expense,
                amount: null,
                status: 'empty',
                isDeleted: false
            }
        ]);
    }

    get activeRows() {
        return this.rows().filter(r => !r.isDeleted);
    }

    validRowsCount = computed(() => {
        return this.activeRows.filter(r => this.isValid(r)).length;
    });

    invalidRowsCount = computed(() => {
        return this.activeRows.filter(r => !this.isValid(r) && (r.amount !== null || (r.description && r.description.trim() !== '') || r.accountId !== null)).length;
    });

    totalRowsCount = computed(() => {
        return this.activeRows.length;
    });

    totalIncome = computed(() => {
        return this.activeRows
            .filter(r => r.type === TransactionType.Income)
            .reduce((sum, row) => sum + (row.amount || 0), 0);
    });

    totalExpenses = computed(() => {
        return this.activeRows
            .filter(r => r.type === TransactionType.Expense)
            .reduce((sum, row) => sum + (row.amount || 0), 0);
    });

    netAmount = computed(() => {
        return this.totalIncome() - this.totalExpenses();
    });

    duplicateRow(index: number) {
        this.rows.update(current => {
            const targetIdx = current.findIndex(r => r.index === index);
            if (targetIdx !== -1) {
                const target = current[targetIdx];
                const cloned: BulkTransactionRow = {
                    index: current.length,
                    date: new Date(target.date),
                    accountId: target.accountId,
                    transactionCategoryId: target.transactionCategoryId,
                    destinationAccountId: target.destinationAccountId,
                    description: target.description ? `${target.description} (Copy)` : '',
                    type: target.type,
                    amount: target.amount,
                    status: 'invalid',
                    isDeleted: false
                };
                cloned.status = this.isValid(cloned) ? 'valid' : 'invalid';
                current.splice(targetIdx + 1, 0, cloned);
            }
            return [...current];
        });
        this.messageService.add({ severity: 'info', summary: 'Row Duplicated', detail: 'Created copy of selected transaction row.' });
    }

    addMultipleRows(count: number = 5) {
        for (let i = 0; i < count; i++) {
            this.addEmptyRow();
        }
        this.messageService.add({ severity: 'info', summary: 'Rows Added', detail: `Added ${count} new spreadsheet rows.` });
    }

    clearInvalidRows() {
        this.rows.update(current => {
            current.forEach(r => {
                if (!r.isDeleted && !this.isValid(r)) {
                    r.isDeleted = true;
                }
            });
            return [...current];
        });
        if (this.activeRows.length === 0) {
            this.addEmptyRow();
        }
        this.messageService.add({ severity: 'info', summary: 'Grid Cleaned', detail: 'Removed all incomplete and unpopulated rows.' });
    }

    applyBatchAccount(account: any) {
        if (!account) return;
        this.rows.update(current => {
            current.forEach(r => {
                if (!r.isDeleted && (!r.accountId || typeof r.accountId === 'string')) {
                    r.accountId = account;
                    r.status = this.isValid(r) ? 'valid' : 'invalid';
                }
            });
            return [...current];
        });
        this.messageService.add({ severity: 'info', summary: 'Batch Account Applied', detail: `Assigned ${account.name} to unassigned rows.` });
    }

    applyBatchCategory(category: any) {
        if (!category) return;
        this.rows.update(current => {
            current.forEach(r => {
                if (!r.isDeleted && (!r.transactionCategoryId || typeof r.transactionCategoryId === 'string')) {
                    r.transactionCategoryId = category;
                    r.status = this.isValid(r) ? 'valid' : 'invalid';
                }
            });
            return [...current];
        });
        this.messageService.add({ severity: 'info', summary: 'Batch Category Applied', detail: `Assigned ${category.name} to unassigned rows.` });
    }

    resolveStringsToObject(row: BulkTransactionRow) {
        if (typeof row.accountId === 'string' && row.accountId.trim().length > 0) {
            const query = (row.accountId as string).trim().toLowerCase();
            const match = this.accounts().find(a => a.name.trim().toLowerCase() === query);
            if (match) row.accountId = match;
        }
        if (typeof row.transactionCategoryId === 'string' && row.transactionCategoryId.trim().length > 0) {
            let query = (row.transactionCategoryId as string).trim();
            // Capitalize first letter
            query = query.charAt(0).toUpperCase() + query.slice(1);
            const match = this.categories().find(c => c.name.trim().toLowerCase() === query.toLowerCase());
            if (match) row.transactionCategoryId = match;
            else row.transactionCategoryId = query; // Keep as string for now, will be created on save
        }
        if (typeof row.destinationAccountId === 'string' && row.destinationAccountId.trim().length > 0) {
            const query = (row.destinationAccountId as string).trim().toLowerCase();
            const match = this.accounts().find(a => a.name.trim().toLowerCase() === query);
            if (match) row.destinationAccountId = match;
        }
    }

    onRowChange(row: BulkTransactionRow) {
        this.resolveStringsToObject(row);

        // Auto-detect type if amount is negative
        if (row.amount !== null && row.amount < 0) {
            row.amount = Math.abs(row.amount);
            // Flip type if it was default
            row.type = row.type === TransactionType.Expense ? TransactionType.Income : TransactionType.Expense;
        }

        // Validation check happens here
        row.status = this.isValid(row) ? 'valid' : 'invalid';

        // Check if the last row is no longer empty, add a new one
        const active = this.activeRows;
        const lastRow = active[active.length - 1];
        if (lastRow && (lastRow.amount !== null || (lastRow.description && lastRow.description.trim()) || lastRow.accountId)) {
            this.addEmptyRow();
        }

        // Force reactivity for totalAmount
        this.rows.update(r => [...r]);
    }

    cancel() {
        this.router.navigate(['/app/dashboard']);
    }

    isMissingItem(val: any): boolean {
        return typeof val === 'string' && val.trim().length > 0;
    }

    isTransferCategory(categoryObj: any): boolean {
        return categoryObj?.isTransferCategory === true;
    }

    isValid(row: BulkTransactionRow): boolean {
        if (row.status === 'empty' && !row.amount && !row.description && !row.accountId) return false;

        const hasValidAccount = !!(row.accountId && typeof row.accountId === 'object' && row.accountId.id);
        const hasValidCategory = !!(row.transactionCategoryId && typeof row.transactionCategoryId === 'object' && row.transactionCategoryId.id);

        const isTransfer = this.isTransferCategory(row.transactionCategoryId);
        const hasValidDest = isTransfer ? !!(row.destinationAccountId && typeof row.destinationAccountId === 'object' && row.destinationAccountId.id) : true;
        const hasValidType = isTransfer ? true : (row.type !== undefined && row.type !== null);

        const amountValue = row.amount !== null ? Math.abs(row.amount) : 0;
        return !!(row.date && hasValidAccount && hasValidCategory && amountValue > 0 && row.description && hasValidDest && hasValidType);
    }

    filterAccounts(event: any) {
        const query = event.query.toLowerCase();
        this.filteredAccounts.set(this.accounts().filter(a => a.name.toLowerCase().includes(query)));
    }

    filterCategories(event: any) {
        const query = event.query.toLowerCase();
        this.filteredCategories.set(this.categories().filter(c => c.name.toLowerCase().includes(query)));
    }

    deleteRow(index: number) {
        this.rows.update(current => {
            const idx = current.findIndex(r => r.index === index);
            if (idx !== -1) current[idx].isDeleted = true;
            return [...current];
        });

        // Ensure at least one empty row remains
        if (this.activeRows.length === 0) {
            this.addEmptyRow();
        }
    }

    openAccountModal(rowIndex: number, initialName?: any) {
        this.activeRowIndex.set(rowIndex);
        const nameToInject = typeof initialName === 'string' ? initialName.trim() : '';
        const ref = this.dialogService.open(AccountForm, {
            header: 'Add New Account',
            width: '460px',
            style: { maxWidth: '92vw' },
            data: { endpoint: 'Accounts', itemToEdit: nameToInject ? { name: nameToInject } : undefined }
        });

        if (ref) {
            ref.onClose.subscribe((result: any) => {
                if (result) {
                    // Assume true means it saved, refresh lists
                    this.onAccountCreated(result);
                }
            });
        }
    }

    openCategoryModal(rowIndex: number, initialName?: any) {
        this.activeRowIndex.set(rowIndex);
        const nameToInject = typeof initialName === 'string' ? initialName.trim() : '';
        const ref = this.dialogService.open(CategoryForm, {
            header: 'Add New Category',
            width: '460px',
            style: { maxWidth: '92vw' },
            data: { endpoint: 'TransactionCategories', itemToEdit: nameToInject ? { name: nameToInject } : undefined }
        });

        if (ref) {
            ref.onClose.subscribe((result: any) => {
                if (result) {
                    this.onCategoryCreated(result);
                }
            });
        }
    }

    onAccountCreated(saved: boolean) {
        this.loadInitialData(); // Refresh list to get real ID
        // Note: since we only get boolean `true` back right now per typical prime dialogs without returning the object,
        // auto-selecting the exact new account is tough without the new ID. Let's just refresh.
    }

    onCategoryCreated(result: any) {
        this.loadInitialData();

        // result is the real saved category — auto-select it back into
        // whichever row's "+" button triggered the modal, same as the
        // transaction form now does. Falls back to just refreshing the
        // list if an older dialog version still returns a bare boolean.
        if (result && typeof result === 'object' && result.id) {
            const idx = this.activeRowIndex();
            if (idx !== null && idx !== undefined) {
                const row = this.activeRows[idx];
                if (row) {
                    row.transactionCategoryId = result;
                    this.onRowChange(row);
                }
            }
        }
    }

    confirmSave(event: Event) {
        const validCount = this.activeRows.filter(r => this.isValid(r)).length;
        if (validCount === 0) {
            this.messageService.add({ severity: 'warn', summary: 'No valid rows', detail: 'Please enter at least one valid transaction.' });
            return;
        }

        this.confirmationService.confirm({
            message: `Are you sure you want to save ${validCount} valid transactions to the database?`,
            header: 'Confirm Save',
            icon: 'pi pi-exclamation-triangle',
            acceptLabel: 'Yes, Save',
            rejectLabel: 'Cancel',
            accept: () => {
                this.saveAll();
            }
        });
    }

    saveAll() {
        const validRowsToSave = this.activeRows.filter(r => this.isValid(r));

        if (validRowsToSave.length === 0) {
            this.messageService.add({ severity: 'warn', summary: 'No valid rows', detail: 'Please enter at least one valid transaction.' });
            this.isSaving.set(false);
            return;
        }

        this.isSaving.set(true);
        validRowsToSave.forEach(r => r.status = 'saving');

        const payload = {
            transactions: validRowsToSave.map(r => {
                const isTransfer = this.isTransferCategory(r.transactionCategoryId);
                return {
                    accountId: r.accountId?.id,
                    destinationAccountId: isTransfer ? r.destinationAccountId?.id : undefined,
                    transaction: {
                        description: r.description,
                        amount: r.amount,
                        date: toDateOnlyString(r.date)!,
                        type: isTransfer ? TransactionType.Expense : r.type,
                        transactionCategoryId: r.transactionCategoryId?.id
                    }
                };
            })
        };

        this.transactionService.bulkUpsertTransactions(payload).subscribe({
            next: (res) => {
                this.isSaving.set(false);
                const { successfulCount, failedCount, failedTransactions } = res;

                if (failedCount === 0) {
                    this.messageService.add({ severity: 'success', summary: 'Saved', detail: `Successfully saved ${successfulCount} transactions.` });
                    this.router.navigate(['/app/dashboard']);
                } else {
                    this.messageService.add({ severity: 'warn', summary: 'Partial Success', detail: `Saved ${successfulCount}, failed ${failedCount}. Please review highlighted rows.` });

                    this.rows.update(current => {
                        // Remove successful rows by marking deleted
                        validRowsToSave.forEach((validRow, validArrayIdx) => {
                            const failedInfo = failedTransactions.find((f: any) => f.index === validArrayIdx);
                            const realRow = current.find(cr => cr.index === validRow.index);

                            if (realRow) {
                                if (failedInfo) {
                                    realRow.status = 'error';
                                    realRow.errorMessage = failedInfo.errors.join(', ');
                                } else {
                                    realRow.isDeleted = true; // Was successful
                                }
                            }
                        });
                        return [...current];
                    });
                }
            },
            error: (err) => {
                this.isSaving.set(false);
                let detail = 'Bulk save failed entirely.';
                // Handle different error shapes (thrown ApiResult or standard HttpErrorResponse)
                if (err?.error?.description) {
                    detail = err.error.description;
                } else if (err?.error?.error?.description) {
                    detail = err.error.error.description;
                } else if (err?.message) {
                    detail = err.message;
                }

                this.messageService.add({ severity: 'error', summary: 'Error', detail });
                validRowsToSave.forEach(r => {
                    r.status = 'error';
                    r.errorMessage = detail;
                });
            }
        });

    }

    // --- Spreadsheet features (Paste, Keyboard Nav) ---

    onPaste(event: ClipboardEvent) {
        const clipboardData = event.clipboardData;
        const pastedText = clipboardData?.getData('text');
        if (!pastedText) return;

        // Optional: Stop default paste if we are taking over
        // event.preventDefault(); 

        // ... Parsing raw text handling can be complex, skipping full implementation for initial scaffolding
        // but the structure exists.
    }

    // --- Excel Template Import / Export ---

    async exportTemplate() {
        const ExcelJS = await import('exceljs');
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Transactions');

        // Add headers
        sheet.columns = [
            { header: 'Date (YYYY-MM-DD)', key: 'date', width: 15 },
            { header: 'Account', key: 'account', width: 25 },
            { header: 'Category', key: 'category', width: 25 },
            { header: 'Description', key: 'description', width: 30 },
            { header: 'Type', key: 'type', width: 15 },
            { header: 'Amount', key: 'amount', width: 15 },
            { header: 'Transfer To Account (Optional)', key: 'transferTo', width: 30 }
        ];

        // Format Date column
        sheet.getColumn('A').numFmt = 'yyyy-mm-dd';
        // Format Amount column
        sheet.getColumn('F').numFmt = '0.00';

        // Get array of names for dropdowns
        const accountNames = this.accounts().map(a => a.name) || ['None Available'];
        const categoryNames = this.categories().map(c => c.name) || ['None Available'];
        const typeNames = ['Expense', 'Income'];

        // Add 50 empty rows with data validations (dropdowns)
        for (let i = 2; i <= 51; i++) {
            // Add an empty row so we can style/validate it
            sheet.addRow({});

            // Account Dropdown (Column B)
            sheet.getCell(`B${i}`).dataValidation = {
                type: 'list',
                allowBlank: true,
                formulae: [`"${accountNames.join(',')}"`]
            };

            // Category Dropdown (Column C)
            sheet.getCell(`C${i}`).dataValidation = {
                type: 'list',
                allowBlank: true,
                formulae: [`"${categoryNames.join(',')}"`]
            };

            // Type Dropdown (Column E)
            sheet.getCell(`E${i}`).dataValidation = {
                type: 'list',
                allowBlank: true,
                formulae: [`"${typeNames.join(',')}"`]
            };

            // Transfer To Account Dropdown (Column G)
            sheet.getCell(`G${i}`).dataValidation = {
                type: 'list',
                allowBlank: true,
                formulae: [`"${accountNames.join(',')}"`]
            };
        }

        // Style headers
        sheet.getRow(1).font = { bold: true };

        // Generate and save
        const buffer = await workbook.xlsx.writeBuffer();
        this.saveAsExcelFile(buffer, 'BulkTransactionTemplate');
    }

    private saveAsExcelFile(buffer: any, fileName: string): void {
        const EXCEL_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';
        const EXCEL_EXTENSION = '.xlsx';
        const data: Blob = new Blob([buffer], { type: EXCEL_TYPE });

        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(data);
        link.download = fileName + '_export_' + new Date().getTime() + EXCEL_EXTENSION;
        link.click();
    }

    triggerFileInput() {
        // Find existing file input and remove it to ensure a fresh change event
        let oldInput = document.getElementById('excel-import-input');
        if (oldInput) {
            oldInput.remove();
        }

        const fileInput = document.createElement('input');
        fileInput.id = 'excel-import-input';
        fileInput.type = 'file';
        fileInput.accept = '.xlsx, .xls';
        fileInput.style.display = 'none';
        fileInput.onchange = (e) => this.importTemplate(e);
        document.body.appendChild(fileInput);

        fileInput.click();
    }

    async importTemplate(event: any) {
        const target: HTMLInputElement = event.target;
        if (!target.files || target.files.length !== 1) {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Cannot use multiple files or no file selected' });
            return;
        }

        const file = target.files[0];
        const ExcelJS = await import('exceljs');
        const workbook = new ExcelJS.Workbook();

        try {
            await workbook.xlsx.load(await file.arrayBuffer());
            const worksheet = workbook.worksheets[0];

            if (!worksheet) {
                this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Excel file is empty' });
                return;
            }

            const data: any[][] = [];
            worksheet.eachRow((row, rowNumber) => {
                // exceljs rows are 1-indexed for values.
                // We want to map standard 1D arrays for parsing consistency
                // Row values array includes empty 0th index, so we slice(1)
                const rowValues = row.values as any[];

                // Map complex cell values (like dates or formulae) to raw primitives if needed
                const cleanRow = rowValues.slice(1).map(cellVal => {
                    if (cellVal && typeof cellVal === 'object' && cellVal.result !== undefined) {
                        return cellVal.result;
                    }
                    if (cellVal && typeof cellVal === 'object' && cellVal.text !== undefined) {
                        return cellVal.text;
                    }
                    return cellVal; // normally primitive like string, number, or Date
                });
                data.push(cleanRow);
            });

            this.parseExcelData(data);
        } catch (e) {
            this.messageService.add({ severity: 'error', summary: 'Parse Error', detail: 'Failed to read the excel file format.' });
        } finally {
            event.target.value = ''; // Reset input
        }
    }

    parseExcelData(data: any[][]) {
        if (data.length <= 1) return; // Empty or just headers

        // Start from index 1 (skipping header row)
        const newRows: BulkTransactionRow[] = [];
        let startIndex = this.rows().length > 0 ? this.rows()[this.rows().length - 1].index + 1 : 0;

        for (let i = 1; i < data.length; i++) {
            const rowData = data[i];

            // Skip rows that are completely empty or have no meaningful data
            if (!rowData || rowData.length === 0 || rowData.every(val => val === null || val === undefined || val === '')) {
                continue;
            }

            // Expected columns:
            // 0: Date, 1: Account, 2: Category, 3: Description, 4: Type, 5: Amount, 6: Transfer To

            const dateVal = rowData[0];
            const accountStr = rowData[1]?.toString().trim();
            const categoryStr = rowData[2]?.toString().trim();
            const descStr = rowData[3]?.toString() || '';
            const typeStr = rowData[4]?.toString().trim().toLowerCase();
            const amountVal = parseFloat(rowData[5]);
            const transferToStr = rowData[6]?.toString().trim();

            let parsedDate = new Date();
            if (dateVal) {
                // xlsx might return excel serial dates or strings depending on format
                if (typeof dateVal === 'number') {
                    // Excel date serial
                    parsedDate = new Date(Math.round((dateVal - 25569) * 86400 * 1000));
                } else {
                    parsedDate = new Date(dateVal);
                }
            }

            // Find matching lookup objects
            const accountObj = accountStr ? this.accounts().find(a => a.name.trim().toLowerCase() === accountStr.toLowerCase()) : null;
            const categoryObj = categoryStr ? this.categories().find(c => c.name.trim().toLowerCase() === categoryStr.toLowerCase()) : null;
            const destAccountObj = transferToStr ? this.accounts().find(a => a.name.trim().toLowerCase() === transferToStr.toLowerCase()) : null;

            let rowType = TransactionType.Expense;
            if (typeStr === 'income') rowType = TransactionType.Income;

            const newRow: BulkTransactionRow = {
                index: startIndex++,
                date: isNaN(parsedDate.getTime()) ? new Date() : parsedDate,
                accountId: accountObj || accountStr || null,
                transactionCategoryId: categoryObj || categoryStr || null,
                destinationAccountId: destAccountObj || transferToStr || null,
                description: descStr,
                type: rowType,
                amount: isNaN(amountVal) ? null : amountVal,
                status: 'invalid', // default, re-evaluate below
                isDeleted: false
            };

            newRow.status = this.isValid(newRow) ? 'valid' : 'invalid';
            newRows.push(newRow);
        }

        // Add to existing rows, retaining empty row at bottom if needed
        this.rows.update(current => {
            const filtered = current.filter(r => r.status !== 'empty' || r.amount !== null || r.description !== '');
            return [...filtered, ...newRows];
        });

        const validCount = newRows.filter(r => r.status === 'valid').length;
        this.importSummaryData.set({
            total: newRows.length,
            valid: validCount,
            invalid: newRows.length - validCount
        });
        this.showImportSummary.set(true);
        this.addEmptyRow();
    }
}
