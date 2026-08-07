import { Component } from '@angular/core';

@Component({
  selector: 'app-features',
  imports: [],
  templateUrl: './features.html',
})
export class Features {
  featureList = [
    { icon: 'pi pi-wallet', color: '#10b981', title: 'Multi-Account Management', description: 'Track bank accounts, cash wallets, and credit cards all in one place with category tagging.' },
    { icon: 'pi pi-chart-pie', color: '#38bdf8', title: 'Spending Analytics', description: 'Interactive pie charts and trend graphs show exactly where your money is going each month.' },
    { icon: 'pi pi-sync', color: '#818cf8', title: 'Transaction Switching', description: 'Move transactions between accounts effortlessly to keep your records accurate.' },
    { icon: 'pi pi-lock', color: '#f59e0b', title: 'Secure Authentication', description: 'JWT tokens, OTP verification, and encrypted storage protect your financial data.' },
    { icon: 'pi pi-tag', color: '#ec4899', title: 'Custom Categories', description: 'Create and manage your own account and transaction categories for granular tracking.' },
    { icon: 'pi pi-moon', color: '#a78bfa', title: 'Dark & Light Modes', description: 'A stunning glassmorphism UI that adapts beautifully to your preferred color scheme.' },
    { icon: 'pi pi-mobile', color: '#14b8a6', title: 'Responsive Design', description: 'Works flawlessly on desktop, tablet, and mobile devices — manage finances anywhere.' },
    { icon: 'pi pi-history', color: '#f97316', title: 'Transaction History', description: 'Complete audit trail of all your financial transactions with search and filter.' },
    { icon: 'pi pi-cog', color: '#64748b', title: 'Customizable Settings', description: 'Personalize your experience with configurable preferences and display options.' },
  ];
}
