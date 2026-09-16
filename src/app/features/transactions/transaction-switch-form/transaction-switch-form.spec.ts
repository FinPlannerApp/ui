import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TransactionSwitchForm } from './transaction-switch-form';
import { COMMON_TEST_PROVIDERS } from '../../../core/utils/test-providers';

describe('TransactionSwitchForm', () => {
  let component: TransactionSwitchForm;
  let fixture: ComponentFixture<TransactionSwitchForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransactionSwitchForm],
      providers: [...COMMON_TEST_PROVIDERS]
    }).compileComponents();

    fixture = TestBed.createComponent(TransactionSwitchForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

