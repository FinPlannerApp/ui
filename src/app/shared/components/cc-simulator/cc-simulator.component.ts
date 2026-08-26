import { Component, Input, OnInit, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { sharedPrimeModules } from '../../../shared/prime-imports';
import { PayCcBill } from '../../../features/accounts/pay-cc-bill/pay-cc-bill';

@Component({
  selector: 'app-cc-simulator',
  standalone: true,
  imports: [CommonModule, FormsModule, ...sharedPrimeModules],
  template: `
    <div class="glass-card p-5 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden transition-all duration-300 hover:border-purple-500/30">
      
      <!-- Background Ambient Glow -->
      <div class="absolute -top-24 -right-24 w-64 h-64 bg-purple-600/15 rounded-full blur-3xl pointer-events-none"></div>
      <div class="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none"></div>

      <!-- Header Title -->
      <div class="flex items-center justify-between gap-2 mb-4 relative z-10">
        <div class="flex items-center gap-2.5">
          <div class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600/30 to-indigo-600/30 border border-purple-400/30 flex items-center justify-center text-purple-300 text-lg shadow-lg">
            <i class="pi pi-credit-card"></i>
          </div>
          <div>
            <h3 class="text-base font-extrabold text-white m-0 tracking-wide">{{ cardName() }}</h3>
            <span class="text-xs text-[var(--text-muted)] font-mono">Statement & Payoff Intelligence</span>
          </div>
        </div>

        <div class="px-3 py-1 rounded-full text-xs font-bold border backdrop-blur-md flex items-center gap-1.5 shadow-md"
          [ngClass]="utilizationColorClass().badge">
          <span class="w-2 h-2 rounded-full animate-pulse" [ngClass]="utilizationColorClass().dot"></span>
          <span>{{ utilizationPercent() }}% Utilization</span>
        </div>
      </div>

      <!-- 3D Realistic Animated Metallic Glass Credit Card -->
      <div class="relative w-full aspect-[1.586/1] max-w-md mx-auto my-4 p-6 rounded-2xl bg-gradient-to-br from-slate-900/90 via-indigo-950/80 to-purple-950/90 border border-white/20 shadow-2xl overflow-hidden group transition-all duration-500 hover:scale-[1.02] hover:shadow-purple-500/20">
        
        <!-- Metallic Reflection Sheen Animation -->
        <div class="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none"></div>

        <!-- Card Top Bar: Chip & Brand Logo -->
        <div class="flex items-center justify-between relative z-10 mb-6">
          <div class="flex items-center gap-2">
            <!-- EMV Chip Icon -->
            <div class="w-11 h-8 rounded-md bg-amber-400/80 border border-amber-300 flex items-center justify-center shadow-inner relative overflow-hidden">
              <div class="w-full h-0.5 bg-amber-700/50 absolute top-2"></div>
              <div class="w-full h-0.5 bg-amber-700/50 absolute bottom-2"></div>
              <div class="h-full w-0.5 bg-amber-700/50 absolute left-3"></div>
            </div>
            <!-- Contactless Icon -->
            <i class="pi pi-wifi text-slate-300 text-lg rotate-90 opacity-80"></i>
          </div>
          
          <div class="text-right">
            <span class="text-[10px] uppercase font-mono font-bold tracking-widest text-slate-400">FINANCIAL PLANNER</span>
            <div class="text-xs font-extrabold tracking-wider bg-gradient-to-r from-purple-400 to-indigo-300 bg-clip-text text-transparent">PLATINUM</div>
          </div>
        </div>

        <!-- Card Number Format -->
        <div class="my-3 font-mono text-sm sm:text-base font-bold tracking-widest text-slate-200 drop-shadow-md">
          •••• •••• •••• {{ cardLastFour() }}
        </div>

        <!-- Card Balance & Limit -->
        <div class="flex items-end justify-between relative z-10 pt-2">
          <div>
            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Statement Debt</span>
            <div class="text-xl sm:text-2xl font-black text-rose-400 drop-shadow">
              ₹{{ statementBill().toLocaleString('en-IN') }}
            </div>
          </div>

          <div class="text-right">
            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400">Credit Limit</span>
            <div class="text-sm font-extrabold text-slate-200">
              ₹{{ creditLimit().toLocaleString('en-IN') }}
            </div>
          </div>
        </div>
      </div>

      <!-- Live Utilization Progress Meter -->
      <div class="flex flex-col gap-1.5 my-4">
        <div class="flex items-center justify-between text-xs">
          <span class="text-[var(--text-muted)] font-semibold">Credit Line Usage</span>
          <span class="font-extrabold" [ngClass]="utilizationColorClass().text">
            ₹{{ totalLiability().toLocaleString('en-IN') }} / ₹{{ creditLimit().toLocaleString('en-IN') }}
          </span>
        </div>
        <div class="w-full h-3 rounded-full bg-black/40 border border-white/10 p-0.5 overflow-hidden shadow-inner">
          <div class="h-full rounded-full transition-all duration-700 ease-out"
            [style.width.%]="utilizationPercent()"
            [ngClass]="utilizationColorClass().bar"></div>
        </div>
      </div>

      <!-- Debt Breakdown Split Cards (Billed vs Mid-Cycle Unbilled) -->
      <div class="grid grid-cols-2 gap-3 my-4">
        <div class="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex flex-col gap-1">
          <span class="text-[10px] font-bold uppercase tracking-wider text-rose-300">Billed Statement</span>
          <span class="text-base sm:text-lg font-black text-rose-400">₹{{ statementBill().toLocaleString('en-IN') }}</span>
          <span class="text-[10px] text-rose-300/80">Due in {{ daysLeft() }} days</span>
        </div>

        <div class="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex flex-col gap-1">
          <span class="text-[10px] font-bold uppercase tracking-wider text-purple-300">Unbilled Mid-Cycle</span>
          <span class="text-base sm:text-lg font-black text-purple-300">₹{{ unbilledNet().toLocaleString('en-IN') }}</span>
          <span class="text-[10px] text-purple-300/80">Rolls to next bill</span>
        </div>
      </div>

      <!-- Interactive Sliders for Custom Payoff Simulations -->
      <div class="p-4 rounded-2xl bg-black/30 border border-white/10 my-4 flex flex-col gap-3">
        <div class="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <i class="pi pi-sliders-h text-indigo-400"></i>
          <span>Simulate Payoff Scenarios</span>
        </div>

        <div class="flex flex-col gap-1">
          <div class="flex justify-between text-xs">
            <span class="text-[var(--text-muted)]">Monthly Paydown:</span>
            <span class="font-bold text-emerald-400">₹{{ monthlyPayment().toLocaleString('en-IN') }}</span>
          </div>
          <input type="range" min="500" [max]="statementBill() || 10000" step="250"
            [ngModel]="monthlyPayment()" (ngModelChange)="monthlyPayment.set($event)"
            class="w-full accent-indigo-500 cursor-pointer" />
        </div>

        <div class="flex justify-between items-center text-xs pt-2 border-t border-white/5">
          <span class="text-[var(--text-muted)]">Months to Pay Off:</span>
          <span class="font-black text-indigo-300 text-sm">{{ monthsToPayoff() }} Months</span>
        </div>
      </div>

      <!-- 1-Tap Quick Action: Pay Statement Bill -->
      <div class="flex items-center gap-2 pt-2">
        <button type="button" (click)="openPayBillModal()"
          class="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs sm:text-sm tracking-wide shadow-xl hover:shadow-emerald-500/25 transition-all transform active:scale-95 flex items-center justify-center gap-2 cursor-pointer border-0">
          <i class="pi pi-check-circle text-base"></i>
          <span>1-Tap Pay Statement (₹{{ statementBill().toLocaleString('en-IN') }})</span>
        </button>
      </div>
    </div>
  `
})
export class CcSimulatorComponent implements OnInit {
  @Input() accountIdInput: number | null = null;
  @Input() cardNameInput: string = 'HDFC Regalia Credit Card';
  @Input() creditLimitInput: number = 150000;
  @Input() statementBillInput: number = 1501;
  @Input() unbilledNetInput: number = 4500;
  @Input() cardLastFourInput: string = '8842';

  private dialogService = inject(DialogService, { optional: true });

  cardName = signal('HDFC Regalia Credit Card');
  creditLimit = signal(150000);
  statementBill = signal(1501);
  unbilledNet = signal(4500);
  cardLastFour = signal('8842');
  monthlyPayment = signal(1501);
  daysLeft = signal(3);

  ngOnInit(): void {
    if (this.cardNameInput) this.cardName.set(this.cardNameInput);
    if (this.creditLimitInput) this.creditLimit.set(this.creditLimitInput);
    if (this.statementBillInput) this.statementBill.set(this.statementBillInput);
    if (this.unbilledNetInput) this.unbilledNet.set(this.unbilledNetInput);
    if (this.cardLastFourInput) this.cardLastFour.set(this.cardLastFourInput);
    this.monthlyPayment.set(this.statementBillInput || 1501);
  }

  totalLiability = computed(() => this.statementBill() + this.unbilledNet());

  utilizationPercent = computed(() => {
    const limit = this.creditLimit();
    if (!limit) return 0;
    return Math.min(100, Math.round((this.totalLiability() / limit) * 100));
  });

  utilizationColorClass = computed(() => {
    const pct = this.utilizationPercent();
    if (pct < 30) {
      return {
        badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        dot: 'bg-emerald-400',
        bar: 'bg-gradient-to-r from-emerald-500 to-teal-400',
        text: 'text-emerald-400'
      };
    } else if (pct < 50) {
      return {
        badge: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
        dot: 'bg-amber-400',
        bar: 'bg-gradient-to-r from-amber-500 to-yellow-400',
        text: 'text-amber-400'
      };
    } else {
      return {
        badge: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
        dot: 'bg-rose-400',
        bar: 'bg-gradient-to-r from-rose-600 to-pink-500',
        text: 'text-rose-400'
      };
    }
  });

  monthsToPayoff = computed(() => {
    const pay = this.monthlyPayment();
    const total = this.totalLiability();
    if (!pay || pay <= 0) return '∞';
    return Math.ceil(total / pay);
  });

  openPayBillModal(): void {
    if (this.dialogService) {
      this.dialogService.open(PayCcBill, {
        header: `Pay Credit Card Statement — ${this.cardName()}`,
        width: '90%',
        style: { maxWidth: '650px' },
        contentStyle: { overflow: 'auto', 'max-height': '90vh' },
        baseZIndex: 10000,
        data: {
          accountId: this.accountIdInput || 1,
          accountName: this.cardName(),
          outstandingBalance: this.statementBill()
        }
      });
    }
  }
}
