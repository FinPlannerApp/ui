import { ModuleTab } from '../../shared/components/module-tabs/module-tabs';

export const ACCOUNTS_TABS: ModuleTab[] = [
  { path: '/app/accounts', label: 'Accounts', icon: 'pi pi-wallet' },
  { path: '/app/accounts/overview', label: 'Overview', icon: 'pi pi-chart-pie' },
  { path: '/app/account-categories', label: 'Categories', icon: 'pi pi-tags' },
  { path: '/app/accounts/insights', label: 'Insights', icon: 'pi pi-chart-line' },
  { path: '/app/accounts/what-if', label: 'What-ifs', icon: 'pi pi-calculator' },
  { path: '/app/accounts/settings', label: 'Settings', icon: 'pi pi-sliders-h' }
];
