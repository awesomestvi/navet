import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { IntegrationProviderDefinition, IntegrationProviderId } from '@/app/types/provider';
import { INTEGRATION_PROVIDERS } from '@/app/types/provider';
import {
  type IntegrationSessionSnapshot,
  integrationSessionRuntime,
} from './integration-session-runtime';
import type { AuthRuntime } from './runtime';
import type { AuthSession, AuthSessionMap } from './types';

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
    providerId?: IntegrationProviderId;
  }) => Promise<void>;
  logout: (providerId?: IntegrationProviderId) => Promise<void>;
  refresh: (providerId?: IntegrationProviderId) => Promise<AuthSession | null>;
  replaceSession: (session: AuthSession | null) => void;
  setActiveProvider: (providerId: IntegrationProviderId) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const runtime = integrationSessionRuntime.getAuthRuntime();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [snapshot, setSnapshot] = useState<IntegrationSessionSnapshot>(
    integrationSessionRuntime.getSnapshot()
  );
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    localStorage.removeItem('ha_auth_config');
    localStorage.removeItem('ha-dashboard-config');
    localStorage.removeItem('navet-auth-config');
  }, []);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setError(null);
    const unsubscribe = integrationSessionRuntime.subscribe((nextSnapshot, nextSession) => {
      if (cancelled) {
        return;
      }

      setSnapshot(nextSnapshot);
      setSession(nextSession);
    });

    void integrationSessionRuntime
      .init()
      .then((nextSnapshot) => {
        if (cancelled) return;
        setSnapshot(nextSnapshot);
        setSession(integrationSessionRuntime.getSession());
      })
      .catch((err) => {
        if (cancelled) return;
        setSession(null);
        setError(err instanceof Error ? err.message : 'Authentication failed');
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.expiresAt || snapshot.authMode !== 'oauth') {
      return;
    }

    const delay = Math.max(5_000, session.expiresAt - Date.now() - 60_000);
    const timeoutId = window.setTimeout(() => {
      void integrationSessionRuntime
        .refresh()
        .then((nextSnapshot) => {
          setSnapshot(nextSnapshot);
          setSession(integrationSessionRuntime.getSession());
          setError(null);
        })
        .catch((err) => {
          setSession(null);
          setError(err instanceof Error ? err.message : 'Authentication expired');
        });
    }, delay);

    return () => window.clearTimeout(timeoutId);
  }, [session, snapshot.authMode]);

  const value = useMemo<AuthContextValue>(
    () => ({
      providerId: snapshot.providerId,
      provider: INTEGRATION_PROVIDERS[snapshot.providerId],
      runtime,
      snapshot,
      session,
      sessions: snapshot.sessions,
      ready,
      error,
      hassUrl: session?.hassUrl ?? null,
      haBaseUrl: session?.haBaseUrl ?? null,
      login: async (input) => {
        const nextSnapshot = await integrationSessionRuntime.login(input);
        setSnapshot(nextSnapshot);
        setSession(integrationSessionRuntime.getSession());
        setError(null);
      },
      logout: async (providerId) => {
        if (!providerId || providerId === session?.providerId) {
          setSession(null);
        }
        await integrationSessionRuntime.logout(providerId);
        setSnapshot(integrationSessionRuntime.getSnapshot());
        setSession(integrationSessionRuntime.getSession());
      },
      refresh: async (providerId) => {
        const nextSnapshot = await integrationSessionRuntime.refresh(providerId);
        const nextSession = integrationSessionRuntime.getSession();
        setSnapshot(nextSnapshot);
        setSession(nextSession);
        return nextSession;
      },
      replaceSession: (nextSession) => {
        const nextSnapshot = integrationSessionRuntime.replaceSession(nextSession);
        setSnapshot(nextSnapshot);
        setSession(nextSession);
      },
      setActiveProvider: (providerId) => {
        const nextSnapshot = integrationSessionRuntime.setActiveProvider(providerId);
        setSnapshot(nextSnapshot);
        setSession(integrationSessionRuntime.getSession());
      },
    }),
    [runtime, snapshot, session, ready, error]
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
