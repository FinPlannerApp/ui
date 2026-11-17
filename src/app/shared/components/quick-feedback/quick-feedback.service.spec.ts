import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';
import { signal } from '@angular/core';
import { Auth } from '../../../core/services/auth';
import { QuickFeedbackService, ReportBody } from './quick-feedback.service';

describe('QuickFeedbackService', () => {
  let service: QuickFeedbackService;
  const body = (n: number): ReportBody => ({ description: `report ${n}`, severity: 'Minor', impactsMoney: false, contextJson: '{}', screenshotBase64: null });

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), MessageService,
      { provide: Auth, useValue: { currentUserDetails: signal({ id: 'u1' }) } }] });
    service = TestBed.inject(QuickFeedbackService);
  });

  afterEach(() => localStorage.clear());

  it('keeps a typed draft and clears it', () => {
    service.saveDraft({ text: 'half written', severity: 'Major' });
    expect(service.loadDraft()).toEqual({ text: 'half written', severity: 'Major' });
    service.clearDraft();
    expect(service.loadDraft()).toBeNull();
  });

  it('does not keep an empty draft', () => {
    service.saveDraft({ text: 'something', severity: 'Minor' });
    service.saveDraft({ text: '   ', severity: 'Minor' });
    expect(service.loadDraft()).toBeNull();
  });

  it('keeps at most the 3 newest offline reports', () => {
    for (let i = 1; i <= 5; i++) service.queue(body(i));
    const queued = JSON.parse(localStorage.getItem('finplanner_report_queue') ?? '[]') as { owner: string; body: ReportBody }[];
    expect(queued.map(q => q.body.description)).toEqual(['report 3', 'report 4', 'report 5']);
  });

  it('drops a very large screenshot from the offline copy but keeps the text', () => {
    service.queue({ ...body(1), screenshotBase64: 'x'.repeat(700_000) });
    const queued = JSON.parse(localStorage.getItem('finplanner_report_queue') ?? '[]') as { owner: string; body: ReportBody }[];
    expect(queued[0].body.description).toBe('report 1');
    expect(queued[0].body.screenshotBase64).toBeNull();
  });

  it('ties a queued report to the signed-in person', () => {
    service.queue(body(1));
    const queued = JSON.parse(localStorage.getItem('finplanner_report_queue') ?? '[]') as { owner: string }[];
    expect(queued[0].owner).toBe('u1');
  });
});
