import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DataTable } from './data-table';
import { COMMON_TEST_PROVIDERS } from '../../../core/utils/test-providers';

describe('DataTable', () => {
  let component: DataTable;
  let fixture: ComponentFixture<DataTable>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DataTable],
      providers: [...COMMON_TEST_PROVIDERS]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DataTable);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

