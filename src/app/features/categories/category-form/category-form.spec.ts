import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CategoryForm } from './category-form';
import { COMMON_TEST_PROVIDERS } from '../../../core/utils/test-providers';

describe('CategoryForm', () => {
  let component: CategoryForm;
  let fixture: ComponentFixture<CategoryForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoryForm],
      providers: [...COMMON_TEST_PROVIDERS]
    }).compileComponents();

    fixture = TestBed.createComponent(CategoryForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

