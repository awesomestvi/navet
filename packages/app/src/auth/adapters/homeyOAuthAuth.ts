import type { HomeyCloudHomey } from '@navet/app/types/homey';
import type { IntegrationUser } from '@navet/app/types/integration-user';
import { resolveAddonLocalEndpointUrl } from '@navet/app/utils/home-assistant-connection-target';
import {
  clearInstallationPairingKey,
  getInstallationPairingHeaders,
} from '../installation-pairing';
import { DurableAuthSessionUnavailableError } from '../session-errors';
import type { AuthAdapter, HomeyAuthSession } from '../types';

const HOMEY_SESSION_ENDPOINT = '/__navet_homey__/session';
const HOMEY_AUTHORIZE_ENDPOINT = '/__navet_homey__/authorize';
const HOMEY_SELECT_ENDPOINT = '/__navet_homey__/session/select';
const HOMEY_CALLBACK_PARAM = 'homey_oauth_callback';
const HOMEY_CALLBACK_ERROR_PARAM = 'homey_oauth_error';
const HOMEY_SESSION_LOAD_TIMEOUT_MS = 3_000;
const HOMEY_CALLBACK_PARAMS = [HOMEY_CALLBACK_PARAM, HOMEY_CALLBACK_ERROR_PARAM, 'code', 'state'];
const HOMEY_OAUTH_ORIGIN = 'https://api.athom.com';

interface StoredHomeySession {
  userId?: string | null;
  user?: IntegrationUser | null;
  homeys: HomeyCloudHomey[];
  selectedHomeyId?: string | null;
  homeyBaseUrl?: string | null;
  hasActiveHomeySession?: boolean;
}

export const homeyOAuthNavigation = {
  assign(url: string) {
    window.location.assign(url);
  },
};

function isValidHomeyAuthorizeUrl(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }

  try {
    const url = new URL(value);
    return url.origin === HOMEY_OAUTH_ORIGIN && url.pathname === '/oauth2/authorise';
  } catch {
    return false;
  }
}

function isValidIntegrationUser(value: unknown): value is IntegrationUser {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const user = value as Partial<IntegrationUser>;
  return (
    typeof user.name === 'string' &&
    user.name.trim().length > 0 &&
    (user.id == null || typeof user.id === 'string') &&
    (user.avatarUrl == null || typeof user.avatarUrl === 'string') &&
    (user.email == null || typeof user.email === 'string') &&
    (user.is_owner == null || typeof user.is_owner === 'boolean') &&
    (user.is_admin == null || typeof user.is_admin === 'boolean')
  );
}

function getSessionEndpoint() {
  return resolveAddonLocalEndpointUrl(HOMEY_SESSION_ENDPOINT);
}

function getAuthorizeEndpoint() {
  return resolveAddonLocalEndpointUrl(HOMEY_AUTHORIZE_ENDPOINT);
}

function getSelectionEndpoint() {
  return resolveAddonLocalEndpointUrl(HOMEY_SELECT_ENDPOINT);
}

async function fetchHomeySessionResponse(timeoutMs = HOMEY_SESSION_LOAD_TIMEOUT_MS) {
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

    throw new DurableAuthSessionUnavailableError('The Homey session service could not be reached', {
      cause: error,
    });
  } finally {
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
    }
  }
}

function isValidHomey(value: unknown): value is HomeyCloudHomey {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const homey = value as Partial<HomeyCloudHomey>;
  return (
    typeof homey.id === 'string' &&
    homey.id.length > 0 &&
    typeof homey.name === 'string' &&
    homey.name.length > 0
  );
}

function isValidStoredHomeySession(value: unknown): value is StoredHomeySession {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const session = value as Partial<StoredHomeySession>;
  return (
    Array.isArray(session.homeys) &&
    session.homeys.every(isValidHomey) &&
    (session.userId == null || typeof session.userId === 'string') &&
    (session.user == null || isValidIntegrationUser(session.user)) &&
    (session.selectedHomeyId == null || typeof session.selectedHomeyId === 'string') &&
    (session.homeyBaseUrl == null ||
      (typeof session.homeyBaseUrl === 'string' && /^https?:\/\//.test(session.homeyBaseUrl))) &&
    (session.hasActiveHomeySession == null || typeof session.hasActiveHomeySession === 'boolean')
  );
}

async function loadStoredHomeySession(): Promise<StoredHomeySession | null> {
  const response = await fetchHomeySessionResponse();
  if (response === null) {
    throw new DurableAuthSessionUnavailableError('The Homey session service did not respond');
  }
  if (response.status === 204) {
    return null;
  }

  if (!response.ok || !response.headers.get('Content-Type')?.includes('application/json')) {
    throw new DurableAuthSessionUnavailableError(
      `The Homey session service returned ${response.status}`
    );
  }

  const parsed: unknown = await response.json().catch(() => null);
  if (!isValidStoredHomeySession(parsed)) {
    throw new DurableAuthSessionUnavailableError(
      'The Homey session service returned invalid metadata'
    );
  }
  return parsed;
}

async function clearStoredHomeySession(): Promise<void> {
  const response = await fetch(getSessionEndpoint(), {
    method: 'DELETE',
    cache: 'no-store',
    credentials: 'same-origin',
  });
  if (!response.ok && response.status !== 401 && response.status !== 404) {
    throw new Error('Unable to clear the Homey browser session');
  }
}

function hasOAuthCallback() {
  const params = new URLSearchParams(window.location.search);
  return params.get(HOMEY_CALLBACK_PARAM) === '1' || params.has(HOMEY_CALLBACK_ERROR_PARAM);
}

function getHomeyCallbackErrorMessage(): string | null {
  const code = new URLSearchParams(window.location.search).get(HOMEY_CALLBACK_ERROR_PARAM);
  switch (code) {
    case 'access_denied':
      return 'Homey sign-in was cancelled.';
    case 'session_changed':
      return 'Homey sign-in expired before it completed. Please try again.';
    case 'not_authorized':
      return 'This Homey installation is not authorized for Navet.';
    case 'callback_incomplete':
      return 'Homey returned an incomplete sign-in response. Please try again.';
    case 'invalid_response':
    case 'temporarily_unavailable':
      return 'Homey sign-in could not be completed. Please try again.';
    default:
      return code ? 'Homey sign-in failed. Please try again.' : null;
  }
}

function clearOAuthCallbackUrl(): void {
  const params = new URLSearchParams(window.location.search);
  for (const param of HOMEY_CALLBACK_PARAMS) {
    params.delete(param);
  }

  const nextSearch = params.toString();
  const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}${window.location.hash}`;
  window.history.replaceState(null, '', nextUrl);
}

function toSession(stored: StoredHomeySession): HomeyAuthSession {
  const homeyBaseUrl =
    stored.homeyBaseUrl ??
    stored.homeys.find((homey) => homey.id === stored.selectedHomeyId)?.localUrlSecure ??
    stored.homeys.find((homey) => homey.id === stored.selectedHomeyId)?.localUrl ??
    stored.homeys.find((homey) => homey.id === stored.selectedHomeyId)?.remoteUrl ??
    'https://api.athom.com';

  return {
    providerId: 'homey',
    runtime: 'standalone-oauth',
    authMode: 'oauth',
    haBaseUrl: homeyBaseUrl,
    hassUrl: homeyBaseUrl,
    userId: stored.userId ?? 'homey',
    user: stored.user ?? undefined,
    availableHomeys: stored.homeys,
    selectedHomeyId: stored.selectedHomeyId ?? undefined,
    needsHomeySelection:
      !stored.selectedHomeyId || !stored.homeyBaseUrl || stored.hasActiveHomeySession === false,
  };
}

export const homeyOAuthAuth: AuthAdapter = {
  providerId: 'homey',
  kind: 'standalone-oauth',
  async init() {
    if (hasOAuthCallback()) {
      const callbackErrorMessage = getHomeyCallbackErrorMessage();
      const stored = await loadStoredHomeySession();
      clearOAuthCallbackUrl();
      if (stored) {
        return toSession(stored);
      }
      throw new Error(
        callbackErrorMessage ?? 'Homey OAuth callback did not create a browser session'
      );
    }

    const stored = await loadStoredHomeySession();
    return stored ? toSession(stored) : null;
  },
  async login(): Promise<HomeyAuthSession> {
    const installationPairingHeaders = getInstallationPairingHeaders();
    const response = await fetch(getAuthorizeEndpoint(), {
      method: 'POST',
      cache: 'no-store',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        ...installationPairingHeaders,
      },
      body: JSON.stringify({
        returnTo: `${window.location.pathname}${window.location.search}${window.location.hash}`,
      }),
    });
    const isJsonResponse = response.headers.get('Content-Type')?.includes('application/json');
    if (!response.ok || !isJsonResponse) {
      let message = 'Unable to start Homey OAuth';
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
    if (!isValidHomeyAuthorizeUrl(payload.authorizeUrl)) {
      throw new Error('Homey returned an invalid authorization URL');
    }

    clearInstallationPairingKey();
    homeyOAuthNavigation.assign(payload.authorizeUrl);
    return await new Promise<HomeyAuthSession>(() => undefined);
  },
  async refresh(_session) {
    const stored = await loadStoredHomeySession();
    if (!stored) {
      throw new Error('Homey session is no longer available');
    }

    return toSession(stored);
  },
  async logout() {
    await clearStoredHomeySession();
  },
};

export async function selectHomey(homeyId: string): Promise<HomeyAuthSession> {
  const response = await fetch(getSelectionEndpoint(), {
    method: 'PUT',
    cache: 'no-store',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ homeyId }),
  });

  if (!response.ok || !response.headers.get('Content-Type')?.includes('application/json')) {
    throw new Error('Unable to select Homey');
  }

  const parsed = await response.json();
  if (!isValidStoredHomeySession(parsed)) {
    throw new Error('Homey selection returned an invalid session');
  }

  return toSession(parsed);
}
