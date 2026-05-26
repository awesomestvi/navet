import type { AuthData } from 'home-assistant-js-websocket';
import { getAuth } from 'home-assistant-js-websocket';
import { resolveAddonLocalEndpointUrl } from '@/app/utils/home-assistant-connection-target';
import type { AuthAdapter, AuthSession } from '../types';

const AUTH_SESSION_ENDPOINT = '/__navet_auth__/session';
const AUTH_CALLBACK_PARAM = 'auth_callback';
const OAUTH_CALLBACK_PARAMS = [AUTH_CALLBACK_PARAM, 'code', 'state'];

interface OAuthCallbackState {
  hassUrl: string;
  clientId: string | null;
}

function getAuthSessionEndpoint() {
  return resolveAddonLocalEndpointUrl(AUTH_SESSION_ENDPOINT);
}

async function loadTokens(): Promise<AuthData | null> {
  const response = await fetch(getAuthSessionEndpoint(), {
    cache: 'no-store',
    credentials: 'same-origin',
  });

  if (response.status === 204 || response.status === 404) {
    return null;
  }

  if (!response.ok || !response.headers.get('Content-Type')?.includes('application/json')) {
    return null;
  }

  return (await response.json()) as AuthData;
}

function saveTokens(data: AuthData | null): void {
  const method = data ? 'PUT' : 'DELETE';
  void fetch(getAuthSessionEndpoint(), {
    method,
    cache: 'no-store',
    credentials: 'same-origin',
    headers: data ? { 'Content-Type': 'application/json' } : undefined,
    body: data ? JSON.stringify(data) : undefined,
  }).catch(() => undefined);
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

function isOAuthCallbackState(value: unknown): value is OAuthCallbackState {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const state = value as Partial<OAuthCallbackState>;
  return (
    typeof state.hassUrl === 'string' &&
    /^https?:\/\//.test(state.hassUrl) &&
    (typeof state.clientId === 'string' || state.clientId === null)
  );
}

function getOAuthCallbackState(): OAuthCallbackState | null {
  const params = new URLSearchParams(window.location.search);
  if (params.get(AUTH_CALLBACK_PARAM) !== '1') {
    return null;
  }

  const encodedState = params.get('state');
  if (!encodedState) {
    throw new Error('Invalid Home Assistant OAuth callback');
  }

  try {
    const parsed = JSON.parse(window.atob(encodedState)) as unknown;
    if (!isOAuthCallbackState(parsed)) {
      throw new Error('Invalid callback state');
    }
    return parsed;
  } catch {
    throw new Error('Invalid Home Assistant OAuth callback');
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

export const standaloneOAuthAuth: AuthAdapter = {
  kind: 'standalone-oauth',
  async init() {
    const storedTokens = await loadTokens().catch(() => null);
    if (storedTokens) {
      const auth = await getAuth({
        hassUrl: storedTokens.hassUrl,
        loadTokens,
        saveTokens,
        limitHassInstance: true,
      });

      if (auth.expired) {
        await auth.refreshAccessToken();
      }

      if (new URLSearchParams(window.location.search).get(AUTH_CALLBACK_PARAM) === '1') {
        clearOAuthCallbackUrl();
      }

      return {
        runtime: 'standalone-oauth',
        authMode: 'oauth',
        haBaseUrl: auth.data.hassUrl,
        hassUrl: auth.data.hassUrl,
        auth,
        expiresAt: auth.data.expires,
      };
    }

    let callbackState: OAuthCallbackState | null = null;
    try {
      callbackState = getOAuthCallbackState();
    } catch (error) {
      await clearStoredTokens();
      throw error;
    }

    if (!callbackState) return null;

    const auth = await getAuth({
      hassUrl: callbackState.hassUrl,
      clientId: callbackState.clientId,
      loadTokens,
      saveTokens,
      limitHassInstance: true,
    }).catch(async (error: unknown) => {
      if (callbackState) {
        await clearStoredTokens();
      }
      throw error;
    });

    if (auth.expired) {
      await auth.refreshAccessToken();
    }

    if (callbackState) {
      clearOAuthCallbackUrl();
    }

    return {
      runtime: 'standalone-oauth',
      authMode: 'oauth',
      haBaseUrl: auth.data.hassUrl,
      hassUrl: auth.data.hassUrl,
      auth,
      expiresAt: auth.data.expires,
    };
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

    return {
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
    return {
      ...session,
      expiresAt: session.auth.data.expires,
    };
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
    await clearStoredTokens();
  },
};
