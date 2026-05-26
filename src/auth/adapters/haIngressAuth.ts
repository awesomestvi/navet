import type { AuthData } from 'home-assistant-js-websocket';
import { getAuth } from 'home-assistant-js-websocket';
import { storage } from '@/app/utils/storage';
import type { AuthAdapter, AuthSession } from '../types';

const HOME_ASSISTANT_TOKENS_KEY = 'hassTokens';

function isAuthData(value: unknown): value is AuthData {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const data = value as Partial<AuthData>;
  return (
    typeof data.hassUrl === 'string' &&
    /^https?:\/\//.test(data.hassUrl) &&
    (typeof data.clientId === 'string' || data.clientId === null) &&
    typeof data.expires === 'number' &&
    typeof data.refresh_token === 'string' &&
    typeof data.access_token === 'string' &&
    typeof data.expires_in === 'number'
  );
}

function readHomeAssistantFrontendTokens(): AuthData | null {
  const stored = storage.get<unknown>(HOME_ASSISTANT_TOKENS_KEY, null);
  if (isAuthData(stored)) {
    return stored;
  }

  if (stored && typeof stored === 'object' && 'data' in stored && isAuthData(stored.data)) {
    return stored.data;
  }

  return null;
}

export const haIngressAuth: AuthAdapter = {
  kind: 'ha-ingress',
  async init(): Promise<AuthSession | null> {
    const hassUrl = window.location.origin;
    const frontendTokens = readHomeAssistantFrontendTokens();

    if (frontendTokens) {
      try {
        const auth = await getAuth({
          loadTokens: async () => frontendTokens,
        });
        if (auth.expired) {
          await auth.refreshAccessToken();
        }

        return {
          runtime: 'ha-ingress',
          authMode: 'ingress_session',
          haBaseUrl: hassUrl,
          hassUrl,
          auth,
          expiresAt: auth.data.expires,
        };
      } catch {
        // Home Assistant owns the frontend token cache. If it is unavailable or
        // stale, keep ingress on the same-origin proxy path instead of starting
        // a standalone OAuth redirect from inside the add-on frame.
      }
    }

    return {
      runtime: 'ha-ingress',
      authMode: 'ingress_session',
      haBaseUrl: window.location.origin,
      hassUrl: window.location.origin,
    };
  },
};
