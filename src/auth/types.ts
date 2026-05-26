import type { Auth } from 'home-assistant-js-websocket';
import type { RuntimeAuthMode } from '@/app/infrastructure/home-assistant/runtime/runtime-context';
import type { AuthRuntime } from './runtime';

export interface AuthSession {
  runtime: AuthRuntime;
  authMode: RuntimeAuthMode;
  haBaseUrl: string;
  hassUrl: string;
  auth?: Auth;
  expiresAt?: number;
  userId?: string;
}

export interface AuthAdapter {
  readonly kind: AuthRuntime;
  init(): Promise<AuthSession | null>;
  login?(input?: { hassUrl?: string }): Promise<AuthSession>;
  refresh?(session: AuthSession): Promise<AuthSession>;
  logout?(): Promise<void>;
}
