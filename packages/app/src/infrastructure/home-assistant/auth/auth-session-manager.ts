import { haIngressAuth } from '@navet/app/auth/adapters/haIngressAuth';
import { haPanelAuth } from '@navet/app/auth/adapters/haPanelAuth';
import { homeyOAuthAuth } from '@navet/app/auth/adapters/homeyOAuthAuth';
import { openhabUrlSessionAuth } from '@navet/app/auth/adapters/openhabUrlSessionAuth';
import { standaloneOAuthAuth } from '@navet/app/auth/adapters/standaloneOAuthAuth';
import type { AuthSessionSnapshot } from '@navet/app/auth/session-runtime-types';
import {
  type AuthAdapter,
  type AuthSession,
  type AuthSessionMap,
  toAuthCompatibleSessionMap,
} from '@navet/app/auth/types';
import {
  INTEGRATION_PROVIDER_IDS,
  type IntegrationProviderId,
  isIntegrationProviderId,
} from '@navet/app/types/provider';
import type { Auth } from 'home-assistant-js-websocket';
import { toLegacyAuthRuntime } from '../runtime/runtime-context';
import { getRuntimeContext } from '../runtime/runtime-detector';

const LEGACY_STORED_INTEGRATION_SESSION_KEY = 'navet_auth_session';
const LAST_ACTIVE_PROVIDER_KEY = 'navet_active_provider';

type AuthStateListener = (snapshot: AuthSessionSnapshot, session: AuthSession | null) => void;

const LEGACY_ADAPTERS: Record<ReturnType<typeof toLegacyAuthRuntime>, AuthAdapter> = {
  'ha-panel': haPanelAuth,
  'ha-ingress': haIngressAuth,
  'standalone-oauth': standaloneOAuthAuth,
};

const PROVIDER_ADAPTERS: Partial<Record<IntegrationProviderId, AuthAdapter>> = {
  homey: homeyOAuthAuth,
  openhab: openhabUrlSessionAuth,
};

function readStoredActiveProviderId(): IntegrationProviderId | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const value = window.localStorage.getItem(LAST_ACTIVE_PROVIDER_KEY);
  return value && isIntegrationProviderId(value) ? value : null;
}

function writeStoredActiveProviderId(providerId: IntegrationProviderId | null): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (!providerId) {
    window.localStorage.removeItem(LAST_ACTIVE_PROVIDER_KEY);
    return;
  }

  window.localStorage.setItem(LAST_ACTIVE_PROVIDER_KEY, providerId);
}

function buildSnapshot(session: AuthSession | null, sessions: AuthSessionMap): AuthSessionSnapshot {
  const runtime = getRuntimeContext().kind;
  const authenticatedProviderIds = Object.keys(sessions).filter(
    (providerId): providerId is IntegrationProviderId => isIntegrationProviderId(providerId)
  );

  if (!session) {
    return {
      providerId: 'home_assistant',
      runtime,
      authMode: getRuntimeContext().authMode,
      haBaseUrl: getRuntimeContext().haBaseUrl,
      isAuthenticated: false,
      sessions: toAuthCompatibleSessionMap(sessions),
      authenticatedProviderIds,
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
    sessions: toAuthCompatibleSessionMap(sessions),
    authenticatedProviderIds,
  };
}

function readLegacyStoredIntegrationSession(): AuthSession | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(LEGACY_STORED_INTEGRATION_SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as AuthSession;
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      parsed.providerId !== 'openhab' ||
      typeof parsed.username !== 'string' ||
      parsed.username.trim().length === 0 ||
      typeof parsed.password !== 'string' ||
      parsed.password.length === 0
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function clearLegacyStoredIntegrationSession(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(LEGACY_STORED_INTEGRATION_SESSION_KEY);
}

function getInitProviderOrder(): IntegrationProviderId[] {
  const runtime = getRuntimeContext().kind;

  if (runtime === 'ha_panel' || runtime === 'ha_ingress') {
    return ['home_assistant'];
  }

  return ['home_assistant', 'homey', 'openhab'];
}

export class AuthSessionManager {
  private sessions: AuthSessionMap = {};
  private activeProviderId: IntegrationProviderId | null = readStoredActiveProviderId();
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
    return this.activeProviderId ? (this.sessions[this.activeProviderId] ?? null) : null;
  }

  getSessions(): AuthSessionMap {
    return { ...this.sessions };
  }

  getSnapshot(): AuthSessionSnapshot {
    return buildSnapshot(this.getSession(), this.getSessions());
  }

  private resolveActiveProviderId(): IntegrationProviderId | null {
    if (this.activeProviderId && this.sessions[this.activeProviderId]) {
      return this.activeProviderId;
    }

    return INTEGRATION_PROVIDER_IDS.find((providerId) => this.sessions[providerId]) ?? null;
  }

  private updateSessions(
    updater: AuthSessionMap | ((current: AuthSessionMap) => AuthSessionMap),
    nextActiveProviderId?: IntegrationProviderId | null
  ) {
    this.sessions = typeof updater === 'function' ? updater(this.sessions) : updater;
    const activeProviderId =
      nextActiveProviderId === undefined ? this.resolveActiveProviderId() : nextActiveProviderId;
    this.activeProviderId = activeProviderId;
    clearLegacyStoredIntegrationSession();
    writeStoredActiveProviderId(activeProviderId);
    const session = this.getSession();
    const snapshot = buildSnapshot(session, this.getSessions());
    for (const listener of this.listeners) {
      listener(snapshot, session);
    }
  }

  async init(): Promise<AuthSessionSnapshot> {
    const legacyStoredSession = readLegacyStoredIntegrationSession();
    const providerOrder = getInitProviderOrder();
    const discoveredSessions: AuthSessionMap = {};

    if (legacyStoredSession?.providerId === 'openhab' && providerOrder.includes('openhab')) {
      discoveredSessions.openhab = legacyStoredSession;
    }

    const sessionResults = await Promise.all(
      providerOrder.map(async (providerId) => ({
        providerId,
        session: await this.getAdapterForProvider(providerId).init(),
      }))
    );

    for (const { providerId, session } of sessionResults) {
      if (session) {
        discoveredSessions[providerId] = session;
      }
    }

    this.updateSessions(discoveredSessions);
    return this.getSnapshot();
  }

  async login(input?: {
    haBaseUrl?: string;
    hassUrl?: string;
    accessToken?: string;
    username?: string;
    password?: string;
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
      username: input?.username,
      password: input?.password,
      providerId: input?.providerId,
    });
    this.updateSessions((current) => ({
      ...current,
      [nextSession.providerId]: nextSession,
    }));
    return this.getSnapshot();
  }

  async refresh(providerId?: IntegrationProviderId): Promise<AuthSessionSnapshot> {
    const targetProviderId = providerId ?? this.activeProviderId;
    const currentSession = targetProviderId ? this.sessions[targetProviderId] : null;
    if (!currentSession) {
      return this.getSnapshot();
    }

    const adapter = this.getAdapterForProvider(currentSession.providerId);

    if (!adapter.refresh) {
      return this.getSnapshot();
    }

    const nextSession = await adapter.refresh(currentSession);
    this.updateSessions((current) => ({
      ...current,
      [nextSession.providerId]: nextSession,
    }));
    return this.getSnapshot();
  }

  async invalidatePersistedSession(providerId?: IntegrationProviderId): Promise<void> {
    const targetProviderId = providerId ?? this.activeProviderId;
    const currentSession = targetProviderId ? this.sessions[targetProviderId] : null;
    if (!currentSession) {
      return;
    }

    const adapter = this.getAdapterForProvider(currentSession.providerId);
    await adapter.invalidatePersistedSession?.(currentSession);
  }

  replaceSession(session: AuthSession | null): AuthSessionSnapshot {
    if (!session) {
      this.updateSessions({}, null);
      return this.getSnapshot();
    }

    this.updateSessions(
      (current) => ({
        ...current,
        [session.providerId]: session,
      }),
      session.providerId
    );
    return this.getSnapshot();
  }

  setActiveProvider(providerId: IntegrationProviderId): AuthSessionSnapshot {
    this.activeProviderId = this.sessions[providerId] ? providerId : this.resolveActiveProviderId();
    writeStoredActiveProviderId(this.activeProviderId);
    return this.getSnapshot();
  }

  async logout(providerId?: IntegrationProviderId): Promise<void> {
    const targetProviderId = providerId ?? this.activeProviderId;
    const session = targetProviderId ? this.sessions[targetProviderId] : null;
    const adapter = session ? this.getAdapterForProvider(session.providerId) : this.adapter;
    if (targetProviderId) {
      this.updateSessions((current) => {
        const next = { ...current };
        delete next[targetProviderId];
        return next;
      });
    } else {
      this.updateSessions({}, null);
    }
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
