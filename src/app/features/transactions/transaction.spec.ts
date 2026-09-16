import { TestBed } from '@angular/core/testing';

import { TransactionService } from './transaction';
import { COMMON_TEST_PROVIDERS } from '../../core/utils/test-providers';

describe('TransactionService', () => {
  let service: TransactionService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...COMMON_TEST_PROVIDERS]
    });
    service = TestBed.inject(TransactionService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

