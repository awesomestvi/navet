import { ingressSessionFixture } from '@navet/app/test/fixtures/home-assistant/auth/ingress';
import { oauthSessionFixture } from '@navet/app/test/fixtures/home-assistant/auth/oauth';
import { panelSessionFixture } from '@navet/app/test/fixtures/home-assistant/auth/panel';
import type { Auth } from 'home-assistant-js-websocket';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { haIngressAuth } from '../adapters/haIngressAuth';
import { haPanelAuth } from '../adapters/haPanelAuth';
import { openhabUrlSessionAuth } from '../adapters/openhabUrlSessionAuth';
import {
  invalidateStandaloneOAuthSession,
  standaloneOAuthAuth,
  standaloneOAuthNavigation,
} from '../adapters/standaloneOAuthAuth';

const AUTH_SESSION_LOAD_TIMEOUT_MS = 3_000;
const STORED_SESSION_RESTORE_TIMEOUT_MS = 3_000;
const OAUTH_CALLBACK_RESTORE_TIMEOUT_MS = 10_000;

const { getAuthMock, refreshAccessTokenMock, revokeMock } = vi.hoisted(() => ({
  getAuthMock: vi.fn(),
  refreshAccessTokenMock: vi.fn(),
  revokeMock: vi.fn(),
}));

vi.mock('home-assistant-js-websocket', () => ({
  getAuth: getAuthMock,
}));

function createAuth(hassUrl = 'https://ha.example.com'): Auth {
  return {
    data: {
      hassUrl,
      clientId: `${window.location.origin}/`,
      expires: Date.now() + 3_600_000,
      refresh_token: 'refresh-token',
      access_token: 'access-token',
      expires_in: 3600,
    },
    wsUrl: `${hassUrl.replace(/^http/, 'ws')}/api/websocket`,
    accessToken: 'access-token',
    expired: false,
    refreshAccessToken: refreshAccessTokenMock,
    revoke: revokeMock,
  };
}

function setOAuthCallbackUrl() {
  window.history.replaceState({}, '', '/?navet_oauth_callback=1');
}

function setLegacyOAuthCallbackUrl() {
  window.history.replaceState(
    {},
    '',
    '/?auth_callback=1&code=already-exchanged&state=not-library-state'
  );
}

const STANDALONE_SESSION_ID = `nas_${'a'.repeat(32)}`;

function createSessionMetadataResponse(options?: {
  authenticated?: boolean;
  hassUrl?: string;
  userId?: string | null;
}) {
  const authenticated = options?.authenticated ?? true;
  return new Response(
    JSON.stringify({
      authenticated,
      providerId: 'home_assistant',
      sessionId: STANDALONE_SESSION_ID,
      hassUrl: authenticated ? (options?.hassUrl ?? oauthSessionFixture.haBaseUrl) : null,
      clientId: authenticated ? `${window.location.origin}/` : null,
      expiresAt: authenticated ? Date.now() + 3_600_000 : null,
      expiresIn: authenticated ? 3600 : null,
      userId: options?.userId ?? null,
      userName: null,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

function createCredentialsResponse(hassUrl = oauthSessionFixture.haBaseUrl) {
  return new Response(
    JSON.stringify({
      ...oauthSessionFixture.tokenPayload,
      hassUrl,
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

function mockStandaloneSessionFetch(options?: {
  authenticated?: boolean;
  hassUrl?: string;
  userId?: string | null;
}) {
  return vi.spyOn(window, 'fetch').mockImplementation(async (input, init) => {
    const url = String(input);
    if (url.endsWith('/__navet_auth__/session/credentials')) {
      return createCredentialsResponse(options?.hassUrl);
    }
    if (url.endsWith('/__navet_auth__/authorize')) {
      return new Response(
        JSON.stringify({
          authorizeUrl: `${
            options?.hassUrl ?? 'https://ha.example.com'
          }/auth/authorize?state=server-state`,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    if (url.endsWith('/__navet_auth__/session') && !init?.method) {
      return createSessionMetadataResponse(options);
    }
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  });
}

describe('auth adapters', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    window.history.replaceState({}, '', '/');
    Object.defineProperty(window, 'parent', {
      configurable: true,
      value: window,
    });
    vi.restoreAllMocks();
    getAuthMock.mockReset();
    refreshAccessTokenMock.mockReset();
    revokeMock.mockReset();
  });

  it('creates panel session without token data', async () => {
    const session = await haPanelAuth.init();
    expect(session).toMatchObject({
      runtime: panelSessionFixture.runtime,
      authMode: panelSessionFixture.authMode,
      haBaseUrl: window.location.origin,
      hassUrl: window.location.origin,
    });
    expect(session?.auth).toBeUndefined();
  });

  it('creates ingress session without reading frontend tokens', async () => {
    localStorage.setItem('hassTokens', JSON.stringify({ data: createAuth().data }));
    sessionStorage.setItem('hassTokens', JSON.stringify({ data: createAuth().data }));

    const session = await haIngressAuth.init();

    expect(getAuthMock).not.toHaveBeenCalled();
    expect(session).toMatchObject({
      runtime: 'ha-ingress',
      authMode: 'ingress_session',
      haBaseUrl: window.location.origin,
      hassUrl: window.location.origin,
    });
    expect(session?.auth).toBeUndefined();
  });

  it('refreshes ingress session without reading frontend tokens', async () => {
    const session = await haIngressAuth.refresh?.({
      providerId: 'home_assistant',
      runtime: 'ha-ingress',
      authMode: 'ingress_session',
      haBaseUrl: ingressSessionFixture.haBaseUrl,
      hassUrl: ingressSessionFixture.hassUrl,
    });

    expect(getAuthMock).not.toHaveBeenCalled();
    expect(session).toMatchObject({
      runtime: 'ha-ingress',
      authMode: 'ingress_session',
      haBaseUrl: window.location.origin,
      hassUrl: window.location.origin,
    });
  });

  it('restores a standalone OAuth session through sanitized metadata and bound credentials', async () => {
    const auth = createAuth(oauthSessionFixture.haBaseUrl);
    const fetchMock = mockStandaloneSessionFetch({ userId: 'ha-user-1' });
    getAuthMock.mockResolvedValueOnce(auth);

    const session = await standaloneOAuthAuth.init();

    expect(session).toMatchObject({
      runtime: 'standalone-oauth',
      authMode: 'oauth',
      haBaseUrl: oauthSessionFixture.haBaseUrl,
      hassUrl: oauthSessionFixture.hassUrl,
      auth,
      userId: 'ha-user-1',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      `${window.location.origin}/__navet_auth__/session/credentials`,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'X-Navet-OAuth-Binding': STANDALONE_SESSION_ID,
        }),
      })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      `${window.location.origin}/__navet_auth__/session`,
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify(auth.data),
      })
    );
  });

  it('fails open to unauthenticated startup when the same-origin auth endpoint stalls', async () => {
    vi.useFakeTimers();
    try {
      vi.spyOn(window, 'fetch').mockReturnValue(new Promise(() => {}));
      const sessionPromise = standaloneOAuthAuth.init();
      await vi.advanceTimersByTimeAsync(AUTH_SESSION_LOAD_TIMEOUT_MS);
      await expect(sessionPromise).resolves.toBeNull();
      expect(getAuthMock).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('clears only the browser-bound standalone session when refresh fails on restore', async () => {
    const auth = createAuth(oauthSessionFixture.haBaseUrl);
    Object.defineProperty(auth, 'expired', {
      configurable: true,
      get: () => true,
    });
    refreshAccessTokenMock.mockRejectedValueOnce(new Error('refresh failed'));
    const fetchMock = mockStandaloneSessionFetch();
    getAuthMock.mockResolvedValueOnce(auth);

    await expect(standaloneOAuthAuth.init()).resolves.toBeNull();

    expect(refreshAccessTokenMock).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(
      `${window.location.origin}/__navet_auth__/session`,
      expect.objectContaining({
        method: 'DELETE',
        headers: expect.objectContaining({
          'X-Navet-OAuth-Binding': STANDALONE_SESSION_ID,
        }),
      })
    );
  });

  it('stops waiting for a stalled refresh during stored-session restore', async () => {
    vi.useFakeTimers();
    try {
      const auth = createAuth(oauthSessionFixture.haBaseUrl);
      Object.defineProperty(auth, 'expired', {
        configurable: true,
        get: () => true,
      });
      refreshAccessTokenMock.mockReturnValueOnce(new Promise(() => {}));
      const fetchMock = mockStandaloneSessionFetch();
      getAuthMock.mockResolvedValueOnce(auth);

      const sessionPromise = standaloneOAuthAuth.init();
      await vi.advanceTimersByTimeAsync(STORED_SESSION_RESTORE_TIMEOUT_MS);

      await expect(sessionPromise).resolves.toBeNull();
      expect(fetchMock).toHaveBeenCalledWith(
        `${window.location.origin}/__navet_auth__/session`,
        expect.objectContaining({ method: 'DELETE' })
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('restores a server-exchanged OAuth callback and removes callback parameters', async () => {
    const auth = createAuth(oauthSessionFixture.haBaseUrl);
    setOAuthCallbackUrl();
    const fetchMock = mockStandaloneSessionFetch();
    getAuthMock.mockImplementationOnce(async () => {
      expect(window.location.search).toBe('');
      return auth;
    });

    const session = await standaloneOAuthAuth.init();

    expect(getAuthMock).toHaveBeenCalledWith({
      hassUrl: auth.data.hassUrl,
      loadTokens: expect.any(Function),
      saveTokens: expect.any(Function),
      limitHassInstance: true,
    });
    expect(session).toMatchObject({
      runtime: 'standalone-oauth',
      authMode: 'oauth',
      haBaseUrl: auth.data.hassUrl,
      auth,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      `${window.location.origin}/__navet_auth__/session/credentials`,
      expect.objectContaining({ method: 'POST' })
    );
    expect(window.location.search).toBe('');
  });

  it('restores a legacy server callback after removing the library-owned marker', async () => {
    const auth = createAuth(oauthSessionFixture.haBaseUrl);
    setLegacyOAuthCallbackUrl();
    const fetchMock = mockStandaloneSessionFetch();
    getAuthMock.mockImplementationOnce(async () => {
      expect(window.location.search).toBe('');
      return auth;
    });

    await expect(standaloneOAuthAuth.init()).resolves.toMatchObject({
      runtime: 'standalone-oauth',
      authMode: 'oauth',
      auth,
    });
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(false);
    expect(window.location.search).toBe('');
  });

  it('starts OAuth through the server-bound authorize endpoint without browser token exchange', async () => {
    const fetchMock = mockStandaloneSessionFetch({
      authenticated: false,
      hassUrl: 'http://homeassistant.local:8123',
    });
    const navigationMock = vi
      .spyOn(standaloneOAuthNavigation, 'assign')
      .mockImplementation(() => undefined);

    void standaloneOAuthAuth.login?.({
      hassUrl: 'http://homeassistant.local:8123/',
    });

    await vi.waitFor(() => {
      expect(navigationMock).toHaveBeenCalledWith(
        'http://homeassistant.local:8123/auth/authorize?state=server-state'
      );
    });
    expect(fetchMock).toHaveBeenCalledWith(
      `${window.location.origin}/__navet_auth__/authorize`,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'X-Navet-OAuth-Binding': STANDALONE_SESSION_ID,
        }),
        body: JSON.stringify({
          hassUrl: 'http://homeassistant.local:8123',
          returnTo: '/',
        }),
      })
    );
    expect(getAuthMock).not.toHaveBeenCalled();
  });

  it('rejects a callback marker without a server-created browser session', async () => {
    setOAuthCallbackUrl();
    const fetchMock = mockStandaloneSessionFetch({ authenticated: false });

    await expect(standaloneOAuthAuth.init()).rejects.toThrow(
      'Home Assistant OAuth callback did not create a session'
    );

    expect(fetchMock).toHaveBeenCalledWith(
      `${window.location.origin}/__navet_auth__/session`,
      expect.objectContaining({ method: 'DELETE' })
    );
    expect(window.location.search).toBe('');
  });

  it('stops waiting for a stalled callback restore and returns to a clean URL', async () => {
    vi.useFakeTimers();
    try {
      setOAuthCallbackUrl();
      const fetchMock = mockStandaloneSessionFetch();
      getAuthMock.mockReturnValueOnce(new Promise(() => {}));

      const sessionPromise = standaloneOAuthAuth.init();
      const timeoutExpectation = expect(sessionPromise).rejects.toThrow(
        'Timed out restoring Home Assistant session'
      );
      await vi.advanceTimersByTimeAsync(OAUTH_CALLBACK_RESTORE_TIMEOUT_MS);

      await timeoutExpectation;
      expect(fetchMock).toHaveBeenCalledWith(
        `${window.location.origin}/__navet_auth__/session`,
        expect.objectContaining({ method: 'DELETE' })
      );
      expect(window.location.search).toBe('');
    } finally {
      vi.useRealTimers();
    }
  });

  it('refreshes standalone OAuth access tokens and persists them with the binding', async () => {
    const auth = createAuth();
    auth.data.expires = Date.now() - 1;
    const fetchMock = mockStandaloneSessionFetch();

    const refreshed = await standaloneOAuthAuth.refresh?.({
      providerId: 'home_assistant',
      runtime: 'standalone-oauth',
      authMode: 'oauth',
      haBaseUrl: 'https://ha.example.com',
      hassUrl: 'https://ha.example.com',
      auth,
      expiresAt: auth.data.expires,
    });

    expect(refreshAccessTokenMock).toHaveBeenCalled();
    expect(refreshed?.expiresAt).toBe(auth.data.expires);
    expect(fetchMock).toHaveBeenCalledWith(
      `${window.location.origin}/__navet_auth__/session`,
      expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({
          'X-Navet-OAuth-Binding': STANDALONE_SESSION_ID,
        }),
        body: JSON.stringify(auth.data),
      })
    );
  });

  it('invalidates only the same-origin browser session', async () => {
    const fetchMock = mockStandaloneSessionFetch();

    await invalidateStandaloneOAuthSession();

    expect(fetchMock).toHaveBeenCalledWith(
      `${window.location.origin}/__navet_auth__/session`,
      expect.objectContaining({
        method: 'DELETE',
        headers: expect.objectContaining({
          'X-Navet-OAuth-Binding': STANDALONE_SESSION_ID,
        }),
      })
    );
    expect(revokeMock).not.toHaveBeenCalled();
  });

  it('revokes and clears only the current browser OAuth session on logout', async () => {
    const auth = createAuth();
    const fetchMock = mockStandaloneSessionFetch();
    getAuthMock.mockResolvedValueOnce(auth);

    await standaloneOAuthAuth.logout?.();

    expect(revokeMock).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(
      `${window.location.origin}/__navet_auth__/session`,
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('creates an openHAB session with base URL and credentials', async () => {
    const fetchMock = vi
      .spyOn(window, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    const session = await openhabUrlSessionAuth.login?.({
      hassUrl: 'http://openhab.local:8080/',
      username: 'navet',
      password: 'secret',
    });

    expect(session).toMatchObject({
      providerId: 'openhab',
      runtime: 'standalone-oauth',
      authMode: 'oauth',
      haBaseUrl: 'http://openhab.local:8080',
      hassUrl: 'http://openhab.local:8080',
      username: 'navet',
      password: 'secret',
      proxyBaseUrl: '/__navet_openhab_proxy__',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      `${window.location.origin}/__navet_openhab__/session`,
      expect.objectContaining({ method: 'PUT' })
    );
  });

  it('requires openHAB credentials for URL-session login', async () => {
    await expect(
      openhabUrlSessionAuth.login?.({
        hassUrl: 'http://openhab.local:8080',
        username: 'navet',
      })
    ).rejects.toThrow('openHAB password is required');
  });

  it('surfaces openHAB credential validation errors during login', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error:
            'openHAB authentication failed. Check your username, password, and API Security settings.',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    );

    await expect(
      openhabUrlSessionAuth.login?.({
        hassUrl: 'http://openhab.local:8080',
        username: 'navet',
        password: 'wrong-password',
      })
    ).rejects.toThrow(
      'openHAB authentication failed. Check your username, password, and API Security settings.'
    );
  });

  it('restores an openHAB session from the same-origin session endpoint', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          hassUrl: 'http://openhab.local:8080',
          username: 'navet',
          password: 'secret',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    );

    const session = await openhabUrlSessionAuth.init();

    expect(session).toMatchObject({
      providerId: 'openhab',
      hassUrl: 'http://openhab.local:8080',
      username: 'navet',
      password: 'secret',
      proxyBaseUrl: '/__navet_openhab_proxy__',
    });
  });
});
