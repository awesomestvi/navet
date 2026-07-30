import type {
  IntegrationProviderDefinition,
  IntegrationProviderId,
} from '@navet/app/types/provider';
import { INTEGRATION_PROVIDERS } from '@navet/app/types/provider';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { removeLocalStorageItem } from '../utils/storage';
import { isInvalidStandaloneOAuthAuthError } from './adapters/standaloneOAuthAuth';
import {
  type IntegrationSessionSnapshot,
  integrationSessionRuntime,
} from './integration-session-runtime';
import type { AuthRuntime } from './runtime';
import { isDurableAuthSessionUnavailableError } from './session-errors';
import { dispatchAuthSessionRefreshed } from './session-events';
import {
  type AuthSession,
  type AuthSessionMap,
  fromProviderSessionInput,
  fromProviderSessionMap,
  toAuthCompatibleSession,
} from './types';

interface AuthContextValue {
  providerId: IntegrationProviderId;
  provider: IntegrationProviderDefinition;
  runtime: AuthRuntime;
  snapshot: IntegrationSessionSnapshot;
  session: AuthSession | null;
  sessions: AuthSessionMap;
  ready: boolean;
  error: string | null;
  hassUrl: string | null;
  haBaseUrl: string | null;
  login: (input?: {
    hassUrl?: string;
    haBaseUrl?: string;
    accessToken?: string;
    username?: string;
    password?: string;
    providerId?: IntegrationProviderId;
  }) => Promise<void>;
  logout: (providerId?: IntegrationProviderId) => Promise<void>;
  refresh: (providerId?: IntegrationProviderId) => Promise<AuthSession | null>;
  retryInitialization: () => void;
  replaceSession: (session: AuthSession | null) => void;
  setActiveProvider: (providerId: IntegrationProviderId) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const AUTH_REFRESH_EARLY_MS = 60_000;
const AUTH_REFRESH_MIN_DELAY_MS = 5_000;
const AUTH_REFRESH_RETRY_DELAYS_MS = [5_000, 15_000, 30_000, 60_000] as const;
const AUTH_INIT_RETRY_DELAYS_MS = [5_000, 15_000, 30_000, 60_000] as const;

function getAuthErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Authentication expired';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const runtime = integrationSessionRuntime.getAuthRuntime();
  const refreshRequests = useRef<
    Partial<Record<IntegrationProviderId, Promise<AuthSession | null>>>
  >({});
  const [session, setSession] = useState<AuthSession | null>(null);
  const [snapshot, setSnapshot] = useState<IntegrationSessionSnapshot>(
    integrationSessionRuntime.getSnapshot()
  );
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initializationAttempt, setInitializationAttempt] = useState(0);
  const retryInitialization = useCallback(() => {
    setInitializationAttempt((attempt) => attempt + 1);
  }, []);
  const refreshProviderSession = useCallback((providerId: IntegrationProviderId) => {
    const existingRequest = refreshRequests.current[providerId];
    if (existingRequest) {
      return existingRequest;
    }

    const request = (async () => {
      const currentSnapshot = integrationSessionRuntime.getSnapshot();
      const sessionToRefresh = fromProviderSessionInput(currentSnapshot.sessions[providerId]);

      try {
        const nextSnapshot = await integrationSessionRuntime.refresh(providerId);
        const nextSession = fromProviderSessionInput(integrationSessionRuntime.getSession());
        const refreshedSession = fromProviderSessionInput(nextSnapshot.sessions[providerId]);
        setSnapshot(nextSnapshot);
        setSession(nextSession);
        setError(null);
        if (refreshedSession) {
          dispatchAuthSessionRefreshed(providerId);
        }
        return refreshedSession;
      } catch (err) {
        const isStandaloneHomeAssistantSession =
          sessionToRefresh?.providerId === 'home_assistant' &&
          sessionToRefresh.runtime === 'standalone-oauth';
        if (
          !isStandaloneHomeAssistantSession ||
          !isInvalidStandaloneOAuthAuthError(err) ||
          !integrationSessionRuntime.invalidatePersistedSession
        ) {
          throw err;
        }

        try {
          await integrationSessionRuntime.invalidatePersistedSession('home_assistant');
        } catch (invalidationError) {
          setError(getAuthErrorMessage(invalidationError));
          throw invalidationError;
        }

        const nextSnapshot = integrationSessionRuntime.getSnapshot();
        const nextSession = fromProviderSessionInput(integrationSessionRuntime.getSession());
        const refreshedSession = fromProviderSessionInput(nextSnapshot.sessions[providerId]);
        setSnapshot(nextSnapshot);
        setSession(nextSession);
        setError(nextSession ? null : getAuthErrorMessage(err));
        if (refreshedSession) {
          dispatchAuthSessionRefreshed(providerId);
        }
        return refreshedSession;
      }
    })();
    refreshRequests.current[providerId] = request;
    void request.then(
      () => {
        if (refreshRequests.current[providerId] === request) {
          delete refreshRequests.current[providerId];
        }
      },
      () => {
        if (refreshRequests.current[providerId] === request) {
          delete refreshRequests.current[providerId];
        }
      }
    );
    return request;
  }, []);

  useEffect(() => {
    removeLocalStorageItem('ha_auth_config');
    removeLocalStorageItem('ha-dashboard-config');
    removeLocalStorageItem('navet-auth-config');
  }, []);

  useEffect(() => {
    let cancelled = false;
    let initInFlight = false;
    let retryAttempt = 0;
    let retryPending = false;
    let retryTimer: number | null = null;
    setReady(false);
    setError(null);
    const unsubscribe = integrationSessionRuntime.subscribe((nextSnapshot, nextSession) => {
      if (cancelled) {
        return;
      }

      setSnapshot(nextSnapshot);
      setSession(fromProviderSessionInput(nextSession));
    });

    function clearRetryTimer() {
      if (retryTimer !== null) {
        window.clearTimeout(retryTimer);
        retryTimer = null;
      }
    }

    function scheduleRetry() {
      const delay =
        AUTH_INIT_RETRY_DELAYS_MS[Math.min(retryAttempt, AUTH_INIT_RETRY_DELAYS_MS.length - 1)];
      retryAttempt += 1;
      retryPending = true;
      clearRetryTimer();
      retryTimer = window.setTimeout(() => {
        retryTimer = null;
        void initialize();
      }, delay);
    }

    async function initialize() {
      if (cancelled || initInFlight) {
        return;
      }
      if (navigator.onLine === false) {
        scheduleRetry();
        return;
      }

      initInFlight = true;
      retryPending = false;
      try {
        const nextSnapshot = await integrationSessionRuntime.init();
        if (cancelled) {
          return;
        }
        setSnapshot(nextSnapshot);
        setSession(fromProviderSessionInput(integrationSessionRuntime.getSession()));
        setError(null);
        setReady(true);
      } catch (err) {
        if (cancelled) {
          return;
        }
        if (isDurableAuthSessionUnavailableError(err)) {
          setError(err.message);
          setReady(false);
          scheduleRetry();
          return;
        }
        setSession(null);
        setError(err instanceof Error ? err.message : 'Authentication failed');
        setReady(true);
      } finally {
        initInFlight = false;
      }
    }

    function recoverInitialization() {
      if (
        cancelled ||
        initInFlight ||
        !retryPending ||
        navigator.onLine === false ||
        document.visibilityState !== 'visible'
      ) {
        return;
      }
      clearRetryTimer();
      void initialize();
    }

    void initialize();
    window.addEventListener('online', recoverInitialization);
    document.addEventListener('visibilitychange', recoverInitialization);

    return () => {
      cancelled = true;
      clearRetryTimer();
      unsubscribe();
      window.removeEventListener('online', recoverInitialization);
      document.removeEventListener('visibilitychange', recoverInitialization);
    };
  }, [initializationAttempt]);

  const retainedHomeAssistantSession = fromProviderSessionInput(snapshot.sessions.home_assistant);

  useEffect(() => {
    const expiresAt = retainedHomeAssistantSession?.expiresAt;
    if (
      !retainedHomeAssistantSession ||
      typeof expiresAt !== 'number' ||
      retainedHomeAssistantSession.authMode !== 'oauth'
    ) {
      return;
    }

    const sessionToRefresh = retainedHomeAssistantSession;
    let cancelled = false;
    let refreshInFlight = false;
    let retryPending = false;
    let retryAttempt = 0;
    let timeoutId: number | null = null;
    const refreshDueAt = expiresAt - AUTH_REFRESH_EARLY_MS;

    function clearRefreshTimer() {
      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
        timeoutId = null;
      }
    }

    function scheduleRefresh(delay: number) {
      clearRefreshTimer();
      timeoutId = window.setTimeout(() => {
        timeoutId = null;
        void refreshSession();
      }, delay);
    }

    function scheduleTransientRetry() {
      const retryDelay =
        AUTH_REFRESH_RETRY_DELAYS_MS[
          Math.min(retryAttempt, AUTH_REFRESH_RETRY_DELAYS_MS.length - 1)
        ];
      retryAttempt += 1;
      retryPending = true;
      scheduleRefresh(retryDelay);
    }

    async function refreshSession() {
      if (cancelled || refreshInFlight) {
        return;
      }
      if (navigator.onLine === false) {
        scheduleTransientRetry();
        return;
      }

      refreshInFlight = true;
      retryPending = false;
      try {
        await refreshProviderSession(sessionToRefresh.providerId);
        if (cancelled) {
          return;
        }
      } catch (err) {
        if (cancelled) {
          return;
        }

        // A timeout, offline browser, network failure, or upstream server error
        // does not prove that the durable refresh token is invalid. Keep the
        // current dashboard alive and retry without destroying browser state.
        setError(getAuthErrorMessage(err));
        scheduleTransientRetry();
      } finally {
        refreshInFlight = false;
      }
    }

    function recoverRefresh() {
      if (
        cancelled ||
        refreshInFlight ||
        navigator.onLine === false ||
        document.visibilityState !== 'visible' ||
        (!retryPending && Date.now() < refreshDueAt)
      ) {
        return;
      }

      clearRefreshTimer();
      void refreshSession();
    }

    const delay =
      refreshDueAt <= Date.now()
        ? 0
        : Math.max(AUTH_REFRESH_MIN_DELAY_MS, refreshDueAt - Date.now());
    scheduleRefresh(delay);
    window.addEventListener('online', recoverRefresh);
    document.addEventListener('visibilitychange', recoverRefresh);

    return () => {
      cancelled = true;
      clearRefreshTimer();
      window.removeEventListener('online', recoverRefresh);
      document.removeEventListener('visibilitychange', recoverRefresh);
    };
  }, [retainedHomeAssistantSession, refreshProviderSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      providerId: snapshot.providerId,
      provider: INTEGRATION_PROVIDERS[snapshot.providerId],
      runtime,
      snapshot,
      session,
      sessions: fromProviderSessionMap(snapshot.sessions),
      ready,
      error,
      hassUrl: session?.hassUrl ?? null,
      haBaseUrl: session?.haBaseUrl ?? null,
      login: async (input) => {
        const nextSnapshot = await integrationSessionRuntime.login(input);
        setSnapshot(nextSnapshot);
        setSession(fromProviderSessionInput(integrationSessionRuntime.getSession()));
        setError(null);
      },
      logout: async (providerId) => {
        await integrationSessionRuntime.logout(providerId);
        setSnapshot(integrationSessionRuntime.getSnapshot());
        setSession(fromProviderSessionInput(integrationSessionRuntime.getSession()));
        setError(null);
      },
      refresh: async (providerId) => {
        const currentSnapshot = integrationSessionRuntime.getSnapshot();
        const targetProviderId = providerId ?? currentSnapshot.providerId;
        return await refreshProviderSession(targetProviderId);
      },
      retryInitialization,
      replaceSession: (nextSession) => {
        const nextSnapshot = integrationSessionRuntime.replaceSession(
          toAuthCompatibleSession(nextSession)
        );
        setSnapshot(nextSnapshot);
        setSession(nextSession);
      },
      setActiveProvider: (providerId) => {
        const nextSnapshot = integrationSessionRuntime.setActiveProvider(providerId);
        setSnapshot(nextSnapshot);
        setSession(fromProviderSessionInput(integrationSessionRuntime.getSession()));
      },
    }),
    [runtime, snapshot, session, ready, error, retryInitialization, refreshProviderSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthSession() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuthSession must be used within AuthProvider');
  return context;
}

export function useOptionalAuthSession() {
  return useContext(AuthContext);
}

export function useAuthBaseUrl() {
  return useContext(AuthContext)?.haBaseUrl ?? null;
}

export function useIntegrationSession() {
  return useAuthSession();
}

export function useCurrentIntegrationProvider() {
  return useAuthSession().provider;
}

export function useAuthLogout() {
  return (
    useContext(AuthContext)?.logout ?? ((_providerId?: IntegrationProviderId) => Promise.resolve())
  );
}
