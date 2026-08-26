import { Injectable, inject } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../../environments/environment';
import { Auth } from './auth';

export interface GroupUpdatePayload {
  groupId: number;
  eventType?: string;
  activityMessage?: string;
  expense?: any;
  expenseId?: number;
  member?: any;
  memberId?: number;
  upiId?: string;
  group?: any;
  expenses?: any[];
  balances?: any;
}

@Injectable({
  providedIn: 'root'
})
export class SplitSignalRService {
  private authService = inject(Auth);
  private hubConnection: signalR.HubConnection | null = null;
  private currentGroupId: number | null = null;
  private updateCallbacks: Array<(payload: GroupUpdatePayload) => void> = [];
  private startPromise: Promise<void> | null = null;

  private get hubUrl(): string {
    const base = environment.apiBaseUrl.replace(/\/api\/?$/, '');
    return `${base}/hubs/split`;
  }

  private ensureConnection(): Promise<void> {
    if (!this.hubConnection) {
      this.hubConnection = new signalR.HubConnectionBuilder()
        .withUrl(this.hubUrl, {
          transport: signalR.HttpTransportType.WebSockets,
          accessTokenFactory: () => this.authService.accessToken() ?? ''
        })
        .configureLogging(signalR.LogLevel.None)
        .withAutomaticReconnect()
        .build();

      this.hubConnection.on('GroupUpdated', (payload: GroupUpdatePayload) => {
        if (payload && payload.groupId === this.currentGroupId) {
          this.updateCallbacks.forEach(cb => cb(payload));
        }
      });

      this.hubConnection.onreconnected(async () => {
        if (this.currentGroupId && this.hubConnection?.state === signalR.HubConnectionState.Connected) {
          try {
            await this.hubConnection.invoke('JoinGroup', this.currentGroupId);
          } catch {
            // Handled silently
          }
        }
      });
    }

    if (this.hubConnection.state === signalR.HubConnectionState.Connected) {
      return Promise.resolve();
    }

    if (!this.startPromise) {
      this.startPromise = this.hubConnection.start()
        .then(() => {
          this.startPromise = null;
        })
        .catch((err) => {
          this.startPromise = null;
          throw err;
        });
    }

    return this.startPromise;
  }

  async joinGroup(groupId: number, onUpdate: (payload: GroupUpdatePayload) => void): Promise<void> {
    this.currentGroupId = groupId;
    if (!this.updateCallbacks.includes(onUpdate)) {
      this.updateCallbacks.push(onUpdate);
    }

    try {
      await this.ensureConnection();
      if (this.hubConnection?.state === signalR.HubConnectionState.Connected) {
        await this.hubConnection.invoke('JoinGroup', groupId);
      }
    } catch {
      // Fallback silently if websocket connection failed
    }
  }

  async leaveGroup(groupId: number): Promise<void> {
    this.updateCallbacks = [];
    if (this.hubConnection && this.hubConnection.state === signalR.HubConnectionState.Connected) {
      try {
        await this.hubConnection.invoke('LeaveGroup', groupId);
      } catch {
        // Handled silently
      }
    }
    this.currentGroupId = null;
  }
}
