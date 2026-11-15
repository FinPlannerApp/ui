import { Injector, effect, runInInjectionContext, signal } from '@angular/core';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { LoadingService } from './loading.service';

describe('LoadingService', () => {
  let service: LoadingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LoadingService);
  });

  it('does not show the loader for a quick request', fakeAsync(() => {
    service.showRequest();
    tick(100);
    service.hideRequest();
    tick(1000);
    expect(service.visible()).toBeFalse();
  }));

  it('shows "Loading…" for a slow read and "Saving…" (blocking) for a slow save', fakeAsync(() => {
    service.showRequest(false);
    tick(300);
    expect(service.visible()).toBeTrue();
    expect(service.label()).toBe('Loading…');
    expect(service.isMutating()).toBeFalse();
    service.hideRequest(false);
    tick(1000);
    expect(service.visible()).toBeFalse();

    service.showRequest(true);
    tick(300);
    expect(service.visible()).toBeTrue();
    expect(service.label()).toBe('Saving…');
    expect(service.isMutating()).toBeTrue();
    service.hideRequest(true);
    tick(1000);
  }));

  it('stays visible a minimum time once shown, so it never blinks', fakeAsync(() => {
    service.showRequest();
    tick(300);
    expect(service.visible()).toBeTrue();
    service.hideRequest();
    tick(100);
    expect(service.visible()).toBeTrue();
    tick(500);
    expect(service.visible()).toBeFalse();
  }));

  it('stays on while overlapping requests are in flight', fakeAsync(() => {
    service.showRequest();
    service.showRequest();
    tick(300);
    service.hideRequest();
    tick(1000);
    expect(service.visible()).toBeTrue();
    service.hideRequest();
    tick(1000);
    expect(service.visible()).toBeFalse();
  }));

  it('starting a request inside an effect does not make that effect depend on the loader (no request loops)', fakeAsync(() => {
    const trigger = signal(0);
    let runs = 0;
    runInInjectionContext(TestBed.inject(Injector), () => {
      effect(() => {
        trigger();
        runs++;
        // what an HTTP call from an effect does through the loading interceptor
        service.showRequest(false);
        service.hideRequest(false);
      });
    });
    TestBed.tick();
    tick(1500);
    TestBed.tick();
    expect(runs).toBe(1);
  }));
});
