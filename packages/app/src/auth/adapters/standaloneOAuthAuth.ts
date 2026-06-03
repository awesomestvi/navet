import { resolveAddonLocalEndpointUrl } from '@navet/app/utils/home-assistant-connection-target';
import type { AuthData } from 'home-assistant-js-websocket';
import { getAuth } from 'home-assistant-js-websocket';
import type { AuthAdapter, AuthSession } from '../types';

const AUTH_SESSION_ENDPOINT = '/__navet_auth__/session';
const AUTH_CALLBACK_PARAM = 'auth_callback';
const OAUTH_CALLBACK_PARAMS = [AUTH_CALLBACK_PARAM, 'code', 'state'];
const AUTH_SESSION_LOAD_TIMEOUT_MS = 3_000;
const STORED_SESSION_RESTORE_TIMEOUT_MS = 3_000;

function getAuthSessionEndpoint() {
  return resolveAddonLocalEndpointUrl(AUTH_SESSION_ENDPOINT);
}

async function fetchAuthSessionResponse(timeoutMs = AUTH_SESSION_LOAD_TIMEOUT_MS) {
  const controller = new AbortController();
  let timeoutId: number | null = null;
  const timeoutPromise = new Promise<null>((resolve) => {
    timeoutId = window.setTimeout(() => {
      controller.abort();
      resolve(null);
    }, timeoutMs);
  });

  try {
    return await Promise.race([
      fetch(getAuthSessionEndpoint(), {
        cache: 'no-store',
        credentials: 'same-origin',
        signal: controller.signal,
      }),
      timeoutPromise,
    ]);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return null;
    }

    throw error;
  } finally {
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
    }
  }
}

async function loadTokens(): Promise<AuthData | null> {
  const response = await fetchAuthSessionResponse();
  if (response === null) {
    return null;
  }

  if (response.status === 204 || response.status === 404) {
    return null;
  }

  if (!response.ok || !response.headers.get('Content-Type')?.includes('application/json')) {
    return null;
  }

  return (await response.json()) as AuthData;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return await new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error('Timed out restoring Home Assistant session'));
    }, timeoutMs);

    void promise.then(resolve, reject).finally(() => {
      window.clearTimeout(timeoutId);
    });
  });
}

async function persistTokens(data: AuthData | null): Promise<void> {
  const method = data ? 'PUT' : 'DELETE';

  await fetch(getAuthSessionEndpoint(), {
    method,
    cache: 'no-store',
    credentials: 'same-origin',
    headers: data ? { 'Content-Type': 'application/json' } : undefined,
    body: data ? JSON.stringify(data) : undefined,
  }).catch(() => undefined);
}

function saveTokens(data: AuthData | null): void {
  void persistTokens(data);
}

async function noStoredTokens(): Promise<AuthData | null> {
  return null;
}

async function clearStoredTokens(): Promise<void> {
  await fetch(getAuthSessionEndpoint(), {
    method: 'DELETE',
    cache: 'no-store',
    credentials: 'same-origin',
  }).catch(() => undefined);
}

// Standalone OAuth treats any invalid refresh/callback state as a full session invalidation.
export async function invalidateStandaloneOAuthSession(): Promise<void> {
  await clearStoredTokens();
}

function hasOAuthCallback() {
  return new URLSearchParams(window.location.search).get(AUTH_CALLBACK_PARAM) === '1';
}

function clearOAuthCallbackUrl(): void {
  const params = new URLSearchParams(window.location.search);
  for (const param of OAUTH_CALLBACK_PARAMS) {
    params.delete(param);
  }

  const nextSearch = params.toString();
  const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}${window.location.hash}`;
  window.history.replaceState(null, '', nextUrl);
}

export const standaloneOAuthAuth: AuthAdapter = {
  providerId: 'home_assistant',
  kind: 'standalone-oauth',
  async init() {
    if (hasOAuthCallback()) {
      const auth = await getAuth({
        loadTokens,
        saveTokens,
      }).catch(async (error: unknown) => {
        await invalidateStandaloneOAuthSession();
        throw error;
      });

      if (auth.expired) {
        await auth.refreshAccessToken();
      }
      await persistTokens(auth.data);

      clearOAuthCallbackUrl();

      return {
        providerId: 'home_assistant',
        runtime: 'standalone-oauth',
        authMode: 'oauth',
        haBaseUrl: auth.data.hassUrl,
        hassUrl: auth.data.hassUrl,
        auth,
        expiresAt: auth.data.expires,
      };
    }

    const storedTokens = await loadTokens().catch(() => null);
    if (!storedTokens) {
      return null;
    }

    try {
      const auth = await withTimeout(
        getAuth({
          hassUrl: storedTokens.hassUrl,
          loadTokens,
          saveTokens,
          limitHassInstance: true,
        }),
        STORED_SESSION_RESTORE_TIMEOUT_MS
      );

      if (auth.expired) {
        await withTimeout(auth.refreshAccessToken(), STORED_SESSION_RESTORE_TIMEOUT_MS);
      }
      await persistTokens(auth.data);

      return {
        providerId: 'home_assistant',
        runtime: 'standalone-oauth',
        authMode: 'oauth',
        haBaseUrl: auth.data.hassUrl,
        hassUrl: auth.data.hassUrl,
        auth,
        expiresAt: auth.data.expires,
      };
    } catch {
      await invalidateStandaloneOAuthSession().catch(() => undefined);
      return null;
    }
  },
  async login(input): Promise<AuthSession> {
    if (!input?.hassUrl) {
      throw new Error('Home Assistant URL is required');
    }

    const hassUrl = input.hassUrl.trim().replace(/\/$/, '');
    const auth = await getAuth({
      hassUrl,
      redirectUrl: window.location.origin + window.location.pathname,
      saveTokens,
      loadTokens: noStoredTokens,
      limitHassInstance: true,
    });

    if (auth.expired) {
      await auth.refreshAccessToken();
    }
    await persistTokens(auth.data);

    return {
      providerId: 'home_assistant',
      runtime: 'standalone-oauth',
      authMode: 'oauth',
      haBaseUrl: auth.data.hassUrl,
      hassUrl: auth.data.hassUrl,
      auth,
      expiresAt: auth.data.expires,
    };
  },
  async refresh(session) {
    if (!session.auth) throw new Error('Missing OAuth session');
    await session.auth.refreshAccessToken();
    await persistTokens(session.auth.data);
    return {
      ...session,
      expiresAt: session.auth.data.expires,
    };
  },
  async invalidatePersistedSession() {
    await invalidateStandaloneOAuthSession();
  },
  async logout() {
    const storedTokens = await loadTokens().catch(() => null);
    if (storedTokens) {
      const auth = await getAuth({
        hassUrl: storedTokens.hassUrl,
        loadTokens,
        saveTokens,
        limitHassInstance: true,
      }).catch(() => null);
      await Promise.resolve(auth?.revoke()).catch(() => undefined);
    }
    await invalidateStandaloneOAuthSession();
  },
};
