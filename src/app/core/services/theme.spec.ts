import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { ThemeEngine } from './theme';

describe('ThemeEngine', () => {
  let service: ThemeEngine;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient()]
    });
    service = TestBed.inject(ThemeEngine);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
