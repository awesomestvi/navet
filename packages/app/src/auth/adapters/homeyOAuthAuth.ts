import type { HomeyCloudHomey } from '@navet/app/types/homey';
import type { IntegrationUser } from '@navet/app/types/integration-user';
import { resolveAddonLocalEndpointUrl } from '@navet/app/utils/home-assistant-connection-target';
import type { AuthAdapter, HomeyAuthSession } from '../types';

const HOMEY_SESSION_ENDPOINT = '/__navet_homey__/session';
const HOMEY_AUTHORIZE_ENDPOINT = '/__navet_homey__/authorize';
const HOMEY_SELECT_ENDPOINT = '/__navet_homey__/session/select';
const HOMEY_CALLBACK_PARAM = 'homey_oauth_callback';
const HOMEY_SESSION_LOAD_TIMEOUT_MS = 3_000;
const HOMEY_CALLBACK_PARAMS = [HOMEY_CALLBACK_PARAM, 'code', 'state'];

interface StoredHomeySession {
  userId?: string | null;
  user?: IntegrationUser | null;
  homeys: HomeyCloudHomey[];
  selectedHomeyId?: string | null;
  homeyBaseUrl?: string | null;
  hasActiveHomeySession?: boolean;
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

    throw error;
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
  if (response === null || response.status === 204 || response.status === 404) {
    return null;
  }

  if (!response.ok || !response.headers.get('Content-Type')?.includes('application/json')) {
    return null;
  }

  const parsed = await response.json();
  return isValidStoredHomeySession(parsed) ? parsed : null;
}

async function clearStoredHomeySession(): Promise<void> {
  await fetch(getSessionEndpoint(), {
    method: 'DELETE',
    cache: 'no-store',
    credentials: 'same-origin',
  }).catch(() => undefined);
}

function hasOAuthCallback() {
  return new URLSearchParams(window.location.search).get(HOMEY_CALLBACK_PARAM) === '1';
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
      const stored = await loadStoredHomeySession().catch(() => null);
      clearOAuthCallbackUrl();
      return stored ? toSession(stored) : null;
    }

    const stored = await loadStoredHomeySession().catch(() => null);
    return stored ? toSession(stored) : null;
  },
  async login(): Promise<HomeyAuthSession> {
    window.open(getAuthorizeEndpoint(), '_self');
    return await new Promise<HomeyAuthSession>(() => undefined);
  },
  async refresh(_session) {
    const stored = await loadStoredHomeySession().catch(() => null);
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
