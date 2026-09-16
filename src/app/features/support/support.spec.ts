import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Support } from './support';
import { COMMON_TEST_PROVIDERS } from '../../core/utils/test-providers';

describe('Support', () => {
  let component: Support;
  let fixture: ComponentFixture<Support>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Support],
      providers: [...COMMON_TEST_PROVIDERS]
    }).compileComponents();

    fixture = TestBed.createComponent(Support);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

