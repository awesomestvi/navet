import { resolveAddonLocalEndpointUrl } from '@navet/app/utils/home-assistant-connection-target';
import type { AuthAdapter, AuthSession, OpenHABAuthSession } from '../types';

const OPENHAB_SESSION_ENDPOINT = '/__navet_openhab__/session';
const OPENHAB_PROXY_BASE = '/__navet_openhab_proxy__';
const OPENHAB_SESSION_LOAD_TIMEOUT_MS = 3_000;

interface StoredOpenHABSession {
  hassUrl: string;
  username: string;
  password: string;
}

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/$/, '');
}

function getSessionEndpoint() {
  return resolveAddonLocalEndpointUrl(OPENHAB_SESSION_ENDPOINT);
}

function isValidStoredOpenHABSession(value: unknown): value is StoredOpenHABSession {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const session = value as Partial<StoredOpenHABSession>;
  return (
    typeof session.hassUrl === 'string' &&
    /^https?:\/\//.test(session.hassUrl) &&
    typeof session.username === 'string' &&
    session.username.trim().length > 0 &&
    typeof session.password === 'string' &&
    session.password.length > 0
  );
}

async function fetchStoredSession(timeoutMs = OPENHAB_SESSION_LOAD_TIMEOUT_MS) {
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
      fetch(getSessionEndpoint(), {
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

async function loadStoredSession(): Promise<StoredOpenHABSession | null> {
  const response = await fetchStoredSession();
  if (response === null || response.status === 204 || response.status === 404) {
    return null;
  }

  if (!response.ok || !response.headers.get('Content-Type')?.includes('application/json')) {
    return null;
  }

  const parsed = await response.json();
  return isValidStoredOpenHABSession(parsed) ? parsed : null;
}

async function saveStoredSession(session: StoredOpenHABSession): Promise<void> {
  const response = await fetch(getSessionEndpoint(), {
    method: 'PUT',
    cache: 'no-store',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(session),
  });

  if (!response.ok) {
    throw new Error('Unable to save openHAB session');
  }
}

async function clearStoredSession(): Promise<void> {
  await fetch(getSessionEndpoint(), {
    method: 'DELETE',
    cache: 'no-store',
    credentials: 'same-origin',
  }).catch(() => undefined);
}

function toSession(stored: StoredOpenHABSession): OpenHABAuthSession {
  const baseUrl = normalizeBaseUrl(stored.hassUrl);

  return {
    providerId: 'openhab',
    runtime: 'standalone-oauth',
    authMode: 'oauth',
    haBaseUrl: baseUrl,
    hassUrl: baseUrl,
    username: stored.username.trim(),
    password: stored.password,
    proxyBaseUrl: OPENHAB_PROXY_BASE,
  };
}

export const openhabUrlSessionAuth: AuthAdapter = {
  providerId: 'openhab',
  kind: 'standalone-oauth',
  async init() {
    const stored = await loadStoredSession().catch(() => null);
    return stored ? toSession(stored) : null;
  },
  async login(input): Promise<AuthSession> {
    if (!input?.hassUrl) {
      throw new Error('openHAB URL is required');
    }

    if (!input.username?.trim()) {
      throw new Error('openHAB username is required');
    }

    if (!input.password?.trim()) {
      throw new Error('openHAB password is required');
    }

    const baseUrl = normalizeBaseUrl(input.hassUrl);
    try {
      new URL(baseUrl);
    } catch {
      throw new Error('openHAB URL must be a valid absolute URL');
    }

    const storedSession = {
      hassUrl: baseUrl,
      username: input.username.trim(),
      password: input.password,
    };
    await saveStoredSession(storedSession);
    return toSession(storedSession);
  },
  async refresh(session) {
    return session;
  },
  async logout() {
    await clearStoredSession();
  },
};
