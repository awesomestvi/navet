import type { Auth } from 'home-assistant-js-websocket';
import { haIngressAuth } from '@/auth/adapters/haIngressAuth';
import { haPanelAuth } from '@/auth/adapters/haPanelAuth';
import { standaloneOAuthAuth } from '@/auth/adapters/standaloneOAuthAuth';
import type { AuthAdapter, AuthSession } from '@/auth/types';
import {
  type NavetRuntimeKind,
  type RuntimeAuthMode,
  toLegacyAuthRuntime,
} from '../runtime/runtime-context';
import { getRuntimeContext } from '../runtime/runtime-detector';

export interface AuthSessionSnapshot {
  runtime: NavetRuntimeKind;
  authMode: RuntimeAuthMode;
  haBaseUrl: string | null;
  accessToken?: string;
  expiresAt?: number;
  userId?: string;
  isAuthenticated: boolean;
}

type AuthStateListener = (snapshot: AuthSessionSnapshot, session: AuthSession | null) => void;

const LEGACY_ADAPTERS: Record<ReturnType<typeof toLegacyAuthRuntime>, AuthAdapter> = {
  'ha-panel': haPanelAuth,
  'ha-ingress': haIngressAuth,
  'standalone-oauth': standaloneOAuthAuth,
};

function buildSnapshot(session: AuthSession | null): AuthSessionSnapshot {
  const runtime = getRuntimeContext().kind;

  if (!session) {
    return {
      runtime,
      authMode: getRuntimeContext().authMode,
      haBaseUrl: getRuntimeContext().haBaseUrl,
      isAuthenticated: false,
    };
  }

  return {
    runtime,
    authMode: session.authMode,
    haBaseUrl: session.haBaseUrl,
    accessToken: session.auth?.accessToken,
    expiresAt: session.expiresAt,
    userId: session.userId,
    isAuthenticated: true,
  };
}

export class AuthSessionManager {
  private session: AuthSession | null = null;
  private listeners = new Set<AuthStateListener>();

  private get adapter(): AuthAdapter {
    return LEGACY_ADAPTERS[toLegacyAuthRuntime(getRuntimeContext().kind)];
  }

  getSession() {
    return this.session;
  }

  getSnapshot(): AuthSessionSnapshot {
    return buildSnapshot(this.session);
  }

  private updateSession(session: AuthSession | null) {
    this.session = session;
    const snapshot = buildSnapshot(session);
    for (const listener of this.listeners) {
      listener(snapshot, session);
    }
  }

  async init(): Promise<AuthSessionSnapshot> {
    const nextSession = await this.adapter.init();
    this.updateSession(nextSession);
    return this.getSnapshot();
  }

  async login(input?: { haBaseUrl?: string; hassUrl?: string }): Promise<AuthSessionSnapshot> {
    if (!this.adapter.login) {
      throw new Error('Login is not available in this runtime');
    }

    const nextSession = await this.adapter.login({
      hassUrl: input?.haBaseUrl ?? input?.hassUrl,
    });
    this.updateSession(nextSession);
    return this.getSnapshot();
  }

  async refresh(): Promise<AuthSessionSnapshot> {
    if (!this.session) {
      return this.getSnapshot();
    }

    if (!this.adapter.refresh) {
      return this.getSnapshot();
    }

    const nextSession = await this.adapter.refresh(this.session);
    this.updateSession(nextSession);
    return this.getSnapshot();
  }

  replaceSession(session: AuthSession | null): AuthSessionSnapshot {
    this.updateSession(session);
    return this.getSnapshot();
  }

  async logout(): Promise<void> {
    this.updateSession(null);
    await this.adapter.logout?.();
  }

  subscribe(listener: AuthStateListener): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const authSessionManager = new AuthSessionManager();

export function getSessionAccessToken(session: AuthSession | null): string | undefined {
  return session?.auth?.accessToken;
}

export function getSessionAuth(session: AuthSession | null): Auth | undefined {
  return session?.auth;
}
