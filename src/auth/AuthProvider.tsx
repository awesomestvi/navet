import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  type AuthSessionSnapshot,
  authSessionManager,
} from '@/app/infrastructure/home-assistant/auth/auth-session-manager';
import { toLegacyAuthRuntime } from '@/app/infrastructure/home-assistant/runtime/runtime-context';
import { getRuntimeContext } from '@/app/infrastructure/home-assistant/runtime/runtime-detector';
import type { AuthRuntime } from './runtime';
import type { AuthSession } from './types';

interface AuthContextValue {
  runtime: AuthRuntime;
  snapshot: AuthSessionSnapshot;
  session: AuthSession | null;
  ready: boolean;
  error: string | null;
  hassUrl: string | null;
  haBaseUrl: string | null;
  login: (input?: { hassUrl?: string; haBaseUrl?: string }) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<AuthSession | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const runtime = toLegacyAuthRuntime(getRuntimeContext().kind);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [snapshot, setSnapshot] = useState<AuthSessionSnapshot>(authSessionManager.getSnapshot());
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
    const unsubscribe = authSessionManager.subscribe((nextSnapshot, nextSession) => {
      if (cancelled) {
        return;
      }

      setSnapshot(nextSnapshot);
      setSession(nextSession);
    });

    void authSessionManager
      .init()
      .then((nextSnapshot) => {
        if (cancelled) return;
        setSnapshot(nextSnapshot);
        setSession(authSessionManager.getSession());
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
      void authSessionManager
        .refresh()
        .then((nextSnapshot) => {
          setSnapshot(nextSnapshot);
          setSession(authSessionManager.getSession());
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
      runtime,
      snapshot,
      session,
      ready,
      error,
      hassUrl: session?.hassUrl ?? null,
      haBaseUrl: session?.haBaseUrl ?? null,
      login: async (input) => {
        const nextSnapshot = await authSessionManager.login(input);
        setSnapshot(nextSnapshot);
        setSession(authSessionManager.getSession());
        setError(null);
      },
      logout: async () => {
        setSession(null);
        await authSessionManager.logout();
      },
      refresh: async () => {
        const nextSnapshot = await authSessionManager.refresh();
        const nextSession = authSessionManager.getSession();
        setSnapshot(nextSnapshot);
        setSession(nextSession);
        return nextSession;
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

export function useAuthBaseUrl() {
  return useContext(AuthContext)?.haBaseUrl ?? null;
}

export function useAuthLogout() {
  return useContext(AuthContext)?.logout ?? (() => Promise.resolve());
}
