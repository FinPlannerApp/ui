import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResourcePage } from './resource-page';
import { COMMON_TEST_PROVIDERS } from '../../../core/utils/test-providers';

describe('ResourcePage', () => {
  let component: ResourcePage<any>;
  let fixture: ComponentFixture<ResourcePage<any>>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResourcePage],
      providers: [...COMMON_TEST_PROVIDERS]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ResourcePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

