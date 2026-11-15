import { ModuleTab } from '../../shared/components/module-tabs/module-tabs';

export const RECURRING_TABS: ModuleTab[] = [
  { path: '/app/recurring-transactions', label: 'Manage', icon: 'pi pi-list' },
  { path: '/app/recurring-transactions/overview', label: 'Overview', icon: 'pi pi-calendar' },
  { path: '/app/recurring-transactions/settings', label: 'Settings', icon: 'pi pi-sliders-h' }
];
