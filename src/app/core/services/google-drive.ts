import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

declare const google: any;

export interface DriveUploaded { id: string; name: string; mimeType: string; size: number | null; shared: boolean; }

const SCOPE = 'https://www.googleapis.com/auth/drive.file';   // only files this app creates; cannot browse the rest of the Drive
const FOLDER_NAME = 'FinPlanner';
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

/**
 * Uploads a document straight from the browser into the signed-in user's own Google Drive.
 * The short-lived access token lives only in memory: it is never sent to our server or stored.
 * Our API only ever receives the resulting Drive file id.
 */
@Injectable({ providedIn: 'root' })
export class GoogleDriveService {
  private token: string | null = null;
  private tokenExpiry = 0;
  private folderIds = new Map<string, string>();
  private scriptPromise: Promise<void> | null = null;

  get available(): boolean { return !!environment.googleClientId; }

  private loadScript(): Promise<void> {
    if (typeof google !== 'undefined' && google?.accounts?.oauth2) return Promise.resolve();
    if (this.scriptPromise) return this.scriptPromise;
    this.scriptPromise = new Promise<void>((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client'; s.async = true; s.defer = true;
      s.onload = () => resolve();
      s.onerror = () => { this.scriptPromise = null; reject(new Error('Could not load Google sign-in.')); };
      document.head.appendChild(s);
    });
    return this.scriptPromise;
  }

  /** Asks Google for access (a popup the first time). Must run from a click so the popup is not blocked. */
  private async ensureToken(): Promise<string> {
    if (this.token && Date.now() < this.tokenExpiry - 60_000) return this.token;
    await this.loadScript();
    return new Promise<string>((resolve, reject) => {
      const client = google.accounts.oauth2.initTokenClient({
        client_id: environment.googleClientId,
        scope: SCOPE,
        callback: (resp: any) => {
          if (resp?.error || !resp?.access_token) { reject(new Error('Google access was not granted.')); return; }
          this.token = resp.access_token;
          this.tokenExpiry = Date.now() + (Number(resp.expires_in) || 3000) * 1000;
          resolve(resp.access_token);
        },
        error_callback: () => reject(new Error('Google sign-in was closed.')),
      });
      client.requestAccessToken({ prompt: this.token === null ? '' : undefined });
    });
  }

  /** Forget the in-memory token (used on disconnect). The user can also revoke access at myaccount.google.com/permissions. */
  disconnect() {
    const t = this.token;
    this.token = null; this.tokenExpiry = 0; this.folderIds.clear();
    if (t && typeof google !== 'undefined' && google?.accounts?.oauth2) { try { google.accounts.oauth2.revoke(t, () => { /* done */ }); } catch { /* ignore */ } }
  }

  private async api(path: string, token: string, init?: RequestInit): Promise<any> {
    const res = await fetch(path, { ...init, headers: { Authorization: `Bearer ${token}`, ...(init?.headers ?? {}) } });
    if (res.status === 401) { this.token = null; throw new Error('Google access expired. Try again.'); }
    if (!res.ok) throw new Error('Google Drive refused the request.');
    return res.json();
  }

  /** Drive query strings use single quotes; escape anything in a user-chosen folder name. */
  private esc = (v: string) => v.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  private cleanName = (v: string) => v.replace(/[\\/:*?"<>|]/g, '_').trim().slice(0, 80) || 'Untitled';

  /** FinPlanner / Insurance / Star Health ... : finds or creates each level once and remembers the ids. */
  private async ensureFolderPath(token: string, path: string[]): Promise<string> {
    let parent: string | null = null; let key = '';
    for (const raw of [FOLDER_NAME, ...path]) {
      const name = raw === FOLDER_NAME ? raw : this.cleanName(raw);
      key += '/' + name;
      const cached = this.folderIds.get(key);
      if (cached) { parent = cached; continue; }
      const q = encodeURIComponent(`name='${this.esc(name)}' and mimeType='application/vnd.google-apps.folder' and trashed=false` + (parent ? ` and '${parent}' in parents` : ''));
      const found = await this.api(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)&pageSize=1`, token);
      let id: string;
      if (found.files?.length) id = found.files[0].id;
      else {
        const created = await this.api('https://www.googleapis.com/drive/v3/files?fields=id', token, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder', ...(parent ? { parents: [parent] } : {}) }),
        });
        id = created.id;
      }
      this.folderIds.set(key, id); parent = id;
    }
    return parent!;
  }

  /** Shrinks big photos so receipts stay small in the user's Drive. PDFs are untouched. */
  private async prepare(file: File): Promise<Blob> {
    if (!file.type.startsWith('image/') || file.type === 'image/gif') return file;
    try {
      const bmp = await createImageBitmap(file);
      const scale = Math.min(1, 1800 / Math.max(bmp.width, bmp.height));
      if (scale === 1 && file.size < 800_000) return file;
      const c = document.createElement('canvas'); c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
      c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
      const blob: Blob | null = await new Promise(r => c.toBlob(r, 'image/jpeg', 0.82));
      return blob && blob.size < file.size ? blob : file;
    } catch { return file; }
  }

  validate(file: File): string | null {
    if (!ALLOWED.includes(file.type)) return 'Upload a PDF or a JPG, PNG or WebP image.';
    if (file.size > MAX_BYTES) return 'That file is over 10 MB.';
    return null;
  }

  /**
   * shareAnyone: also let anyone who has the link view the file (needed so another group member can open a split receipt
   * without a Google account match). If Google refuses (some work/school accounts block it) the upload still succeeds, unshared.
   */
  async upload(file: File, displayName: string, shareAnyone = false, folderPath: string[] = []): Promise<DriveUploaded> {
    const problem = this.validate(file);
    if (problem) throw new Error(problem);
    const token = await this.ensureToken();
    const folder = await this.ensureFolderPath(token, folderPath);
    const body = await this.prepare(file);
    const mime = body.type || file.type;

    const meta = { name: displayName.replace(/[\\/:*?"<>|]/g, '_').slice(0, 100) || 'document', parents: [folder] };
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(meta)], { type: 'application/json' }));
    form.append('file', new Blob([body], { type: mime }));
    const out = await this.api('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size', token, { method: 'POST', body: form });
    let shared = false;
    if (shareAnyone) {
      try {
        await this.api(`https://www.googleapis.com/drive/v3/files/${out.id}/permissions?fields=id`, token, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: 'reader', type: 'anyone' }),
        });
        shared = true;
      } catch { shared = false; }
    }
    return { id: out.id, name: out.name, mimeType: out.mimeType ?? mime, size: out.size ? Number(out.size) : null, shared };
  }
}
