import { Injectable, effect } from '@angular/core';

interface DraftEnvelope<T> {
  data: T;
  savedAt: number;
}

@Injectable({ providedIn: 'root' })
export class DraftPersistenceService {
  private readonly EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

  save<T>(key: string, data: T): void {
    const envelope: DraftEnvelope<T> = { data, savedAt: Date.now() };
    try {
      localStorage.setItem(this.prefixedKey(key), JSON.stringify(envelope));
    } catch {
      // localStorage can throw — quota exceeded, private browsing mode, etc.
    }
  }

  load<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(this.prefixedKey(key));
      if (!raw) return null;

      const envelope: DraftEnvelope<T> = JSON.parse(raw);
      if (Date.now() - envelope.savedAt > this.EXPIRY_MS) {
        this.clear(key);
        return null;
      }
      return envelope.data;
    } catch {
      return null;
    }
  }

  clear(key: string): void {
    try {
      localStorage.removeItem(this.prefixedKey(key));
    } catch {
      // ignore
    }
  }

  hasDraft(key: string): boolean {
    return this.load(key) !== null;
  }

  /**
   * Convenience wrapper — auto-saves whenever the given signal-reading
   * function's value changes, debounced so typing doesn't hammer
   * localStorage on every keystroke. Call this from a component's
   * constructor (or field initializer), where Angular's injection
   * context is available for effect() to attach to.
   */
  autoSave<T>(key: string, source: () => T, debounceMs = 1000): void {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    effect(() => {
      const value = source();
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => this.save(key, value), debounceMs);
    });
  }

  private prefixedKey(key: string): string {
    return `finplanner-draft:${key}`;
  }
}
