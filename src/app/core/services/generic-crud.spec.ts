import { TestBed } from '@angular/core/testing';

import { GenericCrud } from './generic-crud';
import { COMMON_TEST_PROVIDERS } from '../utils/test-providers';

describe('GenericCrud', () => {
  let service: GenericCrud<any>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...COMMON_TEST_PROVIDERS]
    });
    service = TestBed.inject(GenericCrud);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

