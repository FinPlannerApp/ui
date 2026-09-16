import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { DashboardService } from './dashboard';

describe('DashboardService', () => {
  let service: DashboardService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient()]
    });
    service = TestBed.inject(DashboardService);
  });

  it('should create', () => {
    expect(service).toBeTruthy();
  });
});
