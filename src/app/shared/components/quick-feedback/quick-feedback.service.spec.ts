import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';
import { QuickFeedbackService, ReportBody } from './quick-feedback.service';

describe('QuickFeedbackService', () => {
  let service: QuickFeedbackService;
  const body = (n: number): ReportBody => ({ description: `report ${n}`, severity: 'Minor', impactsMoney: false, contextJson: '{}', screenshotBase64: null });

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]), MessageService] });
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
    const queued = JSON.parse(localStorage.getItem('finplanner_report_queue') ?? '[]') as ReportBody[];
    expect(queued.map(q => q.description)).toEqual(['report 3', 'report 4', 'report 5']);
  });

  it('drops a very large screenshot from the offline copy but keeps the text', () => {
    service.queue({ ...body(1), screenshotBase64: 'x'.repeat(700_000) });
    const queued = JSON.parse(localStorage.getItem('finplanner_report_queue') ?? '[]') as ReportBody[];
    expect(queued[0].description).toBe('report 1');
    expect(queued[0].screenshotBase64).toBeNull();
  });
});
