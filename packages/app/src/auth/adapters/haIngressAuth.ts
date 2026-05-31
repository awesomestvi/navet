import { storage } from '@navet/app/utils/storage';
import type { AuthData } from 'home-assistant-js-websocket';
import { getAuth } from 'home-assistant-js-websocket';
import type { AuthAdapter, AuthSession } from '../types';

const HOME_ASSISTANT_TOKENS_KEY = 'hassTokens';
const INGRESS_AUTH_RESTORE_TIMEOUT_MS = 3_000;

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

function readStoredTokens(storageArea: Storage): unknown {
  if (storageArea === window.localStorage) {
    return storage.get<unknown>(HOME_ASSISTANT_TOKENS_KEY, null);
  }

  return JSON.parse(storageArea.getItem(HOME_ASSISTANT_TOKENS_KEY) ?? 'null');
}

function readHomeAssistantFrontendTokens(): AuthData | null {
  const storages = [
    () => window.localStorage,
    () => window.sessionStorage,
    () => window.parent?.localStorage,
    () => window.parent?.sessionStorage,
  ];

  for (const getStorage of storages) {
    try {
      const storageArea = getStorage();
      if (!storageArea) {
        continue;
      }

      const stored = readStoredTokens(storageArea);
      if (isAuthData(stored)) {
        return stored;
      }

      if (stored && typeof stored === 'object' && 'data' in stored && isAuthData(stored.data)) {
        return stored.data;
      }
    } catch {
      // Ignore unavailable or cross-context storage and continue checking.
    }
  }

  return null;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return await new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error('Timed out restoring Home Assistant ingress session'));
    }, timeoutMs);

    void promise.then(resolve, reject).finally(() => {
      window.clearTimeout(timeoutId);
    });
  });
}

export const haIngressAuth: AuthAdapter = {
  providerId: 'home_assistant',
  kind: 'ha-ingress',
  async init(): Promise<AuthSession | null> {
    const hassUrl = window.location.origin;
    const frontendTokens = readHomeAssistantFrontendTokens();

    if (frontendTokens) {
      try {
        const auth = await withTimeout(
          getAuth({
            loadTokens: async () => frontendTokens,
          }),
          INGRESS_AUTH_RESTORE_TIMEOUT_MS
        );
        if (auth.expired) {
          await withTimeout(auth.refreshAccessToken(), INGRESS_AUTH_RESTORE_TIMEOUT_MS);
        }

        return {
          providerId: 'home_assistant',
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
      providerId: 'home_assistant',
      runtime: 'ha-ingress',
      authMode: 'ingress_session',
      haBaseUrl: window.location.origin,
      hassUrl: window.location.origin,
    };
  },
  async refresh() {
    return (
      (await this.init()) ?? {
        providerId: 'home_assistant',
        runtime: 'ha-ingress',
        authMode: 'ingress_session',
        haBaseUrl: window.location.origin,
        hassUrl: window.location.origin,
      }
    );
  },
};
