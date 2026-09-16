import { TestBed } from '@angular/core/testing';
import { Account } from './account';
import { COMMON_TEST_PROVIDERS } from '../../core/utils/test-providers';

describe('Account', () => {
  let service: Account;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...COMMON_TEST_PROVIDERS]
    });
    service = TestBed.inject(Account);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

