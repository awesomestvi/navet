import { ingressSessionFixture } from '@navet/app/test/fixtures/home-assistant/auth/ingress';
import { oauthSessionFixture } from '@navet/app/test/fixtures/home-assistant/auth/oauth';
import { panelSessionFixture } from '@navet/app/test/fixtures/home-assistant/auth/panel';
import { type Auth, ERR_INVALID_AUTH } from 'home-assistant-js-websocket';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { haIngressAuth } from '../adapters/haIngressAuth';
import { haPanelAuth } from '../adapters/haPanelAuth';
import { homeyOAuthAuth, homeyOAuthNavigation } from '../adapters/homeyOAuthAuth';
import { openhabUrlSessionAuth } from '../adapters/openhabUrlSessionAuth';
import {
  invalidateStandaloneOAuthSession,
  StandaloneOAuthSessionUnavailableError,
  standaloneOAuthAuth,
  standaloneOAuthNavigation,
} from '../adapters/standaloneOAuthAuth';
import {
  captureInstallationPairingKeyFromFragment,
  clearInstallationPairingKey,
  getInstallationPairingHeaders,
} from '../installation-pairing';

const AUTH_SESSION_LOAD_TIMEOUT_MS = 3_000;
const STORED_SESSION_RESTORE_TIMEOUT_MS = 3_000;
const OAUTH_CALLBACK_RESTORE_TIMEOUT_MS = 10_000;
const INSTALLATION_KEY = 'a'.repeat(64);
const getStandaloneProxyUrl = () => `${window.location.origin}/__navet_ha_proxy__`;

const { getAuthMock, refreshAccessTokenMock, revokeMock } = vi.hoisted(() => ({
  getAuthMock: vi.fn(),
  refreshAccessTokenMock: vi.fn(),
  revokeMock: vi.fn(),
}));

vi.mock('home-assistant-js-websocket', () => ({
  ERR_INVALID_AUTH: 2,
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
  authRevision?: number;
  hassUrl?: string;
  userId?: string | null;
}) {
  const authenticated = options?.authenticated ?? true;
  return new Response(
    JSON.stringify({
      authenticated,
      providerId: 'home_assistant',
      sessionId: STANDALONE_SESSION_ID,
      authRevision: options?.authRevision ?? 0,
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
  authRevision?: number;
  authorizeError?: string;
  authorizeStatus?: number;
  deletionStatus?: number;
  hassUrl?: string;
  persistenceStatus?: number;
  userId?: string | null;
}) {
  let authRevision = options?.authRevision ?? 0;
  return vi.spyOn(window, 'fetch').mockImplementation(async (input, init) => {
    const url = String(input);
    if (url.endsWith('/__navet_auth__/session/credentials')) {
      return createCredentialsResponse(options?.hassUrl);
    }
    if (url.endsWith('/__navet_auth__/authorize')) {
      return new Response(
        JSON.stringify(
          options?.authorizeStatus
            ? { error: options.authorizeError ?? 'OAuth start rejected' }
            : {
                authorizeUrl: `${
                  options?.hassUrl ?? 'https://ha.example.com'
                }/auth/authorize?state=server-state`,
              }
        ),
        {
          status: options?.authorizeStatus ?? 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    if (url.endsWith('/__navet_auth__/session') && !init?.method) {
      return createSessionMetadataResponse({ ...options, authRevision });
    }
    if (
      url.endsWith('/__navet_auth__/session') &&
      init?.method === 'PUT' &&
      options?.persistenceStatus
    ) {
      return new Response(JSON.stringify({ ok: false }), {
        status: options.persistenceStatus,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (url.endsWith('/__navet_auth__/session') && init?.method === 'PUT') {
      authRevision += 1;
      return createSessionMetadataResponse({ ...options, authRevision });
    }
    if (
      url.endsWith('/__navet_auth__/session') &&
      init?.method === 'DELETE' &&
      options?.deletionStatus
    ) {
      return new Response(JSON.stringify({ ok: false }), {
        status: options.deletionStatus,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  });
}

describe('auth adapters', () => {
  beforeEach(() => {
    clearInstallationPairingKey();
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
    getAuthMock.mockImplementationOnce(
      async (options: { loadTokens: () => Promise<Auth['data']> }) => {
        auth.data = await options.loadTokens();
        return auth;
      }
    );

    const session = await standaloneOAuthAuth.init();

    expect(session).toMatchObject({
      runtime: 'standalone-oauth',
      authMode: 'oauth',
      haBaseUrl: oauthSessionFixture.haBaseUrl,
      hassUrl: getStandaloneProxyUrl(),
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
        headers: expect.objectContaining({
          'X-Navet-Auth-Revision': '0',
        }),
        body: JSON.stringify({
          ...auth.data,
          hassUrl: oauthSessionFixture.haBaseUrl,
        }),
      })
    );
  });

  it('deduplicates a library save that finishes before the awaited persistence pass', async () => {
    const auth = createAuth(oauthSessionFixture.haBaseUrl);
    const fetchMock = mockStandaloneSessionFetch();
    getAuthMock.mockImplementationOnce(
      async (options: { saveTokens: (data: Auth['data'] | null) => void }) => {
        options.saveTokens(auth.data);
        await vi.waitFor(() => {
          expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'PUT')).toHaveLength(1);
        });
        return auth;
      }
    );

    await expect(standaloneOAuthAuth.init()).resolves.toMatchObject({
      credentialSessionId: STANDALONE_SESSION_ID,
      credentialRevision: 1,
    });
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'PUT')).toHaveLength(1);
  });

  it('reports temporarily unavailable startup when the same-origin auth endpoint stalls', async () => {
    vi.useFakeTimers();
    try {
      vi.spyOn(window, 'fetch').mockReturnValue(new Promise(() => {}));
      const sessionPromise = standaloneOAuthAuth.init();
      const expectation = expect(sessionPromise).rejects.toBeInstanceOf(
        StandaloneOAuthSessionUnavailableError
      );
      await vi.advanceTimersByTimeAsync(AUTH_SESSION_LOAD_TIMEOUT_MS);
      await expectation;
      expect(getAuthMock).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('preserves the browser-bound standalone session when a restore refresh fails transiently', async () => {
    const auth = createAuth(oauthSessionFixture.haBaseUrl);
    Object.defineProperty(auth, 'expired', {
      configurable: true,
      get: () => true,
    });
    refreshAccessTokenMock.mockRejectedValueOnce(new Error('refresh failed'));
    const fetchMock = mockStandaloneSessionFetch();
    getAuthMock.mockResolvedValueOnce(auth);

    await expect(standaloneOAuthAuth.init()).rejects.toBeInstanceOf(
      StandaloneOAuthSessionUnavailableError
    );

    expect(refreshAccessTokenMock).toHaveBeenCalled();
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(false);
  });

  it('clears only the browser-bound standalone session for confirmed invalid auth on restore', async () => {
    const auth = createAuth(oauthSessionFixture.haBaseUrl);
    Object.defineProperty(auth, 'expired', {
      configurable: true,
      get: () => true,
    });
    refreshAccessTokenMock.mockRejectedValueOnce(ERR_INVALID_AUTH);
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
          'X-Navet-Auth-Revision': '0',
        }),
      })
    );
  });

  it('restores a newer durable session when confirmed-invalid cleanup loses a revision race', async () => {
    const staleAuth = createAuth(oauthSessionFixture.haBaseUrl);
    Object.defineProperty(staleAuth, 'expired', {
      configurable: true,
      get: () => true,
    });
    const winnerAuth = createAuth(oauthSessionFixture.haBaseUrl);
    winnerAuth.data = {
      ...winnerAuth.data,
      access_token: 'winner-access-token',
      expires: Date.now() + 7_200_000,
    };
    let serverRevision = 0;
    const fetchMock = vi.spyOn(window, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.endsWith('/__navet_auth__/session/credentials')) {
        return createCredentialsResponse(oauthSessionFixture.haBaseUrl);
      }
      if (url.endsWith('/__navet_auth__/session') && !init?.method) {
        return createSessionMetadataResponse({ authRevision: serverRevision });
      }
      if (url.endsWith('/__navet_auth__/session') && init?.method === 'DELETE') {
        serverRevision = 1;
        return new Response(
          JSON.stringify({
            code: 'credential-session-superseded',
            session: await createSessionMetadataResponse({ authRevision: serverRevision }).json(),
          }),
          {
            status: 409,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
      if (url.endsWith('/__navet_auth__/session') && init?.method === 'PUT') {
        return createSessionMetadataResponse({ authRevision: serverRevision });
      }
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });
    refreshAccessTokenMock.mockRejectedValueOnce(ERR_INVALID_AUTH);
    getAuthMock.mockResolvedValueOnce(staleAuth).mockResolvedValueOnce(winnerAuth);

    await expect(standaloneOAuthAuth.init()).resolves.toMatchObject({
      auth: winnerAuth,
      credentialSessionId: STANDALONE_SESSION_ID,
      credentialRevision: 1,
    });

    const deleteRequest = fetchMock.mock.calls.find(([, init]) => init?.method === 'DELETE');
    expect(deleteRequest?.[1]).toEqual(
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Navet-OAuth-Binding': STANDALONE_SESSION_ID,
          'X-Navet-Auth-Revision': '0',
        }),
      })
    );
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'DELETE')).toHaveLength(1);
  });

  it('keeps startup pending when a confirmed-invalid durable session cannot be deleted', async () => {
    const auth = createAuth(oauthSessionFixture.haBaseUrl);
    Object.defineProperty(auth, 'expired', {
      configurable: true,
      get: () => true,
    });
    refreshAccessTokenMock.mockRejectedValueOnce(ERR_INVALID_AUTH);
    mockStandaloneSessionFetch({ deletionStatus: 503 });
    getAuthMock.mockResolvedValueOnce(auth);

    await expect(standaloneOAuthAuth.init()).rejects.toBeInstanceOf(
      StandaloneOAuthSessionUnavailableError
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
      const expectation = expect(sessionPromise).rejects.toBeInstanceOf(
        StandaloneOAuthSessionUnavailableError
      );
      await vi.advanceTimersByTimeAsync(STORED_SESSION_RESTORE_TIMEOUT_MS);

      await expectation;
      expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('restores a server-exchanged OAuth callback and removes callback parameters', async () => {
    const auth = createAuth(oauthSessionFixture.haBaseUrl);
    setOAuthCallbackUrl();
    const fetchMock = mockStandaloneSessionFetch();
    getAuthMock.mockImplementationOnce(
      async (options: { loadTokens: () => Promise<Auth['data']> }) => {
        expect(window.location.search).toBe('');
        auth.data = await options.loadTokens();
        return auth;
      }
    );

    const session = await standaloneOAuthAuth.init();

    expect(getAuthMock).toHaveBeenCalledWith({
      hassUrl: getStandaloneProxyUrl(),
      loadTokens: expect.any(Function),
      saveTokens: expect.any(Function),
      limitHassInstance: true,
    });
    expect(session).toMatchObject({
      runtime: 'standalone-oauth',
      authMode: 'oauth',
      haBaseUrl: oauthSessionFixture.haBaseUrl,
      hassUrl: getStandaloneProxyUrl(),
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
    window.history.replaceState({}, '', `/#navet_pairing=${INSTALLATION_KEY}`);
    captureInstallationPairingKeyFromFragment();
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
          'X-Navet-Installation-Key': INSTALLATION_KEY,
        }),
        body: JSON.stringify({
          hassUrl: 'http://homeassistant.local:8123',
          returnTo: '/',
        }),
      })
    );
    expect(window.location.hash).toBe('');
    expect(getInstallationPairingHeaders()).toEqual({});
    expect(getAuthMock).not.toHaveBeenCalled();
  });

  it('starts Homey OAuth through a same-origin POST before navigating to Athom', async () => {
    window.history.replaceState({}, '', `/#navet_pairing=${INSTALLATION_KEY}`);
    captureInstallationPairingKeyFromFragment();
    const fetchMock = vi.spyOn(window, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          authorizeUrl: 'https://api.athom.com/oauth2/authorise?state=server-state',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    );
    const navigationMock = vi
      .spyOn(homeyOAuthNavigation, 'assign')
      .mockImplementation(() => undefined);

    void homeyOAuthAuth.login?.({ providerId: 'homey' });

    await vi.waitFor(() => {
      expect(navigationMock).toHaveBeenCalledWith(
        'https://api.athom.com/oauth2/authorise?state=server-state'
      );
    });
    expect(fetchMock).toHaveBeenCalledWith(
      `${window.location.origin}/__navet_homey__/authorize`,
      expect.objectContaining({
        method: 'POST',
        credentials: 'same-origin',
        headers: expect.objectContaining({
          'X-Navet-Installation-Key': INSTALLATION_KEY,
        }),
        body: JSON.stringify({ returnTo: '/' }),
      })
    );
    expect(getInstallationPairingHeaders()).toEqual({});
  });

  it('surfaces Home Assistant pairing rejection and retains the ephemeral key', async () => {
    window.history.replaceState({}, '', `/#navet_pairing=${INSTALLATION_KEY}`);
    captureInstallationPairingKeyFromFragment();
    mockStandaloneSessionFetch({
      authenticated: false,
      authorizeStatus: 403,
      authorizeError: 'Operator pairing is required',
    });

    await expect(
      standaloneOAuthAuth.login?.({
        hassUrl: 'http://homeassistant.local:8123',
      })
    ).rejects.toThrow('Operator pairing is required');
    expect(getInstallationPairingHeaders()).toEqual({
      'X-Navet-Installation-Key': INSTALLATION_KEY,
    });
  });

  it('surfaces Homey pairing rejection and retains the ephemeral key', async () => {
    window.history.replaceState({}, '', `/#navet_pairing=${INSTALLATION_KEY}`);
    captureInstallationPairingKeyFromFragment();
    vi.spyOn(window, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Operator pairing is required for Homey' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    await expect(homeyOAuthAuth.login?.({ providerId: 'homey' })).rejects.toThrow(
      'Operator pairing is required for Homey'
    );
    expect(getInstallationPairingHeaders()).toEqual({
      'X-Navet-Installation-Key': INSTALLATION_KEY,
    });
  });

  it('surfaces a Home Assistant credential-capacity response', async () => {
    mockStandaloneSessionFetch({
      authenticated: false,
      authorizeStatus: 507,
      authorizeError: 'Home Assistant credential session capacity has been reached',
    });

    await expect(
      standaloneOAuthAuth.login?.({
        hassUrl: 'http://homeassistant.local:8123',
      })
    ).rejects.toThrow('Home Assistant credential session capacity has been reached');
  });

  it('surfaces a Homey credential-capacity response', async () => {
    vi.spyOn(window, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          error: 'Provider credential session capacity has been reached',
          code: 'credential-session-capacity-reached',
        }),
        {
          status: 507,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    );

    await expect(homeyOAuthAuth.login?.({ providerId: 'homey' })).rejects.toThrow(
      'Provider credential session capacity has been reached'
    );
  });

  it('refuses to navigate when the Homey OAuth start returns another origin', async () => {
    window.history.replaceState({}, '', `/#navet_pairing=${INSTALLATION_KEY}`);
    captureInstallationPairingKeyFromFragment();
    vi.spyOn(window, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          authorizeUrl: 'https://attacker.example/oauth2/authorise?state=server-state',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    );
    const navigationMock = vi
      .spyOn(homeyOAuthNavigation, 'assign')
      .mockImplementation(() => undefined);

    await expect(homeyOAuthAuth.login?.({ providerId: 'homey' })).rejects.toThrow(
      'Homey returned an invalid authorization URL'
    );
    expect(navigationMock).not.toHaveBeenCalled();
    expect(getInstallationPairingHeaders()).toEqual({
      'X-Navet-Installation-Key': INSTALLATION_KEY,
    });
  });

  it('rejects a callback marker without a server-created browser session', async () => {
    setOAuthCallbackUrl();
    const fetchMock = mockStandaloneSessionFetch({ authenticated: false });

    await expect(standaloneOAuthAuth.init()).rejects.toThrow(
      'Home Assistant OAuth callback did not create a session'
    );

    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(false);
    expect(window.location.search).toBe('');
  });

  it('maps an unavailable Home Assistant callback back to an actionable login message', async () => {
    window.history.replaceState(
      {},
      '',
      '/?navet_oauth_error=temporarily_unavailable&code=discarded&state=discarded'
    );
    const fetchMock = mockStandaloneSessionFetch({ authenticated: false });

    await expect(standaloneOAuthAuth.init()).rejects.toThrow(
      'Navet could not reach Home Assistant to finish sign-in. Check that Home Assistant is reachable from this Navet server, then try again.'
    );

    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(false);
    expect(window.location.search).toBe('');
  });

  it('distinguishes an invalid Home Assistant callback response from reachability failures', async () => {
    window.history.replaceState({}, '', '/?navet_oauth_error=invalid_response');
    const fetchMock = mockStandaloneSessionFetch({ authenticated: false });

    await expect(standaloneOAuthAuth.init()).rejects.toThrow(
      'Home Assistant returned an invalid sign-in response. Please start a fresh sign-in.'
    );

    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(false);
    expect(window.location.search).toBe('');
  });

  it('stops waiting for a stalled callback restore and returns to a clean URL', async () => {
    vi.useFakeTimers();
    try {
      setOAuthCallbackUrl();
      const fetchMock = mockStandaloneSessionFetch();
      getAuthMock.mockReturnValueOnce(new Promise(() => {}));

      const sessionPromise = standaloneOAuthAuth.init();
      const timeoutExpectation = expect(sessionPromise).rejects.toBeInstanceOf(
        StandaloneOAuthSessionUnavailableError
      );
      await vi.advanceTimersByTimeAsync(OAUTH_CALLBACK_RESTORE_TIMEOUT_MS);

      await timeoutExpectation;
      expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(false);
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
      credentialSessionId: STANDALONE_SESSION_ID,
      credentialRevision: 0,
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
          'X-Navet-Auth-Revision': '0',
        }),
        body: JSON.stringify(auth.data),
      })
    );
  });

  it('loads the winning server tokens when another tab wins the refresh race', async () => {
    let serverRevision = 0;
    let serverTokens = {
      ...oauthSessionFixture.tokenPayload,
      hassUrl: oauthSessionFixture.haBaseUrl,
    };
    let saveTokens: ((data: Auth['data'] | null) => void) | undefined;
    let staleWrites = 0;
    const fetchMock = vi.spyOn(window, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.endsWith('/__navet_auth__/session/credentials')) {
        return new Response(JSON.stringify(serverTokens), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      if (url.endsWith('/__navet_auth__/session') && !init?.method) {
        return createSessionMetadataResponse({ authRevision: serverRevision });
      }
      if (url.endsWith('/__navet_auth__/session') && init?.method === 'PUT') {
        const headers = new Headers(init.headers);
        const expectedRevision = Number(headers.get('X-Navet-Auth-Revision'));
        const submitted = JSON.parse(String(init.body)) as typeof serverTokens;
        if (
          expectedRevision !== serverRevision &&
          JSON.stringify(submitted) !== JSON.stringify(serverTokens)
        ) {
          staleWrites += 1;
          return new Response(
            JSON.stringify({
              code: 'credential-session-superseded',
              session: {
                ...(await createSessionMetadataResponse({
                  authRevision: serverRevision,
                }).json()),
              },
            }),
            {
              status: 409,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }
        if (JSON.stringify(submitted) !== JSON.stringify(serverTokens)) {
          serverTokens = submitted;
          serverRevision += 1;
        }
        return createSessionMetadataResponse({ authRevision: serverRevision });
      }
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });
    getAuthMock.mockImplementation(
      async (options: {
        loadTokens: () => Promise<Auth['data']>;
        saveTokens: (data: Auth['data'] | null) => void;
      }) => {
        const auth = createAuth(oauthSessionFixture.haBaseUrl);
        auth.data = await options.loadTokens();
        saveTokens = options.saveTokens;
        return auth;
      }
    );
    const initial = await standaloneOAuthAuth.init();
    if (!initial?.auth) {
      throw new Error('Expected the initial standalone OAuth session');
    }
    const initialAuth = initial.auth;
    refreshAccessTokenMock.mockImplementationOnce(async () => {
      serverTokens = {
        ...serverTokens,
        access_token: 'winner-access-token',
        expires: Date.now() + 3_600_000,
      };
      serverRevision = 1;
      initialAuth.data = {
        ...initialAuth.data,
        access_token: 'stale-loser-access-token',
        expires: Date.now() + 3_600_000,
      };
      saveTokens?.(initialAuth.data);
    });

    const converged = await standaloneOAuthAuth.refresh?.(initial);

    expect(staleWrites).toBe(1);
    expect(converged).toMatchObject({
      credentialSessionId: STANDALONE_SESSION_ID,
      credentialRevision: 1,
      auth: {
        data: {
          access_token: 'winner-access-token',
        },
      },
    });
    expect(serverTokens.access_token).toBe('winner-access-token');
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(false);
  });

  it('surfaces a failed token persistence response without deleting the durable session', async () => {
    const auth = createAuth();
    const fetchMock = mockStandaloneSessionFetch({ persistenceStatus: 503 });

    await expect(
      standaloneOAuthAuth.refresh?.({
        providerId: 'home_assistant',
        runtime: 'standalone-oauth',
        authMode: 'oauth',
        haBaseUrl: 'https://ha.example.com',
        hassUrl: 'https://ha.example.com',
        auth,
        credentialSessionId: STANDALONE_SESSION_ID,
        credentialRevision: 0,
        expiresAt: auth.data.expires,
      })
    ).rejects.toThrow('Unable to persist the refreshed Home Assistant session');

    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'DELETE')).toBe(false);
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

  it('returns the newer session when explicit confirmed-invalid cleanup is superseded', async () => {
    const staleAuth = createAuth(oauthSessionFixture.haBaseUrl);
    const winnerAuth = createAuth(oauthSessionFixture.haBaseUrl);
    winnerAuth.data = {
      ...winnerAuth.data,
      access_token: 'winner-access-token',
      expires: Date.now() + 7_200_000,
    };
    let serverRevision = 0;
    const fetchMock = vi.spyOn(window, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.endsWith('/__navet_auth__/session/credentials')) {
        return createCredentialsResponse(oauthSessionFixture.haBaseUrl);
      }
      if (url.endsWith('/__navet_auth__/session') && !init?.method) {
        return createSessionMetadataResponse({ authRevision: serverRevision });
      }
      if (url.endsWith('/__navet_auth__/session') && init?.method === 'DELETE') {
        serverRevision = 1;
        return new Response(
          JSON.stringify({
            code: 'credential-session-superseded',
            session: await createSessionMetadataResponse({ authRevision: serverRevision }).json(),
          }),
          {
            status: 409,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
      if (url.endsWith('/__navet_auth__/session') && init?.method === 'PUT') {
        return createSessionMetadataResponse({ authRevision: serverRevision });
      }
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });
    getAuthMock.mockResolvedValueOnce(winnerAuth);

    const replacement = await standaloneOAuthAuth.invalidatePersistedSession?.({
      providerId: 'home_assistant',
      runtime: 'standalone-oauth',
      authMode: 'oauth',
      haBaseUrl: oauthSessionFixture.haBaseUrl,
      hassUrl: oauthSessionFixture.hassUrl,
      auth: staleAuth,
      credentialSessionId: STANDALONE_SESSION_ID,
      credentialRevision: 0,
      expiresAt: staleAuth.data.expires,
    });

    expect(replacement).toMatchObject({
      auth: winnerAuth,
      credentialSessionId: STANDALONE_SESSION_ID,
      credentialRevision: 1,
    });
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'DELETE')).toHaveLength(1);
    expect(
      new Headers(
        fetchMock.mock.calls.find(([, init]) => init?.method === 'DELETE')?.[1]?.headers
      ).get('X-Navet-Auth-Revision')
    ).toBe('0');
  });

  it('revokes and clears only the current browser OAuth session on logout', async () => {
    const auth = createAuth();
    const fetchMock = mockStandaloneSessionFetch();
    getAuthMock.mockResolvedValueOnce(auth);

    await standaloneOAuthAuth.logout?.();

    expect(revokeMock).toHaveBeenCalled();
    expect(getAuthMock).toHaveBeenCalledWith(
      expect.objectContaining({
        hassUrl: getStandaloneProxyUrl(),
        loadTokens: expect.any(Function),
      })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      `${window.location.origin}/__navet_auth__/session`,
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('still clears the local browser session when upstream token revocation hangs', async () => {
    vi.useFakeTimers();
    try {
      const auth = createAuth();
      revokeMock.mockReturnValueOnce(new Promise(() => {}));
      const fetchMock = mockStandaloneSessionFetch();
      getAuthMock.mockResolvedValueOnce(auth);

      const logoutPromise = standaloneOAuthAuth.logout?.();
      await vi.advanceTimersByTimeAsync(AUTH_SESSION_LOAD_TIMEOUT_MS);
      await logoutPromise;

      expect(fetchMock).toHaveBeenCalledWith(
        `${window.location.origin}/__navet_auth__/session`,
        expect.objectContaining({ method: 'DELETE' })
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('creates a proxied openHAB session without retaining credentials in the browser', async () => {
    window.history.replaceState({}, '', `/#navet_pairing=${INSTALLATION_KEY}`);
    captureInstallationPairingKeyFromFragment();
    const fetchMock = vi.spyOn(window, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          authenticated: true,
          hassUrl: 'http://openhab.local:8080',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    );

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
      proxyBaseUrl: '/__navet_openhab_proxy__',
    });
    expect(session).not.toHaveProperty('username');
    expect(session).not.toHaveProperty('password');
    expect(fetchMock).toHaveBeenCalledWith(
      `${window.location.origin}/__navet_openhab__/session`,
      expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({
          'X-Navet-Installation-Key': INSTALLATION_KEY,
        }),
        body: JSON.stringify({
          hassUrl: 'http://openhab.local:8080',
          username: 'navet',
          password: 'secret',
        }),
      })
    );
    expect(getInstallationPairingHeaders()).toEqual({});
  });

  it('establishes an opaque browser binding before retrying an unbound openHAB login', async () => {
    window.history.replaceState({}, '', `/#navet_pairing=${INSTALLATION_KEY}`);
    captureInstallationPairingKeyFromFragment();
    const fetchMock = vi
      .spyOn(window, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'openHAB browser session is not bound' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            authenticated: true,
            hassUrl: 'http://openhab.local:8080',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      );

    const session = await openhabUrlSessionAuth.login?.({
      hassUrl: 'http://openhab.local:8080',
      username: 'navet',
      password: 'secret',
    });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      `${window.location.origin}/__navet_openhab__/session`,
      expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({
          'X-Navet-Installation-Key': INSTALLATION_KEY,
        }),
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      `${window.location.origin}/__navet_openhab__/session`,
      expect.not.objectContaining({ method: 'PUT' })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      `${window.location.origin}/__navet_openhab__/session`,
      expect.objectContaining({
        method: 'PUT',
        headers: expect.objectContaining({
          'X-Navet-Installation-Key': INSTALLATION_KEY,
        }),
      })
    );
    expect(session).toMatchObject({
      providerId: 'openhab',
      proxyBaseUrl: '/__navet_openhab_proxy__',
    });
    expect(session).not.toHaveProperty('username');
    expect(getInstallationPairingHeaders()).toEqual({});
    expect(session).not.toHaveProperty('password');
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
          authenticated: true,
          hassUrl: 'http://openhab.local:8080',
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
      proxyBaseUrl: '/__navet_openhab_proxy__',
    });
    expect(session).not.toHaveProperty('username');
    expect(session).not.toHaveProperty('password');
  });

  it.each([
    {
      name: 'network failure',
      response: () => Promise.reject(new TypeError('connection refused')),
    },
    {
      name: 'missing server route',
      response: () => Promise.resolve(new Response(null, { status: 404 })),
    },
  ])('keeps openHAB restoration retryable after a $name', async ({ response }) => {
    vi.spyOn(window, 'fetch').mockImplementation(response);

    await expect(openhabUrlSessionAuth.init()).rejects.toBeInstanceOf(
      StandaloneOAuthSessionUnavailableError
    );
  });
});
