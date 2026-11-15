import { Routes } from '@angular/router';
import { publicGuard } from './core/guards/public-guard';
import { authGuard } from './core/guards/auth-guard';
import { adminGuard } from './core/guards/admin-guard';
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
      // Pricing page is intentionally hidden for now (component kept in features/public/pricing).
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
        path: 'accounts/overview',
        loadComponent: () => import('./features/accounts/accounts-overview/accounts-overview').then(m => m.AccountsOverview)
      },
      {
        path: 'accounts/interest',
        loadComponent: () => import('./features/accounts/interest-page/interest-page').then(m => m.InterestPage)
      },
      {
        path: 'accounts/what-if',
        loadComponent: () => import('./features/accounts/what-if/what-if').then(m => m.WhatIfPage)
      },
      {
        path: 'accounts/settings',
        loadComponent: () => import('./features/accounts/account-settings/account-settings').then(m => m.AccountSettingsPage)
      },
      {
        path: 'accounts/insights',
        loadComponent: () => import('./features/accounts/accounts-insights/accounts-insights').then(m => m.AccountsInsights)
      },
      {
        path: 'cards',
        loadComponent: () => import('./features/cards/cards').then(m => m.Cards)
      },
      {
        path: 'outlook',
        loadComponent: () => import('./features/forecast/forecast').then(m => m.Outlook)
      },
      {
        path: 'accounts/data-health',
        loadComponent: () => import('./features/accounts/data-health/data-health').then(m => m.DataHealth)
      },
      {
        path: 'accounts',
        loadComponent: () => import('./features/accounts/accounts-page/accounts-page').then(m => m.AccountsPage)
      },
      {
        path: 'accounts/:id/settings',
        loadComponent: () => import('./features/accounts/account-detail-settings/account-detail-settings').then(m => m.AccountDetailSettings)
      },
      {
        path: 'undo',
        loadComponent: () => import('./features/undo/undo-center').then(m => m.UndoCenter)
      },
      {
        path: 'tips',
        loadComponent: () => import('./features/tips/tips').then(m => m.Tips)
      },
      {
        path: 'accounts/:id/transactions',
        loadComponent: () => import('./features/transactions/transaction-list/transaction-list').then(m => m.TransactionList)
      },
      {
        path: 'investments',
        loadComponent: () => import('./features/investments/investments').then(m => m.Investments)
      },
      {
        path: 'obligations',
        loadComponent: () => import('./features/obligations/obligations').then(m => m.Obligations)
      },
      {
        path: 'insurance',
        loadComponent: () => import('./features/insurance/insurance').then(m => m.Insurance)
      },
      {
        path: 'statement-import',
        loadComponent: () => import('./features/transactions/statement-import/statement-import').then(m => m.StatementImport)
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
          backLinkPath: '/app/dashboard',
          backLinkLabel: 'Back to Dashboard',
          formConfig: { endpoint: 'AccountCategories' },
          loadFormComponent: () => import('./features/categories/category-form/category-form').then(m => m.CategoryForm)
        }
      },
      {
        path: 'transaction-categories',
        loadComponent: () => import('./features/categories/category-manager/category-manager').then(m => m.CategoryManager)
      },
      {
        path: 'transactions/overview',
        loadComponent: () => import('./features/transactions/transactions-overview/transactions-overview').then(m => m.TransactionsOverview)
      },
      {
        path: 'quick-add',
        loadComponent: () => import('./features/transactions/quick-add-route/quick-add-route').then(m => m.QuickAddRoute)
      },
      {
        path: 'transactions/rules',
        loadComponent: () => import('./features/transactions/transaction-rules/transaction-rules').then(m => m.TransactionRulesPage)
      },
      {
        path: 'transactions/settings',
        loadComponent: () => import('./features/transactions/transaction-settings/transaction-settings').then(m => m.TransactionSettingsPage)
      },
      {
        path: 'transactions',
        loadComponent: () => import('./features/transactions/transactions-page/transactions-page').then(m => m.TransactionsPage)
      },
      {
        path: 'reports',
        loadComponent: () => import('./features/reports/reports').then(m => m.Reports)
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard/dashboard').then(m => m.Dashboard)
      },
      {
        // /app/budgets → live dashboard; /manage → the list + add/edit form; /settings → alert levels
        path: 'budgets',
        loadComponent: () => import('./features/budgets/budgets-hub/budgets-hub').then(m => m.BudgetsHub),
        children: [
          {
            path: '',
            pathMatch: 'full',
            loadComponent: () => import('./features/budgets/budgets-dashboard/budgets-dashboard').then(m => m.BudgetsDashboard)
          },
          {
            path: 'manage',
            loadComponent: () => import('./features/shared/resource-page/resource-page').then(m => m.ResourcePage),
            data: {
              title: 'Manage Budgets',
              endpoint: 'Budgets',
              columns: budgetColumns,
              backLinkPath: '/app/budgets',
              backLinkLabel: 'Back to Budgets',
              loadFormComponent: () => import('./features/budgets/budget-form/budget-form').then(m => m.BudgetForm)
            }
          },
          {
            path: 'settings',
            loadComponent: () => import('./features/budgets/budget-settings/budget-settings').then(m => m.BudgetSettingsPage)
          }
        ]
      },
      {
        path: 'recurring-transactions/overview',
        loadComponent: () => import('./features/recurring-transactions/recurring-overview/recurring-overview').then(m => m.RecurringOverview)
      },
      {
        path: 'recurring-transactions/settings',
        loadComponent: () => import('./features/recurring-transactions/recurring-settings/recurring-settings').then(m => m.RecurringSettingsPage)
      },
      {
        path: 'recurring-transactions',
        loadComponent: () => import('./features/shared/resource-page/resource-page').then(m => m.ResourcePage),
        data: {
          title: 'Recurring Transactions',
          endpoint: 'RecurringTransactions',
          columns: recurringTransactionColumns,
          backLinkPath: '/app/dashboard',
          backLinkLabel: 'Back to Dashboard',
          loadFormComponent: () => import('./features/recurring-transactions/recurring-transaction-form/recurring-transaction-form').then(m => m.RecurringTransactionForm)
        }
      },
      {
        path: 'subscriptions/overview',
        loadComponent: () => import('./features/subscriptions/subscriptions-overview/subscriptions-overview').then(m => m.SubscriptionsOverview)
      },
      {
        path: 'subscriptions/settings',
        loadComponent: () => import('./features/subscriptions/subscription-settings/subscription-settings').then(m => m.SubscriptionSettingsPage)
      },
      {
        path: 'subscriptions',
        loadComponent: () => import('./features/subscriptions/subscriptions/subscriptions').then(m => m.Subscriptions)
      },
      {
        path: 'settings',
        loadComponent: () => import('./features/settings/settings/settings').then(m => m.Settings)
      },
      {
        path: 'challenge',
        loadComponent: () => import('./features/challenge/challenge').then(m => m.Challenge)
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
      {
        path: 'merge-duplicates',
        loadComponent: () => import('./features/merge-duplicates/merge-duplicates').then(m => m.MergeDuplicates)
      },
      {
        path: 'decision-journal',
        loadComponent: () => import('./features/decision-journal/decision-journal').then(m => m.DecisionJournal)
      },
      {
        path: 'merchants',
        loadComponent: () => import('./features/merchants/merchants/merchants').then(m => m.Merchants)
      },
      {
        path: 'cashback-wallets',
        loadComponent: () => import('./features/cashback-wallets/cashback-wallets').then(m => m.CashbackWallets)
      },
      {
        path: 'merchants/spending',
        loadComponent: () => import('./features/merchants/merchant-spending/merchant-spending').then(m => m.MerchantSpendingPage)
      },
      {
        path: 'goals',
        loadComponent: () => import('./features/goals/goals/goals').then(m => m.Goals)
      },
      {
        path: 'split',
        loadComponent: () => import('./features/split/split-groups/split-groups').then(m => m.SplitGroups)
      },
      {
        path: 'split/friends',
        loadComponent: () => import('./features/split/split-friends/split-friends').then(m => m.SplitFriends)
      },
      {
        path: 'split/:id',
        loadComponent: () => import('./features/split/split-group-detail/split-group-detail').then(m => m.SplitGroupDetail)
      },
      {
        path: 'admin/blog-editor',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/admin/blog-editor/blog-editor').then(m => m.BlogEditor)
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },

  {
    path: 'split/public/:token',
    loadComponent: () => import('./features/split/split-public-view/split-public-view').then(m => m.SplitPublicView)
  },

  {
    path: 'split/join/:token',
    loadComponent: () => import('./features/split/split-invite-landing/split-invite-landing').then(m => m.SplitInviteLanding)
  },

  { path: '**', redirectTo: '', pathMatch: 'full' }
];

