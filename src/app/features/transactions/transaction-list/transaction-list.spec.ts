import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TransactionList } from './transaction-list';
import { COMMON_TEST_PROVIDERS } from '../../../core/utils/test-providers';

describe('TransactionList', () => {
  let component: TransactionList;
  let fixture: ComponentFixture<TransactionList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransactionList],
      providers: [...COMMON_TEST_PROVIDERS]
    }).compileComponents();

    fixture = TestBed.createComponent(TransactionList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

