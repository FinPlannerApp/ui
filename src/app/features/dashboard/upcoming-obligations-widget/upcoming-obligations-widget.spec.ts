import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UpcomingObligationsWidget } from './upcoming-obligations-widget';
import { COMMON_TEST_PROVIDERS } from '../../../core/utils/test-providers';
import { UpcomingObligation } from '../../../core/models/obligation.model';

describe('UpcomingObligationsWidget', () => {
  let component: UpcomingObligationsWidget;
  let fixture: ComponentFixture<UpcomingObligationsWidget>;

  const mockObligations: UpcomingObligation[] = Array.from({ length: 15 }, (_, i) => ({
    description: `Upcoming Bill #${i + 1} with a very long descriptive title that could potentially overflow on small mobile screens`,
    amount: 1000 * (i + 1),
    minimumDueAmount: null,
    dueDate: new Date(Date.now() + (i - 2) * 86400000).toISOString(),
    accountName: `Main Salary Account #${i + 100}`,
    source: i % 3 === 0 ? 'CreditCard' : (i % 3 === 1 ? 'Loan' : 'Recurring'),
    isOverdue: i < 2,
    isShortfallRisk: i % 2 === 0
  }));

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UpcomingObligationsWidget],
      providers: [...COMMON_TEST_PROVIDERS]
    }).compileComponents();

    fixture = TestBed.createComponent(UpcomingObligationsWidget);
    component = fixture.componentInstance;
  });

  it('should create successfully', () => {
    expect(component).toBeTruthy();
  });

  it('should handle empty obligations list gracefully', () => {
    component.isLoading.set(false);
    component.obligations.set([]);
    fixture.detectChanges();

    expect(component.totalCount()).toBe(0);
    expect(component.hasMore()).toBe(false);
    expect(component.displayedObligations().length).toBe(0);
  });

  it('should cap displayed obligations to 6 in stack mode and compute remaining count', () => {
    fixture.componentRef.setInput('layout', 'stack');
    component.isLoading.set(false);
    component.obligations.set(mockObligations);
    fixture.detectChanges();

    expect(component.layout()).toBe('stack');
    expect(component.totalCount()).toBe(15);
    expect(component.displayedObligations().length).toBe(6);
    expect(component.hasMore()).toBe(true);
    expect(component.remainingCount()).toBe(9);
  });

  it('should cap displayed obligations to 4 in row mode and compute remaining count', () => {
    fixture.componentRef.setInput('layout', 'row');
    component.isLoading.set(false);
    component.obligations.set(mockObligations);
    fixture.detectChanges();

    expect(component.layout()).toBe('row');
    expect(component.totalCount()).toBe(15);
    expect(component.displayedObligations().length).toBe(4);
    expect(component.hasMore()).toBe(true);
    expect(component.remainingCount()).toBe(11);
  });

  it('should correctly format due labels for overdue, today, and future dates', () => {
    const today = new Date().toISOString();
    const past = new Date(Date.now() - 3 * 86400000).toISOString();
    const future = new Date(Date.now() + 5 * 86400000).toISOString();

    expect(component.dueLabel({ dueDate: today, isOverdue: false } as any)).toBe('Due today');
    expect(component.dueLabel({ dueDate: past, isOverdue: true } as any)).toContain('Overdue');
    expect(component.dueLabel({ dueDate: future, isOverdue: false } as any)).toBe('In 5 days');
  });
});

