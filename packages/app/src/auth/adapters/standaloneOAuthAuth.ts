import { resolveAddonLocalEndpointUrl } from '@navet/app/utils/home-assistant-connection-target';
import type { AuthData } from 'home-assistant-js-websocket';
import { ERR_INVALID_AUTH, getAuth } from 'home-assistant-js-websocket';
import {
  clearInstallationPairingKey,
  getInstallationPairingHeaders,
} from '../installation-pairing';
import {
  DurableAuthSessionUnavailableError,
  isDurableAuthSessionUnavailableError,
} from '../session-errors';
import type { AuthAdapter, AuthSession } from '../types';

const AUTH_SESSION_ENDPOINT = '/__navet_auth__/session';
const AUTH_CREDENTIALS_ENDPOINT = '/__navet_auth__/session/credentials';
const AUTH_AUTHORIZE_ENDPOINT = '/__navet_auth__/authorize';
const AUTH_BINDING_HEADER = 'X-Navet-OAuth-Binding';
const AUTH_CALLBACK_PARAM = 'navet_oauth_callback';
const AUTH_CALLBACK_ERROR_PARAM = 'navet_oauth_error';
const LEGACY_AUTH_CALLBACK_PARAM = 'auth_callback';
const OAUTH_CALLBACK_SESSION_MISSING_MESSAGE =
  'Home Assistant OAuth callback did not create a session';
const OAUTH_CALLBACK_PARAMS = [
  AUTH_CALLBACK_PARAM,
  AUTH_CALLBACK_ERROR_PARAM,
  LEGACY_AUTH_CALLBACK_PARAM,
  'code',
  'state',
];
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
const libraryTokenPersistenceBySignature = new Map<string, Promise<void>>();

export {
  DurableAuthSessionUnavailableError as StandaloneOAuthSessionUnavailableError,
  isDurableAuthSessionUnavailableError as isStandaloneOAuthSessionUnavailableError,
};

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
  if (!response) {
    throw new DurableAuthSessionUnavailableError(
      'The Navet authentication service did not respond'
    );
  }
  if (response.status === 204) {
    return null;
  }
  if (!response.ok || !response.headers.get('Content-Type')?.includes('application/json')) {
    throw new DurableAuthSessionUnavailableError(
      `The Navet authentication service returned ${response.status}`
    );
  }

  const metadata: unknown = await response.json();
  if (!isSessionMetadata(metadata)) {
    throw new DurableAuthSessionUnavailableError(
      'The Navet authentication service returned an invalid session'
    );
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
  if (!response) {
    throw new DurableAuthSessionUnavailableError('The Navet credential service did not respond');
  }
  if (
    response.status === 204 ||
    !response.ok ||
    !response.headers.get('Content-Type')?.includes('application/json')
  ) {
    throw new DurableAuthSessionUnavailableError(
      `The Navet credential service returned ${response.status}`
    );
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
  if (!binding) {
    throw new Error('Unable to resolve the Navet browser session');
  }

  const method = data ? 'PUT' : 'DELETE';
  const headers: Record<string, string> = {
    [AUTH_BINDING_HEADER]: binding,
  };
  if (data) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(getAuthEndpoint(AUTH_SESSION_ENDPOINT), {
    method,
    cache: 'no-store',
    credentials: 'same-origin',
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });
  if (!response.ok) {
    throw new Error(
      data
        ? 'Unable to persist the refreshed Home Assistant session'
        : 'Unable to clear the Navet browser session'
    );
  }

  if (!data) {
    latestSessionBinding = null;
  }
}

function getTokenPersistenceSignature(data: AuthData | null): string {
  return data ? JSON.stringify(data) : 'null';
}

async function persistTokensAfterLibrarySave(data: AuthData | null): Promise<void> {
  const signature = getTokenPersistenceSignature(data);
  const existing = libraryTokenPersistenceBySignature.get(signature);
  if (existing) {
    try {
      await existing;
    } finally {
      if (libraryTokenPersistenceBySignature.get(signature) === existing) {
        libraryTokenPersistenceBySignature.delete(signature);
      }
    }
    return;
  }
  await persistTokens(data);
}

function saveTokens(data: AuthData | null): void {
  // Auth.refreshAccessToken invokes this callback synchronously without awaiting
  // it. Share that request with the awaited persistence pass so failures are
  // surfaced without racing a duplicate write for the same token data.
  const signature = getTokenPersistenceSignature(data);
  if (libraryTokenPersistenceBySignature.has(signature)) {
    return;
  }
  const persistence = persistTokens(data);
  libraryTokenPersistenceBySignature.set(signature, persistence);
  void persistence.catch(() => undefined);
}

async function clearStoredTokens(): Promise<void> {
  await persistTokens(null);
}

export async function invalidateStandaloneOAuthSession(): Promise<void> {
  await clearStoredTokens();
}

async function clearConfirmedInvalidStandaloneSession(): Promise<void> {
  try {
    await invalidateStandaloneOAuthSession();
  } catch (error) {
    throw new DurableAuthSessionUnavailableError(
      'Unable to clear the invalid Home Assistant browser session',
      { cause: error }
    );
  }
}

export function isInvalidStandaloneOAuthAuthError(error: unknown): boolean {
  return error === ERR_INVALID_AUTH;
}

function hasOAuthCallback() {
  const params = new URLSearchParams(window.location.search);
  return (
    params.get(AUTH_CALLBACK_PARAM) === '1' ||
    params.get(LEGACY_AUTH_CALLBACK_PARAM) === '1' ||
    params.has(AUTH_CALLBACK_ERROR_PARAM)
  );
}

function getOAuthCallbackErrorMessage(): string | null {
  const code = new URLSearchParams(window.location.search).get(AUTH_CALLBACK_ERROR_PARAM);
  switch (code) {
    case 'access_denied':
      return 'Home Assistant sign-in was cancelled.';
    case 'session_changed':
      return 'Home Assistant sign-in expired before it completed. Please try again.';
    case 'not_authorized':
      return 'This Home Assistant installation is not authorized for Navet.';
    case 'callback_incomplete':
      return 'Home Assistant returned an incomplete sign-in response. Please try again.';
    case 'invalid_response':
    case 'temporarily_unavailable':
      return 'Home Assistant sign-in could not be completed. Please try again.';
    default:
      return code ? 'Home Assistant sign-in failed. Please try again.' : null;
  }
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
  await persistTokensAfterLibrarySave(auth.data);
  return toAuthSession(auth, metadata);
}

async function beginOAuthLogin(hassUrl: string): Promise<never> {
  const installationPairingHeaders = getInstallationPairingHeaders();
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
      ...installationPairingHeaders,
    },
    body: JSON.stringify({
      hassUrl,
      returnTo: `${window.location.pathname}${window.location.search}${window.location.hash}`,
    }),
  });
  const isJsonResponse = response.headers.get('Content-Type')?.includes('application/json');
  if (!response.ok || !isJsonResponse) {
    let message = 'Unable to start Home Assistant OAuth';
    if (isJsonResponse) {
      const payload = (await response.json().catch(() => null)) as {
        error?: unknown;
      } | null;
      if (typeof payload?.error === 'string' && payload.error.trim()) {
        message = payload.error.trim().replace(/\s+/g, ' ').slice(0, 240);
      }
    }
    throw new Error(message);
  }

  const payload = (await response.json()) as { authorizeUrl?: unknown };
  if (typeof payload.authorizeUrl !== 'string' || !/^https?:\/\//.test(payload.authorizeUrl)) {
    throw new Error('Home Assistant returned an invalid authorization URL');
  }

  clearInstallationPairingKey();
  standaloneOAuthNavigation.assign(payload.authorizeUrl);
  return await new Promise<never>(() => undefined);
}

export const standaloneOAuthAuth: AuthAdapter = {
  providerId: 'home_assistant',
  kind: 'standalone-oauth',
  async init() {
    if (hasOAuthCallback()) {
      const callbackErrorMessage = getOAuthCallbackErrorMessage();
      // home-assistant-js-websocket reserves `auth_callback` for its own
      // browser-side token exchange. Navet already exchanged the code on the
      // server, so clear both current and legacy callback parameters before
      // asking the library to wrap the stored credentials.
      clearOAuthCallbackUrl();
      try {
        const session = await restoreSession(OAUTH_CALLBACK_RESTORE_TIMEOUT_MS);
        if (!session) {
          if (callbackErrorMessage) {
            throw new Error(callbackErrorMessage);
          }
          throw new Error(OAUTH_CALLBACK_SESSION_MISSING_MESSAGE);
        }
        return session;
      } catch (error) {
        if (isInvalidStandaloneOAuthAuthError(error)) {
          await clearConfirmedInvalidStandaloneSession();
          throw error;
        }
        if (error instanceof Error && error.message === OAUTH_CALLBACK_SESSION_MISSING_MESSAGE) {
          throw error;
        }
        if (
          callbackErrorMessage &&
          error instanceof Error &&
          error.message === callbackErrorMessage
        ) {
          throw error;
        }
        throw new DurableAuthSessionUnavailableError(
          'Unable to finish restoring the Home Assistant session',
          { cause: error }
        );
      }
    }

    try {
      return await restoreSession(STORED_SESSION_RESTORE_TIMEOUT_MS);
    } catch (error) {
      if (isInvalidStandaloneOAuthAuthError(error)) {
        await clearConfirmedInvalidStandaloneSession();
        return null;
      }
      throw new DurableAuthSessionUnavailableError('Unable to restore the Home Assistant session', {
        cause: error,
      });
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
    await persistTokensAfterLibrarySave(session.auth.data);
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
    try {
      if (storedTokens) {
        await withTimeout(
          (async () => {
            const auth = await getAuth({
              hassUrl: storedTokens.hassUrl,
              loadTokens: async () => storedTokens,
              limitHassInstance: true,
            }).catch(() => null);
            await Promise.resolve(auth?.revoke());
          })(),
          AUTH_SESSION_LOAD_TIMEOUT_MS
        ).catch(() => undefined);
      }
    } finally {
      // Upstream revocation is best effort, but clearing this browser's Navet
      // session is mandatory and must be allowed to surface a persistence error.
      await invalidateStandaloneOAuthSession();
    }
  },
};
