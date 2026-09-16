import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { Account } from './account';

describe('Account', () => {
  let service: Account;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideRouter([])
      ]
    });
    service = TestBed.inject(Account);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
