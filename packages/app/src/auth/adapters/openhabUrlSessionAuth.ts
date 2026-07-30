import { resolveAddonLocalEndpointUrl } from '@navet/app/utils/home-assistant-connection-target';
import {
  clearInstallationPairingKey,
  getInstallationPairingHeaders,
} from '../installation-pairing';
import { DurableAuthSessionUnavailableError } from '../session-errors';
import type { AuthAdapter, AuthSession, OpenHABAuthSession } from '../types';

const OPENHAB_SESSION_ENDPOINT = '/__navet_openhab__/session';
const OPENHAB_PROXY_BASE = '/__navet_openhab_proxy__';
const OPENHAB_SESSION_LOAD_TIMEOUT_MS = 3_000;

interface StoredOpenHABSessionMetadata {
  authenticated: true;
  hassUrl: string;
}

interface OpenHABLoginCredentials {
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

function isValidStoredOpenHABSessionMetadata(
  value: unknown
): value is StoredOpenHABSessionMetadata {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const session = value as Partial<StoredOpenHABSessionMetadata>;
  return (
    session.authenticated === true &&
    typeof session.hassUrl === 'string' &&
    /^https?:\/\//.test(session.hassUrl)
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

    throw new DurableAuthSessionUnavailableError(
      'The openHAB session service could not be reached',
      { cause: error }
    );
  } finally {
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
    }
  }
}

async function loadStoredSession(): Promise<StoredOpenHABSessionMetadata | null> {
  const response = await fetchStoredSession();
  if (response === null) {
    throw new DurableAuthSessionUnavailableError('The openHAB session service did not respond');
  }
  if (response.status === 204) {
    return null;
  }

  if (!response.ok || !response.headers.get('Content-Type')?.includes('application/json')) {
    throw new DurableAuthSessionUnavailableError(
      `The openHAB session service returned ${response.status}`
    );
  }

  const parsed: unknown = await response.json().catch(() => null);
  if (!isValidStoredOpenHABSessionMetadata(parsed)) {
    throw new DurableAuthSessionUnavailableError(
      'The openHAB session service returned invalid metadata'
    );
  }
  return parsed;
}

function putStoredSession(
  session: OpenHABLoginCredentials,
  installationPairingHeaders: Record<string, string>
) {
  return fetch(getSessionEndpoint(), {
    method: 'PUT',
    cache: 'no-store',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      ...installationPairingHeaders,
    },
    body: JSON.stringify(session),
  });
}

async function readStoredSessionError(response: Response): Promise<string> {
  let errorMessage = 'Unable to save openHAB session';
  try {
    const parsed = await response.json();
    if (parsed && typeof parsed.error === 'string' && parsed.error.trim().length > 0) {
      errorMessage = parsed.error;
    }
  } catch {
    // Ignore non-JSON error responses and keep the generic fallback.
  }

  return errorMessage;
}

async function saveStoredSession(
  session: OpenHABLoginCredentials
): Promise<StoredOpenHABSessionMetadata> {
  const installationPairingHeaders = getInstallationPairingHeaders();
  let response = await putStoredSession(session, installationPairingHeaders);

  if (response.status === 401) {
    // A direct login can happen before init() has established this browser's opaque binding.
    await fetchStoredSession().catch(() => null);
    response = await putStoredSession(session, installationPairingHeaders);
  }

  if (!response.ok) {
    throw new Error(await readStoredSessionError(response));
  }

  if (!response.headers.get('Content-Type')?.includes('application/json')) {
    throw new Error('Unable to save openHAB session');
  }

  const parsed = await response.json();
  if (!isValidStoredOpenHABSessionMetadata(parsed)) {
    throw new Error('Unable to save openHAB session');
  }

  clearInstallationPairingKey();
  return parsed;
}

async function clearStoredSession(): Promise<void> {
  const response = await fetch(getSessionEndpoint(), {
    method: 'DELETE',
    cache: 'no-store',
    credentials: 'same-origin',
  });
  if (!response.ok && response.status !== 401 && response.status !== 404) {
    throw new Error('Unable to clear the openHAB browser session');
  }
}

function toSession(stored: StoredOpenHABSessionMetadata): OpenHABAuthSession {
  const baseUrl = normalizeBaseUrl(stored.hassUrl);

  return {
    providerId: 'openhab',
    runtime: 'standalone-oauth',
    authMode: 'oauth',
    haBaseUrl: baseUrl,
    hassUrl: baseUrl,
    proxyBaseUrl: OPENHAB_PROXY_BASE,
  };
}

export const openhabUrlSessionAuth: AuthAdapter = {
  providerId: 'openhab',
  kind: 'standalone-oauth',
  async init() {
    const stored = await loadStoredSession();
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
    const metadata = await saveStoredSession(storedSession);
    return toSession(metadata);
  },
  async refresh(session) {
    return session;
  },
  async logout() {
    await clearStoredSession();
  },
};
