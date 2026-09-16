import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { publicGuard } from './public-guard';

describe('publicGuard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideRouter([])
      ]
    });
  });

  it('should be defined', () => {
    expect(publicGuard).toBeTruthy();
  });
});
