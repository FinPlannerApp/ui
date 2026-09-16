import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AccountForm } from './account-form';
import { COMMON_TEST_PROVIDERS } from '../../../core/utils/test-providers';

describe('AccountForm', () => {
  let component: AccountForm;
  let fixture: ComponentFixture<AccountForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccountForm],
      providers: [...COMMON_TEST_PROVIDERS]
    }).compileComponents();

    fixture = TestBed.createComponent(AccountForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

