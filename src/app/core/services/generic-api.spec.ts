import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { GenericApi } from './generic-api';

describe('GenericApi', () => {
  let service: GenericApi;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient()]
    });
    service = TestBed.inject(GenericApi);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
