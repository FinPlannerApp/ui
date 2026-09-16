import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { Category } from './category';

describe('Category', () => {
  let service: Category;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideRouter([])
      ]
    });
    service = TestBed.inject(Category);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
