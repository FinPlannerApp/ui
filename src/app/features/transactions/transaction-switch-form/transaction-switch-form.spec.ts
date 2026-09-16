import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { TransactionSwitchForm } from './transaction-switch-form';

describe('TransactionSwitchForm', () => {
  let component: TransactionSwitchForm;
  let fixture: ComponentFixture<TransactionSwitchForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransactionSwitchForm],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        { provide: DynamicDialogRef, useValue: { close: () => {} } },
        { provide: DynamicDialogConfig, useValue: {} }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(TransactionSwitchForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
