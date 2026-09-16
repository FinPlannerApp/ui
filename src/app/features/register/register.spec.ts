import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Register } from './register';
import { COMMON_TEST_PROVIDERS } from '../../core/utils/test-providers';

describe('Register', () => {
  let component: Register;
  let fixture: ComponentFixture<Register>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Register],
      providers: [...COMMON_TEST_PROVIDERS]
    }).compileComponents();

    fixture = TestBed.createComponent(Register);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

