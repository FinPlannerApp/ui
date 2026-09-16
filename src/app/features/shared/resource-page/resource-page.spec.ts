import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ResourcePage } from './resource-page';

describe('ResourcePage', () => {
  let component: ResourcePage<any>;
  let fixture: ComponentFixture<ResourcePage<any>>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResourcePage]
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
