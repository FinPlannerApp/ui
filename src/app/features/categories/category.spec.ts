import { TestBed } from '@angular/core/testing';
import { Category } from './category';
import { COMMON_TEST_PROVIDERS } from '../../core/utils/test-providers';

describe('Category', () => {
  let service: Category;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...COMMON_TEST_PROVIDERS]
    });
    service = TestBed.inject(Category);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

