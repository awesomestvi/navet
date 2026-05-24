import type { Auth } from 'home-assistant-js-websocket';
import type { AuthRuntime } from './runtime';

export interface AuthSession {
  runtime: AuthRuntime;
  hassUrl: string;
  auth?: Auth;
  expiresAt?: number;
}

export interface AuthAdapter {
  readonly kind: AuthRuntime;
  init(): Promise<AuthSession | null>;
  login?(input?: { hassUrl?: string }): Promise<AuthSession>;
  refresh?(session: AuthSession): Promise<AuthSession>;
  logout?(): Promise<void>;
}
