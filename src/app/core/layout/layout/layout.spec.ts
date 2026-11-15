import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { SwUpdate } from '@angular/service-worker';
import { MessageService } from 'primeng/api';
import { EMPTY } from 'rxjs';
import { Layout } from './layout';

// PwaUpdateService (used by Layout) injects SwUpdate, which only exists when the service worker is registered.
const swUpdateStub = { isEnabled: false, versionUpdates: EMPTY, checkForUpdate: () => Promise.resolve(false) };

describe('Layout', () => {
  let component: Layout;
  let fixture: ComponentFixture<Layout>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Layout],
      providers: [
        provideHttpClient(),
        provideRouter([]),
        MessageService,
        { provide: SwUpdate, useValue: swUpdateStub }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(Layout);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
