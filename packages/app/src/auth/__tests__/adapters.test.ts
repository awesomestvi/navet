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
} from '../adapters/standaloneOAuthAuth';

const AUTH_SESSION_LOAD_TIMEOUT_MS = 3_000;
const STORED_SESSION_RESTORE_TIMEOUT_MS = 3_000;

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

function setOAuthCallbackUrl(hassUrl = 'https://ha.example.com') {
  const clientId = `${window.location.origin}/`;
  const state = window.btoa(JSON.stringify({ hassUrl, clientId }));
  window.history.replaceState({}, '', `/?auth_callback=1&code=oauth-code&state=${state}`);
  return { clientId, hassUrl };
}

function createStoredTokenResponse(hassUrl = oauthSessionFixture.haBaseUrl) {
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

  it('restores persisted standalone OAuth session from the same-origin auth endpoint', async () => {
    const auth = createAuth(oauthSessionFixture.haBaseUrl);
    const fetchMock = vi
      .spyOn(window, 'fetch')
      .mockResolvedValueOnce(createStoredTokenResponse())
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    getAuthMock.mockResolvedValueOnce(auth);

    const session = await standaloneOAuthAuth.init();

    expect(session).toMatchObject({
      runtime: 'standalone-oauth',
      authMode: 'oauth',
      haBaseUrl: oauthSessionFixture.haBaseUrl,
      hassUrl: oauthSessionFixture.hassUrl,
      auth,
    });
    expect(fetchMock).toHaveBeenLastCalledWith(
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

  it('clears stored standalone OAuth tokens when refresh fails during session restore', async () => {
    const auth = createAuth(oauthSessionFixture.haBaseUrl);
    Object.defineProperty(auth, 'expired', {
      configurable: true,
      get: () => true,
    });
    refreshAccessTokenMock.mockRejectedValueOnce(new Error('refresh failed'));
    const fetchMock = vi
      .spyOn(window, 'fetch')
      .mockResolvedValueOnce(createStoredTokenResponse())
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    getAuthMock.mockResolvedValueOnce(auth);

    await expect(standaloneOAuthAuth.init()).resolves.toBeNull();

    expect(refreshAccessTokenMock).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenLastCalledWith(
      `${window.location.origin}/__navet_auth__/session`,
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('clears stored standalone OAuth tokens when session refresh stalls during restore', async () => {
    vi.useFakeTimers();
    try {
      const auth = createAuth(oauthSessionFixture.haBaseUrl);
      Object.defineProperty(auth, 'expired', {
        configurable: true,
        get: () => true,
      });
      refreshAccessTokenMock.mockReturnValueOnce(new Promise(() => {}));
      const fetchMock = vi
        .spyOn(window, 'fetch')
        .mockResolvedValueOnce(createStoredTokenResponse())
        .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
      getAuthMock.mockResolvedValueOnce(auth);

      const sessionPromise = standaloneOAuthAuth.init();
      await vi.advanceTimersByTimeAsync(STORED_SESSION_RESTORE_TIMEOUT_MS);

      await expect(sessionPromise).resolves.toBeNull();
      expect(fetchMock).toHaveBeenLastCalledWith(
        `${window.location.origin}/__navet_auth__/session`,
        expect.objectContaining({ method: 'DELETE' })
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('exchanges a standalone OAuth callback without requiring the URL form again', async () => {
    const auth = createAuth();
    const { hassUrl } = setOAuthCallbackUrl();
    const fetchMock = vi
      .spyOn(window, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    getAuthMock.mockResolvedValueOnce(auth);

    const session = await standaloneOAuthAuth.init();

    expect(getAuthMock).toHaveBeenCalledWith({
      loadTokens: expect.any(Function),
      saveTokens: expect.any(Function),
    });
    expect(session).toMatchObject({
      runtime: 'standalone-oauth',
      authMode: 'oauth',
      haBaseUrl: hassUrl,
      hassUrl,
      auth,
    });
    expect(fetchMock).toHaveBeenLastCalledWith(
      `${window.location.origin}/__navet_auth__/session`,
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify(auth.data),
      })
    );
    expect(window.location.search).toBe('');
  });

  it('prefers a fresh standalone OAuth callback over stale persisted tokens', async () => {
    const auth = createAuth('https://ha-new.example.com');
    setOAuthCallbackUrl('https://ha-new.example.com');
    const fetchMock = vi.spyOn(window, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    getAuthMock.mockResolvedValueOnce(auth);

    const session = await standaloneOAuthAuth.init();

    expect(getAuthMock).toHaveBeenCalledWith({
      loadTokens: expect.any(Function),
      saveTokens: expect.any(Function),
    });
    expect(session).toMatchObject({
      runtime: 'standalone-oauth',
      authMode: 'oauth',
      haBaseUrl: 'https://ha-new.example.com',
      hassUrl: 'https://ha-new.example.com',
      auth,
    });
    expect(fetchMock).not.toHaveBeenCalledWith(
      `${window.location.origin}/__navet_auth__/session`,
      expect.objectContaining({ method: 'GET' })
    );
  });

  it('starts standalone OAuth login without reading the optional token store first', async () => {
    const auth = createAuth('http://homeassistant.local:8123');
    const fetchMock = vi
      .spyOn(window, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    getAuthMock.mockResolvedValueOnce(auth);

    const session = await standaloneOAuthAuth.login?.({
      hassUrl: 'http://homeassistant.local:8123/',
    });

    expect(getAuthMock).toHaveBeenCalledWith({
      hassUrl: 'http://homeassistant.local:8123',
      redirectUrl: window.location.origin + window.location.pathname,
      saveTokens: expect.any(Function),
      loadTokens: expect.any(Function),
      limitHassInstance: true,
    });
    const loadTokens = getAuthMock.mock.calls[0]?.[0]?.loadTokens as () => Promise<unknown>;
    await expect(loadTokens()).resolves.toBeNull();
    expect(session).toMatchObject({
      runtime: 'standalone-oauth',
      authMode: 'oauth',
      haBaseUrl: 'http://homeassistant.local:8123',
      hassUrl: 'http://homeassistant.local:8123',
      auth,
    });
    expect(fetchMock).toHaveBeenLastCalledWith(
      `${window.location.origin}/__navet_auth__/session`,
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify(auth.data),
      })
    );
  });

  it('rejects malformed standalone OAuth callbacks and clears server-side session data', async () => {
    window.history.replaceState({}, '', '/?auth_callback=1&code=oauth-code&state=not-base64');
    const fetchMock = vi
      .spyOn(window, 'fetch')
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    getAuthMock.mockRejectedValueOnce(new Error('Invalid Home Assistant OAuth callback'));

    await expect(standaloneOAuthAuth.init()).rejects.toThrow(
      'Invalid Home Assistant OAuth callback'
    );

    expect(getAuthMock).toHaveBeenCalledWith({
      loadTokens: expect.any(Function),
      saveTokens: expect.any(Function),
    });
    expect(fetchMock).toHaveBeenLastCalledWith(
      `${window.location.origin}/__navet_auth__/session`,
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('refreshes standalone OAuth access tokens through the auth handle', async () => {
    const auth = createAuth();
    auth.data.expires = Date.now() - 1;
    const fetchMock = vi
      .spyOn(window, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));

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
    expect(fetchMock).toHaveBeenLastCalledWith(
      `${window.location.origin}/__navet_auth__/session`,
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify(auth.data),
      })
    );
  });

  it('invalidates the persisted standalone OAuth session with the same-origin auth store', async () => {
    const fetchMock = vi
      .spyOn(window, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    await invalidateStandaloneOAuthSession();

    expect(fetchMock).toHaveBeenCalledWith(
      `${window.location.origin}/__navet_auth__/session`,
      expect.objectContaining({ method: 'DELETE' })
    );
    expect(revokeMock).not.toHaveBeenCalled();
  });

  it('clears server-side OAuth tokens on logout', async () => {
    const auth = createAuth();
    const fetchMock = vi
      .spyOn(window, 'fetch')
      .mockResolvedValueOnce(createStoredTokenResponse(auth.data.hassUrl))
      .mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    getAuthMock.mockResolvedValueOnce(auth);

    await standaloneOAuthAuth.logout?.();

    expect(revokeMock).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenLastCalledWith(
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
