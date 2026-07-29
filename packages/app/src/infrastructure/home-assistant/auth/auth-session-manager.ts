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
import {
  readLocalStorageString,
  removeLocalStorageItem,
  writeLocalStorageString,
} from '@navet/app/utils/storage';
import type { Auth } from 'home-assistant-js-websocket';
import { toLegacyAuthRuntime } from '../runtime/runtime-context';
import { getRuntimeContext } from '../runtime/runtime-detector';

const LEGACY_STORED_INTEGRATION_SESSION_KEY = 'navet_auth_session';
const LAST_ACTIVE_PROVIDER_KEY = 'navet_active_provider';
const PROVIDER_RESTORE_RETRY_DELAYS_MS = [5_000, 15_000, 30_000, 60_000] as const;

type AuthStateListener = (snapshot: AuthSessionSnapshot, session: AuthSession | null) => void;
type ProviderRestoreRetry = {
  attempt: number;
  generation: number;
  inFlight: boolean;
  timerId: number | null;
};

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

  const value = readLocalStorageString(LAST_ACTIVE_PROVIDER_KEY);
  return value && isIntegrationProviderId(value) ? value : null;
}

function writeStoredActiveProviderId(providerId: IntegrationProviderId | null): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (!providerId) {
    removeLocalStorageItem(LAST_ACTIVE_PROVIDER_KEY);
    return;
  }

  writeLocalStorageString(LAST_ACTIVE_PROVIDER_KEY, providerId);
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

function clearLegacyStoredIntegrationSession(): void {
  if (typeof window === 'undefined') {
    return;
  }

  removeLocalStorageItem(LEGACY_STORED_INTEGRATION_SESSION_KEY);
}

function getInitProviderOrder(): IntegrationProviderId[] {
  const runtime = getRuntimeContext().kind;

  if (runtime === 'ha_panel') {
    return ['home_assistant'];
  }

  return ['home_assistant', 'homey', 'openhab'];
}

export class AuthSessionManager {
  private sessions: AuthSessionMap = {};
  private activeProviderId: IntegrationProviderId | null = readStoredActiveProviderId();
  private listeners = new Set<AuthStateListener>();
  private providerRestoreRetries = new Map<IntegrationProviderId, ProviderRestoreRetry>();
  private initGeneration = 0;
  private sessionRevision = 0;
  private providerGenerations = new Map<IntegrationProviderId, number>();

  private get adapter(): AuthAdapter {
    return LEGACY_ADAPTERS[toLegacyAuthRuntime(getRuntimeContext().kind)];
  }

  private getAdapterForProvider(providerId: IntegrationProviderId | undefined): AuthAdapter {
    if (!providerId || providerId === 'home_assistant') {
      return this.adapter;
    }

    const adapter = PROVIDER_ADAPTERS[providerId];
    if (!adapter) {
      throw new Error(`Authentication is not available for provider "${providerId}"`);
    }

    return adapter;
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
    this.sessionRevision += 1;
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

  private clearProviderRestoreRetry(providerId: IntegrationProviderId) {
    const retry = this.providerRestoreRetries.get(providerId);
    if (retry?.timerId !== null && retry?.timerId !== undefined) {
      window.clearTimeout(retry.timerId);
    }
    this.providerRestoreRetries.delete(providerId);
  }

  private clearAllProviderRestoreRetries() {
    for (const providerId of this.providerRestoreRetries.keys()) {
      this.clearProviderRestoreRetry(providerId);
    }
  }

  private getProviderGeneration(providerId: IntegrationProviderId): number {
    return this.providerGenerations.get(providerId) ?? 0;
  }

  private bumpProviderGeneration(providerId: IntegrationProviderId): number {
    const generation = this.getProviderGeneration(providerId) + 1;
    this.providerGenerations.set(providerId, generation);
    return generation;
  }

  private beginProviderOperation(providerId: IntegrationProviderId): number {
    // Explicit login/logout/invalidation always wins over an older whole-app
    // restore or a delayed provider restore that is already awaiting I/O.
    this.initGeneration += 1;
    const generation = this.bumpProviderGeneration(providerId);
    this.clearProviderRestoreRetry(providerId);
    return generation;
  }

  private resetSessionDiscovery(): number {
    const generation = this.initGeneration + 1;
    this.initGeneration = generation;
    this.clearAllProviderRestoreRetries();
    for (const providerId of INTEGRATION_PROVIDER_IDS) {
      this.bumpProviderGeneration(providerId);
    }
    return generation;
  }

  private isProviderGenerationCurrent(
    providerId: IntegrationProviderId,
    generation: number
  ): boolean {
    return this.getProviderGeneration(providerId) === generation;
  }

  private scheduleProviderRestore(providerId: IntegrationProviderId) {
    if (typeof window === 'undefined') {
      return;
    }

    const generation = this.getProviderGeneration(providerId);
    const existingRetry = this.providerRestoreRetries.get(providerId);
    const retry =
      existingRetry?.generation === generation
        ? existingRetry
        : {
            attempt: 0,
            generation,
            inFlight: false,
            timerId: null,
          };
    if (retry.timerId !== null || retry.inFlight) {
      return;
    }

    const delay =
      PROVIDER_RESTORE_RETRY_DELAYS_MS[
        Math.min(retry.attempt, PROVIDER_RESTORE_RETRY_DELAYS_MS.length - 1)
      ];
    retry.timerId = window.setTimeout(async () => {
      retry.timerId = null;
      if (
        !this.isProviderGenerationCurrent(providerId, generation) ||
        this.providerRestoreRetries.get(providerId) !== retry
      ) {
        return;
      }
      retry.inFlight = true;
      try {
        const session = await this.getAdapterForProvider(providerId).init();
        if (
          !this.isProviderGenerationCurrent(providerId, generation) ||
          this.providerRestoreRetries.get(providerId) !== retry
        ) {
          return;
        }
        retry.inFlight = false;
        this.providerRestoreRetries.delete(providerId);
        if (session) {
          this.updateSessions((current) => ({
            ...current,
            [providerId]: session,
          }));
        }
      } catch {
        if (
          !this.isProviderGenerationCurrent(providerId, generation) ||
          this.providerRestoreRetries.get(providerId) !== retry
        ) {
          return;
        }
        retry.inFlight = false;
        retry.attempt += 1;
        this.providerRestoreRetries.set(providerId, retry);
        this.scheduleProviderRestore(providerId);
      }
    }, delay);
    this.providerRestoreRetries.set(providerId, retry);
  }

  async init(): Promise<AuthSessionSnapshot> {
    // Legacy openHAB sessions stored plaintext credentials in localStorage. Never
    // hydrate them into browser memory; the server-bound adapter is authoritative.
    clearLegacyStoredIntegrationSession();
    const initGeneration = this.resetSessionDiscovery();
    const initialSessionRevision = this.sessionRevision;
    const providerOrder = getInitProviderOrder();
    const discoveredSessions: AuthSessionMap = {};

    const sessionResults = await Promise.allSettled(
      providerOrder.map(async (providerId) => ({
        providerId,
        session: await this.getAdapterForProvider(providerId).init(),
      }))
    );

    if (this.initGeneration !== initGeneration || this.sessionRevision !== initialSessionRevision) {
      return this.getSnapshot();
    }

    const failures = new Map<IntegrationProviderId, unknown>();
    for (let index = 0; index < sessionResults.length; index += 1) {
      const result = sessionResults[index];
      const providerId = providerOrder[index];
      if (!result || !providerId) {
        continue;
      }
      if (result.status === 'rejected') {
        failures.set(providerId, result.reason);
        continue;
      }
      const { session } = result.value;
      this.clearProviderRestoreRetry(providerId);
      if (session) {
        discoveredSessions[providerId] = session;
      }
    }

    if (Object.keys(discoveredSessions).length === 0) {
      // A missing durable endpoint for the provider that was active before reload
      // is not evidence that the user logged out. Keep startup pending and retry.
      const activeProviderFailure = this.activeProviderId
        ? failures.get(this.activeProviderId)
        : undefined;
      if (activeProviderFailure !== undefined) {
        throw activeProviderFailure;
      }

      // Home Assistant is the primary standalone session. If its endpoint is
      // unavailable, showing Login would turn a transient backend outage into a
      // false logout. Optional provider failures do not block a confirmed-clean
      // Home Assistant startup.
      const homeAssistantFailure = failures.get('home_assistant');
      if (homeAssistantFailure !== undefined) {
        throw homeAssistantFailure;
      }

      // The browser-visible active-provider hint is disposable localStorage,
      // while provider sessions live in HttpOnly cookies. If localStorage was
      // cleared, even an "optional" provider endpoint failure can be hiding the
      // user's only durable session. Do not publish a false logged-out state
      // until every provider has authoritatively returned no session.
      if (failures.size > 0) {
        throw failures.values().next().value;
      }
    }

    this.updateSessions(discoveredSessions);
    for (const providerId of failures.keys()) {
      this.scheduleProviderRestore(providerId);
    }
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
    const expectedProviderId = targetProviderId ?? 'home_assistant';

    if (!adapter.login) {
      throw new Error('Login is not available in this runtime');
    }

    const providerGeneration = this.beginProviderOperation(expectedProviderId);
    const nextSession = await adapter.login({
      hassUrl: input?.haBaseUrl ?? input?.hassUrl,
      accessToken: input?.accessToken,
      username: input?.username,
      password: input?.password,
      providerId: input?.providerId,
    });
    if (!this.isProviderGenerationCurrent(expectedProviderId, providerGeneration)) {
      return this.getSnapshot();
    }
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

    const providerGeneration = this.getProviderGeneration(currentSession.providerId);
    const nextSession = await adapter.refresh(currentSession);
    if (
      !this.isProviderGenerationCurrent(currentSession.providerId, providerGeneration) ||
      this.sessions[currentSession.providerId] !== currentSession
    ) {
      return this.getSnapshot();
    }
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
    if (!adapter.invalidatePersistedSession) {
      return;
    }

    const providerGeneration = this.beginProviderOperation(currentSession.providerId);
    await adapter.invalidatePersistedSession(currentSession);
    if (
      !this.isProviderGenerationCurrent(currentSession.providerId, providerGeneration) ||
      this.sessions[currentSession.providerId] !== currentSession
    ) {
      return;
    }
    this.updateSessions((current) => {
      const next = { ...current };
      delete next[currentSession.providerId];
      return next;
    });
  }

  replaceSession(session: AuthSession | null): AuthSessionSnapshot {
    if (!session) {
      this.resetSessionDiscovery();
      this.updateSessions({}, null);
      return this.getSnapshot();
    }

    this.beginProviderOperation(session.providerId);
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
    if (!targetProviderId || !session) {
      return;
    }

    const adapter = this.getAdapterForProvider(session.providerId);
    const providerGeneration = this.beginProviderOperation(targetProviderId);
    await adapter.logout?.();
    if (
      !this.isProviderGenerationCurrent(targetProviderId, providerGeneration) ||
      this.sessions[targetProviderId] !== session
    ) {
      return;
    }
    this.updateSessions((current) => {
      const next = { ...current };
      delete next[targetProviderId];
      return next;
    });
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
