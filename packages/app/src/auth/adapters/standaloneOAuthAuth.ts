import { resolveAddonLocalEndpointUrl } from '@navet/app/utils/home-assistant-connection-target';
import type { AuthData } from 'home-assistant-js-websocket';
import { getAuth } from 'home-assistant-js-websocket';
import type { AuthAdapter, AuthSession } from '../types';

const AUTH_SESSION_ENDPOINT = '/__navet_auth__/session';
const AUTH_CREDENTIALS_ENDPOINT = '/__navet_auth__/session/credentials';
const AUTH_AUTHORIZE_ENDPOINT = '/__navet_auth__/authorize';
const AUTH_BINDING_HEADER = 'X-Navet-OAuth-Binding';
const AUTH_CALLBACK_PARAM = 'navet_oauth_callback';
const LEGACY_AUTH_CALLBACK_PARAM = 'auth_callback';
const OAUTH_CALLBACK_PARAMS = [AUTH_CALLBACK_PARAM, LEGACY_AUTH_CALLBACK_PARAM, 'code', 'state'];
const AUTH_SESSION_LOAD_TIMEOUT_MS = 3_000;
const STORED_SESSION_RESTORE_TIMEOUT_MS = 3_000;
const OAUTH_CALLBACK_RESTORE_TIMEOUT_MS = 10_000;

interface StandaloneSessionMetadata {
  authenticated: boolean;
  providerId: 'home_assistant';
  sessionId: string;
  hassUrl: string | null;
  clientId: string | null;
  expiresAt: number | null;
  expiresIn: number | null;
  userId: string | null;
  userName: string | null;
}

let latestSessionBinding: string | null = null;

export const standaloneOAuthNavigation = {
  assign(url: string) {
    window.location.assign(url);
  },
};

function getAuthEndpoint(path: string) {
  return resolveAddonLocalEndpointUrl(path);
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs = AUTH_SESSION_LOAD_TIMEOUT_MS
): Promise<Response | null> {
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
      fetch(input, {
        ...init,
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

function isSessionMetadata(value: unknown): value is StandaloneSessionMetadata {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const metadata = value as Partial<StandaloneSessionMetadata>;
  return (
    typeof metadata.authenticated === 'boolean' &&
    metadata.providerId === 'home_assistant' &&
    typeof metadata.sessionId === 'string' &&
    /^nas_[a-f0-9]{32}$/.test(metadata.sessionId) &&
    (metadata.hassUrl === null || typeof metadata.hassUrl === 'string') &&
    (metadata.userId === null || typeof metadata.userId === 'string') &&
    (metadata.userName === null || typeof metadata.userName === 'string')
  );
}

async function loadSessionMetadata(
  timeoutMs = AUTH_SESSION_LOAD_TIMEOUT_MS
): Promise<StandaloneSessionMetadata | null> {
  const response = await fetchWithTimeout(getAuthEndpoint(AUTH_SESSION_ENDPOINT), {}, timeoutMs);
  if (!response?.ok || !response.headers.get('Content-Type')?.includes('application/json')) {
    return null;
  }

  const metadata: unknown = await response.json();
  if (!isSessionMetadata(metadata)) {
    return null;
  }

  latestSessionBinding = metadata.sessionId;
  return metadata;
}

async function loadTokens(timeoutMs = AUTH_SESSION_LOAD_TIMEOUT_MS): Promise<AuthData | null> {
  const metadata = await loadSessionMetadata(timeoutMs);
  if (!metadata?.authenticated) {
    return null;
  }

  const response = await fetchWithTimeout(
    getAuthEndpoint(AUTH_CREDENTIALS_ENDPOINT),
    {
      method: 'POST',
      headers: {
        [AUTH_BINDING_HEADER]: metadata.sessionId,
      },
    },
    timeoutMs
  );
  if (
    !response ||
    response.status === 204 ||
    !response.ok ||
    !response.headers.get('Content-Type')?.includes('application/json')
  ) {
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

async function resolveSessionBinding(): Promise<string | null> {
  const metadata = await loadSessionMetadata().catch(() => null);
  return metadata?.sessionId ?? latestSessionBinding;
}

async function persistTokens(data: AuthData | null): Promise<void> {
  const binding = await resolveSessionBinding();
  const method = data ? 'PUT' : 'DELETE';
  const headers: Record<string, string> = {};
  if (binding) {
    headers[AUTH_BINDING_HEADER] = binding;
  }
  if (data) {
    headers['Content-Type'] = 'application/json';
  }

  await fetch(getAuthEndpoint(AUTH_SESSION_ENDPOINT), {
    method,
    cache: 'no-store',
    credentials: 'same-origin',
    headers,
    body: data ? JSON.stringify(data) : undefined,
  }).catch(() => undefined);

  if (!data) {
    latestSessionBinding = null;
  }
}

function saveTokens(data: AuthData | null): void {
  void persistTokens(data);
}

async function clearStoredTokens(): Promise<void> {
  await persistTokens(null);
}

// Standalone OAuth treats any invalid refresh/callback state as a full session invalidation.
export async function invalidateStandaloneOAuthSession(): Promise<void> {
  await clearStoredTokens();
}

function hasOAuthCallback() {
  const params = new URLSearchParams(window.location.search);
  return params.get(AUTH_CALLBACK_PARAM) === '1' || params.get(LEGACY_AUTH_CALLBACK_PARAM) === '1';
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

function toAuthSession(
  auth: Awaited<ReturnType<typeof getAuth>>,
  metadata: StandaloneSessionMetadata | null
): AuthSession {
  return {
    providerId: 'home_assistant',
    runtime: 'standalone-oauth',
    authMode: 'oauth',
    haBaseUrl: auth.data.hassUrl,
    hassUrl: auth.data.hassUrl,
    auth,
    expiresAt: auth.data.expires,
    userId: metadata?.userId ?? undefined,
  };
}

async function restoreSession(timeoutMs: number): Promise<AuthSession | null> {
  const storedTokens = await loadTokens(timeoutMs);
  if (!storedTokens) {
    return null;
  }

  const metadata = await loadSessionMetadata(timeoutMs);
  const auth = await withTimeout(
    getAuth({
      hassUrl: storedTokens.hassUrl,
      loadTokens: async () => storedTokens,
      saveTokens,
      limitHassInstance: true,
    }),
    timeoutMs
  );

  if (auth.expired) {
    await withTimeout(auth.refreshAccessToken(), timeoutMs);
  }
  await persistTokens(auth.data);
  return toAuthSession(auth, metadata);
}

async function beginOAuthLogin(hassUrl: string): Promise<never> {
  const metadata = await loadSessionMetadata();
  if (!metadata) {
    throw new Error('Unable to initialize the Navet browser session');
  }

  const response = await fetch(getAuthEndpoint(AUTH_AUTHORIZE_ENDPOINT), {
    method: 'POST',
    cache: 'no-store',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      [AUTH_BINDING_HEADER]: metadata.sessionId,
    },
    body: JSON.stringify({
      hassUrl,
      returnTo: `${window.location.pathname}${window.location.search}${window.location.hash}`,
    }),
  });
  if (!response.ok || !response.headers.get('Content-Type')?.includes('application/json')) {
    throw new Error('Unable to start Home Assistant OAuth');
  }

  const payload = (await response.json()) as { authorizeUrl?: unknown };
  if (typeof payload.authorizeUrl !== 'string' || !/^https?:\/\//.test(payload.authorizeUrl)) {
    throw new Error('Home Assistant returned an invalid authorization URL');
  }

  standaloneOAuthNavigation.assign(payload.authorizeUrl);
  return await new Promise<never>(() => undefined);
}

export const standaloneOAuthAuth: AuthAdapter = {
  providerId: 'home_assistant',
  kind: 'standalone-oauth',
  async init() {
    if (hasOAuthCallback()) {
      // home-assistant-js-websocket reserves `auth_callback` for its own
      // browser-side token exchange. Navet already exchanged the code on the
      // server, so clear both current and legacy callback parameters before
      // asking the library to wrap the stored credentials.
      clearOAuthCallbackUrl();
      try {
        const session = await restoreSession(OAUTH_CALLBACK_RESTORE_TIMEOUT_MS);
        if (!session) {
          throw new Error('Home Assistant OAuth callback did not create a session');
        }
        return session;
      } catch (error) {
        await invalidateStandaloneOAuthSession().catch(() => undefined);
        throw error;
      }
    }

    try {
      return await restoreSession(STORED_SESSION_RESTORE_TIMEOUT_MS);
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
    return await beginOAuthLogin(hassUrl);
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
        loadTokens: async () => storedTokens,
        limitHassInstance: true,
      }).catch(() => null);
      await Promise.resolve(auth?.revoke()).catch(() => undefined);
    }
    await invalidateStandaloneOAuthSession();
  },
};
