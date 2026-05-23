import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/app/stores/auth-store';
import { haIngressAuth } from './adapters/haIngressAuth';
import { haPanelAuth } from './adapters/haPanelAuth';
import { legacyTokenAuth } from './adapters/legacyTokenAuth';
import { standaloneOAuthAuth } from './adapters/standaloneOAuthAuth';
import { type AuthRuntime, detectAuthRuntime } from './runtime';
import type { AuthAdapter, AuthSession } from './types';

interface AuthContextValue {
  runtime: AuthRuntime;
  session: AuthSession | null;
  ready: boolean;
  login: (input?: { hassUrl?: string; token?: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const ADAPTERS: Record<AuthRuntime, AuthAdapter> = {
  'ha-panel': haPanelAuth,
  'ha-ingress': haIngressAuth,
  'standalone-oauth': standaloneOAuthAuth,
  'legacy-token': legacyTokenAuth,
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const runtime = detectAuthRuntime();
  const adapter = ADAPTERS[runtime];
  const [session, setSession] = useState<AuthSession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    localStorage.removeItem('ha_auth_config');
    localStorage.removeItem('ha-dashboard-config');
  }, []);

  useEffect(() => {
    const legacyStoreSession = useAuthStore.getState().config;
    if (legacyStoreSession?.url && legacyStoreSession?.token) {
      setSession({
        hassUrl: legacyStoreSession.url,
        accessToken: legacyStoreSession.token,
      });
      setReady(true);
      return;
    }

    void adapter.init().then((result) => {
      setSession(result);
      setReady(true);
    });
  }, [adapter]);

  const value = useMemo<AuthContextValue>(
    () => ({
      runtime,
      session,
      ready,
      login: async (input) => {
        if (!adapter.login) return;
        const next = await adapter.login(input);
        setSession(next);
      },
      logout: async () => {
        useAuthStore.getState().logout();
        setSession(null);
        await adapter.logout?.();
      },
    }),
    [runtime, session, ready, adapter]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthSession() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuthSession must be used within AuthProvider');
  return context;
}
