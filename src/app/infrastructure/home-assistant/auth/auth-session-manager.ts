import type { Auth } from 'home-assistant-js-websocket';
import type { IntegrationProviderId } from '@/app/types/provider';
import { haIngressAuth } from '@/auth/adapters/haIngressAuth';
import { haPanelAuth } from '@/auth/adapters/haPanelAuth';
import { homeyOAuthAuth } from '@/auth/adapters/homeyOAuthAuth';
import { standaloneOAuthAuth } from '@/auth/adapters/standaloneOAuthAuth';
import type { AuthAdapter, AuthSession } from '@/auth/types';
import {
  type NavetRuntimeKind,
  type RuntimeAuthMode,
  toLegacyAuthRuntime,
} from '../runtime/runtime-context';
import { getRuntimeContext } from '../runtime/runtime-detector';

const STORED_INTEGRATION_SESSION_KEY = 'navet_auth_session';

export interface AuthSessionSnapshot {
  providerId: IntegrationProviderId;
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

const PROVIDER_ADAPTERS: Partial<Record<IntegrationProviderId, AuthAdapter>> = {
  homey: homeyOAuthAuth,
};

function buildSnapshot(session: AuthSession | null): AuthSessionSnapshot {
  const runtime = getRuntimeContext().kind;

  if (!session) {
    return {
      providerId: 'home_assistant',
      runtime,
      authMode: getRuntimeContext().authMode,
      haBaseUrl: getRuntimeContext().haBaseUrl,
      isAuthenticated: false,
    };
  }

  return {
    providerId: session.providerId,
    runtime,
    authMode: session.authMode,
    haBaseUrl: session.haBaseUrl,
    accessToken: session.auth?.accessToken,
    expiresAt: session.expiresAt,
    userId: session.userId,
    isAuthenticated: true,
  };
}

function readStoredIntegrationSession(): AuthSession | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(STORED_INTEGRATION_SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed || typeof parsed !== 'object' || parsed.providerId !== 'openhab') {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function writeStoredIntegrationSession(session: AuthSession | null): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (!session || session.providerId !== 'openhab') {
    window.localStorage.removeItem(STORED_INTEGRATION_SESSION_KEY);
    return;
  }

  window.localStorage.setItem(STORED_INTEGRATION_SESSION_KEY, JSON.stringify(session));
}

export class AuthSessionManager {
  private session: AuthSession | null = null;
  private listeners = new Set<AuthStateListener>();

  private get adapter(): AuthAdapter {
    return LEGACY_ADAPTERS[toLegacyAuthRuntime(getRuntimeContext().kind)];
  }

  private getAdapterForProvider(providerId: IntegrationProviderId | undefined): AuthAdapter {
    if (providerId && PROVIDER_ADAPTERS[providerId]) {
      return PROVIDER_ADAPTERS[providerId];
    }

    return this.adapter;
  }

  getSession() {
    return this.session;
  }

  getSnapshot(): AuthSessionSnapshot {
    return buildSnapshot(this.session);
  }

  private updateSession(session: AuthSession | null) {
    this.session = session;
    writeStoredIntegrationSession(session);
    const snapshot = buildSnapshot(session);
    for (const listener of this.listeners) {
      listener(snapshot, session);
    }
  }

  async init(): Promise<AuthSessionSnapshot> {
    const legacyStoredSession = readStoredIntegrationSession();
    const nextSession =
      legacyStoredSession ??
      (await this.getAdapterForProvider(undefined).init()) ??
      (await this.getAdapterForProvider('homey').init());
    this.updateSession(nextSession);
    return this.getSnapshot();
  }

  async login(input?: {
    haBaseUrl?: string;
    hassUrl?: string;
    accessToken?: string;
    providerId?: IntegrationProviderId;
  }): Promise<AuthSessionSnapshot> {
    const targetProviderId = input?.providerId;
    const adapter = this.getAdapterForProvider(targetProviderId);

    if (!adapter.login) {
      throw new Error('Login is not available in this runtime');
    }

    const nextSession = await adapter.login({
      hassUrl: input?.haBaseUrl ?? input?.hassUrl,
      accessToken: input?.accessToken,
      providerId: input?.providerId,
    });
    this.updateSession(nextSession);
    return this.getSnapshot();
  }

  async refresh(): Promise<AuthSessionSnapshot> {
    if (!this.session) {
      return this.getSnapshot();
    }

    const adapter = this.getAdapterForProvider(this.session.providerId);

    if (!adapter.refresh) {
      return this.getSnapshot();
    }

    const nextSession = await adapter.refresh(this.session);
    this.updateSession(nextSession);
    return this.getSnapshot();
  }

  replaceSession(session: AuthSession | null): AuthSessionSnapshot {
    this.updateSession(session);
    return this.getSnapshot();
  }

  async logout(): Promise<void> {
    const adapter = this.session
      ? this.getAdapterForProvider(this.session.providerId)
      : this.adapter;
    this.updateSession(null);
    await adapter.logout?.();
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
