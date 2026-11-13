import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { GenericApi } from './generic-api';

export type ChangeType = 'new' | 'improved' | 'fixed';

export interface ReleaseNoteItem {
  type: ChangeType;
  text: string;
}

/** One release of the app or the server, as served by GET Releases/recent (content lives in the database). */
export interface ReleaseNote {
  id: number;
  stream: 'app' | 'server';
  version: string;
  level: 'major' | 'minor' | 'patch';
  releasedOn: string;
  summary?: string | null;
  /** Blog article for minor and major releases. */
  blogSlug?: string | null;
  items: ReleaseNoteItem[];
}

export interface ChangeGroup {
  type: ChangeType;
  label: string;
  icon: string;
  items: ReleaseNoteItem[];
}

const SEEN_KEY = 'finplanner_last_seen_release_id';
/** How many releases the window lists at most, if someone has been away for a long time. */
const MAX_IN_WINDOW = 5;

const GROUPS: { type: ChangeType; label: string; icon: string }[] = [
  { type: 'new', label: 'New', icon: 'pi pi-sparkles' },
  { type: 'improved', label: 'Improved', icon: 'pi pi-arrow-up-right' },
  { type: 'fixed', label: 'Fixed', icon: 'pi pi-wrench' },
];

/**
 * Release notes for the "What's new" window and the blog, plus the app/server version labels.
 * The notes are written as Flyway migrations in the API repo and read from the database, so nothing
 * here is bundled with the app and a new note appears without redeploying the UI.
 */
@Injectable({ providedIn: 'root' })
export class ChangelogService {
  private api = inject(GenericApi);
  private http = inject(HttpClient);
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  /** What the window lists. */
  readonly shown = signal<ReleaseNote[]>([]);
  /** True while the "What's new" window is open. */
  readonly open = signal(false);
  /** Latest releases for the blog page (patches included). */
  readonly recent = signal<ReleaseNote[]>([]);
  /** The version the deployed backend reports ("…" until known). */
  readonly serverVersion = signal('…');

  private serverVersionLoaded = false;

  /** Opens the window by itself, once, when there are releases this person has not seen. */
  async showIfNew(): Promise<void> {
    if (!this.isBrowser || this.open()) return;
    const seen = this.readSeen();
    // First visit on this device: just the latest release. Otherwise everything newer than the last one seen.
    const releases = await this.fetchRecent(seen === null ? { count: 1 } : { afterId: seen, count: MAX_IN_WINDOW });
    if (releases.length === 0) return;
    this.shown.set(releases);
    this.open.set(true);
  }

  /** Opens the window on request (the version label): the latest few releases. */
  async openManually(): Promise<void> {
    const releases = await this.fetchRecent({ count: MAX_IN_WINDOW });
    if (releases.length === 0) return;
    this.shown.set(releases);
    this.open.set(true);
  }

  /** Closing marks everything shown as seen. */
  dismiss(): void {
    this.open.set(false);
    const newest = Math.max(this.readSeen() ?? 0, ...this.shown().map((r) => r.id));
    if (newest > 0) this.writeSeen(newest);
  }

  async loadRecent(count = 3): Promise<void> {
    this.recent.set(await this.fetchRecent({ count }));
  }

  async loadServerVersion(): Promise<void> {
    if (this.serverVersionLoaded || !this.isBrowser) return;
    this.serverVersionLoaded = true;
    try {
      const res = await firstValueFrom(this.http.get<{ version?: string }>(`${environment.apiBaseUrl}/version`));
      if (res?.version) this.serverVersion.set(res.version);
    } catch {
      this.serverVersion.set('–');
    }
  }

  groups(release: ReleaseNote): ChangeGroup[] {
    return GROUPS.map((g) => ({ ...g, items: release.items.filter((i) => i.type === g.type) })).filter(
      (g) => g.items.length > 0,
    );
  }

  label(release: ReleaseNote): string {
    return `${release.stream === 'app' ? 'App' : 'Server'} ${release.version}`;
  }

  private async fetchRecent(options: { afterId?: number; count: number }): Promise<ReleaseNote[]> {
    try {
      const query = options.afterId === undefined ? `count=${options.count}` : `afterId=${options.afterId}&count=${options.count}`;
      const result = await firstValueFrom(this.api.get<ReleaseNote[]>(`Releases/recent?${query}`));
      return result.isSuccess && result.value ? result.value : [];
    } catch {
      return []; // release notes are a nicety: never get in the way of the app
    }
  }

  private readSeen(): number | null {
    if (!this.isBrowser) return null;
    try {
      const raw = localStorage.getItem(SEEN_KEY);
      const n = raw === null ? NaN : Number(raw);
      return Number.isFinite(n) ? n : null;
    } catch {
      return null;
    }
  }

  private writeSeen(id: number): void {
    if (!this.isBrowser) return;
    try {
      localStorage.setItem(SEEN_KEY, String(id));
    } catch {
      // Private mode / blocked storage: the window may show again next visit, which is harmless.
    }
  }
}
