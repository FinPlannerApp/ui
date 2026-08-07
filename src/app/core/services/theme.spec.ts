import { TestBed } from '@angular/core/testing';

import { ThemeEngine } from './theme';

describe('ThemeEngine', () => {
  let service: ThemeEngine;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ThemeEngine);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
