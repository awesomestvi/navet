import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { haIngressAuth } from './adapters/haIngressAuth';
import { haPanelAuth } from './adapters/haPanelAuth';
import { standaloneOAuthAuth } from './adapters/standaloneOAuthAuth';
import { type AuthRuntime, detectAuthRuntime } from './runtime';
import type { AuthAdapter, AuthSession } from './types';

interface AuthContextValue {
  runtime: AuthRuntime;
  session: AuthSession | null;
  ready: boolean;
  error: string | null;
  hassUrl: string | null;
  login: (input?: { hassUrl?: string }) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const ADAPTERS: Record<AuthRuntime, AuthAdapter> = {
  'ha-panel': haPanelAuth,
  'ha-ingress': haIngressAuth,
  'standalone-oauth': standaloneOAuthAuth,
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const runtime = detectAuthRuntime();
  const adapter = ADAPTERS[runtime];
  const [session, setSession] = useState<AuthSession | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    localStorage.removeItem('ha_auth_config');
    localStorage.removeItem('ha-dashboard-config');
    localStorage.removeItem('navet-auth-config');
    localStorage.removeItem('navet_auth_session');
  }, []);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setError(null);
    void adapter
      .init()
      .then((result) => {
        if (cancelled) return;
        setSession(result);
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
    };
  }, [adapter]);

  useEffect(() => {
    if (!session?.expiresAt || !adapter.refresh) {
      return;
    }

    const delay = Math.max(5_000, session.expiresAt - Date.now() - 60_000);
    const timeoutId = window.setTimeout(() => {
      void adapter
        .refresh?.(session)
        .then((nextSession) => {
          setSession(nextSession);
          setError(null);
        })
        .catch((err) => {
          setSession(null);
          setError(err instanceof Error ? err.message : 'Authentication expired');
        });
    }, delay);

    return () => window.clearTimeout(timeoutId);
  }, [adapter, session]);

  const value = useMemo<AuthContextValue>(
    () => ({
      runtime,
      session,
      ready,
      error,
      hassUrl: session?.hassUrl ?? null,
      login: async (input) => {
        if (!adapter.login) return;
        const next = await adapter.login(input);
        setSession(next);
        setError(null);
      },
      logout: async () => {
        setSession(null);
        await adapter.logout?.();
      },
      refresh: async () => {
        if (!session || !adapter.refresh) return;
        const next = await adapter.refresh(session);
        setSession(next);
      },
    }),
    [runtime, session, ready, error, adapter]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthSession() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuthSession must be used within AuthProvider');
  return context;
}

export function useAuthBaseUrl() {
  return useContext(AuthContext)?.hassUrl ?? null;
}

export function useAuthLogout() {
  return useContext(AuthContext)?.logout ?? (() => Promise.resolve());
}
