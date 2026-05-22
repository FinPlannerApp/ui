import { Routes } from '@angular/router';
import { publicGuard } from './core/guards/public-guard';
import { authGuard } from './core/guards/auth-guard';
import { ColumnDefinition } from './shared/components/data-table/data-table';

// --- Column Definitions (kept static — they are tiny plain objects, not components) ---
const accountColumns: ColumnDefinition[] = [
  { field: 'name', header: 'Name', isLink: true, linkPath: '/app/accounts/:id/transactions', sortable: true },
  { field: 'accountCategoryName', header: 'Category', sortable: true },
  { field: 'balance', header: 'Balance', isCurrency: true, sortable: true },
];
const categoryColumns: ColumnDefinition[] = [
  { field: 'name', header: 'Name', sortable: true }
];

const budgetColumns: ColumnDefinition[] = [
  { field: 'categoryName', header: 'Category', sortable: true },
  { field: 'amount', header: 'Amount', isCurrency: true, sortable: true },
  { field: 'period', header: 'Period', sortable: true },
  { field: 'startDate', header: 'Start Date', isDate: true, sortable: true },
];

const recurringTransactionColumns: ColumnDefinition[] = [
  { field: 'description', header: 'Description', sortable: true },
  { field: 'accountName', header: 'Account', sortable: true },
  { field: 'amount', header: 'Amount', isCurrency: true, sortable: true },
  { field: 'frequency', header: 'Frequency', sortable: true },
  { field: 'nextProcessDate', header: 'Next Process', isDate: true, sortable: true },
];

// --- Lazily Loaded Application Routes ---
export const routes: Routes = [

  // Auth pages — loaded lazily, no layout shell
  {
    path: 'login',
    canActivate: [publicGuard],
    loadComponent: () => import('./features/login/login').then(m => m.Login)
  },
  {
    path: 'register',
    canActivate: [publicGuard],
    loadComponent: () => import('./features/register/register').then(m => m.Register)
  },
  {
    path: 'forgot-password',
    canActivate: [publicGuard],
    loadComponent: () => import('./features/auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent)
  },
  {
    path: 'reset-password',
    loadComponent: () => import('./features/auth/reset-password/reset-password.component').then(m => m.ResetPasswordComponent)
  },

  // Public pages — PublicLayout shell loaded lazily, children also lazy
  {
    path: '',
    loadComponent: () => import('./core/layout/public-layout/public-layout').then(m => m.PublicLayout),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./features/public/home/home').then(m => m.Home)
      },
      {
        path: 'features',
        loadComponent: () => import('./features/public/features/features').then(m => m.Features)
      },
      {
        path: 'about',
        loadComponent: () => import('./features/public/about/about').then(m => m.About)
      },
      {
        path: 'blog',
        loadComponent: () => import('./features/public/blog/blog').then(m => m.Blog)
      },
      {
        path: 'blog/:id',
        loadComponent: () => import('./features/public/blog-post/blog-post').then(m => m.BlogPost)
      },
      {
        path: 'contact',
        loadComponent: () => import('./features/public/contact/contact').then(m => m.Contact)
      },
      {
        path: 'feedback',
        loadChildren: () => import('./features/issues/issues.routes').then(m => m.ISSUES_ROUTES)
      },
    ]
  },

  // Authenticated pages — Layout shell lazy, every child feature also lazy
  {
    path: 'app',
    canActivate: [authGuard],
    loadComponent: () => import('./core/layout/layout/layout').then(m => m.Layout),
    children: [
      {
        path: 'accounts',
        loadComponent: () => import('./features/shared/resource-page/resource-page').then(m => m.ResourcePage),
        data: {
          title: 'Accounts',
          endpoint: 'Accounts',
          columns: accountColumns,
          backLinkPath: '/app/dashboard',
          backLinkLabel: 'Back to Dashboard',
          loadFormComponent: () => import('./features/accounts/account-form/account-form').then(m => m.AccountForm)
        }
      },
      {
        path: 'accounts/:id/transactions',
        loadComponent: () => import('./features/transactions/transaction-list/transaction-list').then(m => m.TransactionList)
      },
      {
        path: 'bulk-transaction-add',
        loadComponent: () => import('./features/transactions/bulk-transaction-add/bulk-transaction-add').then(m => m.BulkTransactionAdd)
      },
      {
        path: 'account-categories',
        loadComponent: () => import('./features/shared/resource-page/resource-page').then(m => m.ResourcePage),
        data: {
          title: 'Account Categories',
          endpoint: 'AccountCategories',
          columns: categoryColumns,
          formConfig: { endpoint: 'AccountCategories' },
          loadFormComponent: () => import('./features/categories/category-form/category-form').then(m => m.CategoryForm)
        }
      },
      {
        path: 'transaction-categories',
        loadComponent: () => import('./features/shared/resource-page/resource-page').then(m => m.ResourcePage),
        data: {
          title: 'Transaction Categories',
          endpoint: 'TransactionCategories',
          columns: categoryColumns,
          formConfig: { endpoint: 'TransactionCategories' },
          loadFormComponent: () => import('./features/categories/category-form/category-form').then(m => m.CategoryForm)
        }
      },
      {
        path: 'transactions',
        loadComponent: () => import('./features/transactions/transactions-page/transactions-page').then(m => m.TransactionsPage)
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard/dashboard').then(m => m.Dashboard)
      },
      {
        path: 'budgets',
        loadComponent: () => import('./features/shared/resource-page/resource-page').then(m => m.ResourcePage),
        data: {
          title: 'Budgets',
          endpoint: 'Budgets',
          columns: budgetColumns,
          loadFormComponent: () => import('./features/budgets/budget-form/budget-form').then(m => m.BudgetForm)
        }
      },
      {
        path: 'recurring-transactions',
        loadComponent: () => import('./features/shared/resource-page/resource-page').then(m => m.ResourcePage),
        data: {
          title: 'Recurring Transactions',
          endpoint: 'RecurringTransactions',
          columns: recurringTransactionColumns,
          loadFormComponent: () => import('./features/recurring-transactions/recurring-transaction-form/recurring-transaction-form').then(m => m.RecurringTransactionForm)
        }
      },
      {
        path: 'support',
        loadComponent: () => import('./features/support/support').then(m => m.Support)
      },
      {
        path: 'settings',
        loadComponent: () => import('./features/settings/settings/settings').then(m => m.Settings)
      },
      {
        path: 'change-password',
        loadComponent: () => import('./features/auth/change-password/change-password.component').then(m => m.ChangePasswordComponent)
      },
      {
        path: 'issues',
        loadChildren: () => import('./features/issues/issues.routes').then(m => m.ISSUES_ROUTES)
      },
      // {
      //   path: 'about',
      //   component: About
      // },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },

  { path: '**', redirectTo: '', pathMatch: 'full' }
];

