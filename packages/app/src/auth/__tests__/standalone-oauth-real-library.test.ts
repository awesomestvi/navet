import { afterEach, describe, expect, it, vi } from 'vitest';
import { standaloneOAuthAuth } from '../adapters/standaloneOAuthAuth';

const SESSION_ID = `nas_${'b'.repeat(32)}`;
const HASS_URL = 'https://ha.example.com';

function jsonResponse(payload: unknown) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function createAuthenticatedSessionFetch() {
  const authData = {
    hassUrl: HASS_URL,
    clientId: `${window.location.origin}/`,
    expires: Date.now() + 3_600_000,
    refresh_token: 'refresh-token',
    access_token: 'access-token',
    expires_in: 3600,
  };
  const metadata = {
    authenticated: true,
    providerId: 'home_assistant',
    sessionId: SESSION_ID,
    hassUrl: HASS_URL,
    clientId: authData.clientId,
    expiresAt: authData.expires,
    expiresIn: authData.expires_in,
    userId: null,
    userName: null,
  };

  return vi.spyOn(window, 'fetch').mockImplementation(async (input, init) => {
    const pathname = new URL(String(input), window.location.origin).pathname;
    if (pathname === '/__navet_auth__/session/credentials') {
      return jsonResponse(authData);
    }
    if (pathname === '/__navet_auth__/session' && init?.method === 'PUT') {
      return jsonResponse(metadata);
    }
    if (pathname === '/__navet_auth__/session' && !init?.method) {
      return jsonResponse(metadata);
    }
    throw new Error(`Unexpected auth request: ${init?.method ?? 'GET'} ${pathname}`);
  });
}

describe('standalone OAuth with the real Home Assistant auth library', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    window.history.replaceState({}, '', '/');
  });

  it.each(['navet_oauth_callback', 'auth_callback'])(
    'cleans %s before restoring the server-exchanged session',
    async (callbackParam) => {
      window.history.replaceState(
        {},
        '',
        `/?${callbackParam}=1&code=already-exchanged&state=not-library-state`
      );
      const fetchMock = createAuthenticatedSessionFetch();

      const session = await standaloneOAuthAuth.init();

      expect(session).toMatchObject({
        runtime: 'standalone-oauth',
        authMode: 'oauth',
        hassUrl: HASS_URL,
      });
      expect(session?.auth?.accessToken).toBe('access-token');
      expect(window.location.search).toBe('');
      expect(fetchMock.mock.calls.some(([input]) => String(input).includes('/auth/token'))).toBe(
        false
      );
      expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(false);
    }
  );
});
