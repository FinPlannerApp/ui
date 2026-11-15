import { ModuleTab } from '../../shared/components/module-tabs/module-tabs';

export const TRANSACTIONS_TABS: ModuleTab[] = [
  { path: '/app/transactions', label: 'All transactions', icon: 'pi pi-list' },
  { path: '/app/transactions/overview', label: 'Overview', icon: 'pi pi-chart-bar' },
  { path: '/app/transactions/rules', label: 'Rules', icon: 'pi pi-bolt' },
  { path: '/app/transactions/settings', label: 'Settings', icon: 'pi pi-sliders-h' }
];
