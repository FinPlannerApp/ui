import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { COMMON_TEST_PROVIDERS } from './core/utils/test-providers';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [...COMMON_TEST_PROVIDERS]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });
});

