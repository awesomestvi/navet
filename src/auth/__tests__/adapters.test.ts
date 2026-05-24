import type { Auth } from 'home-assistant-js-websocket';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { haIngressAuth } from '../adapters/haIngressAuth';
import { haPanelAuth } from '../adapters/haPanelAuth';
import { standaloneOAuthAuth } from '../adapters/standaloneOAuthAuth';

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

describe('auth adapters', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, '', '/');
    vi.restoreAllMocks();
    getAuthMock.mockReset();
    refreshAccessTokenMock.mockReset();
    revokeMock.mockReset();
  });

  it('creates panel session without token data', async () => {
    const session = await haPanelAuth.init();
    expect(session).toMatchObject({
      runtime: 'ha-panel',
      hassUrl: window.location.origin,
    });
    expect(session?.auth).toBeUndefined();
  });

  it('creates ingress session from Home Assistant frontend auth when available', async () => {
    const auth = createAuth(window.location.origin);
    getAuthMock.mockResolvedValueOnce(auth);

    const session = await haIngressAuth.init();

    expect(getAuthMock).toHaveBeenCalledWith({ hassUrl: window.location.origin });
    expect(session).toMatchObject({
      runtime: 'ha-ingress',
      hassUrl: window.location.origin,
      auth,
    });
  });

  it('restores persisted standalone OAuth session from the same-origin auth endpoint', async () => {
    const auth = createAuth();
    vi.spyOn(window, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(auth.data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
    getAuthMock.mockResolvedValueOnce(auth);

    const session = await standaloneOAuthAuth.init();

    expect(session).toMatchObject({
      runtime: 'standalone-oauth',
      hassUrl: 'https://ha.example.com',
      auth,
    });
  });

  it('exchanges a standalone OAuth callback without requiring the URL form again', async () => {
    const auth = createAuth();
    const { clientId, hassUrl } = setOAuthCallbackUrl();
    vi.spyOn(window, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));
    getAuthMock.mockResolvedValueOnce(auth);

    const session = await standaloneOAuthAuth.init();

    expect(getAuthMock).toHaveBeenCalledWith({
      hassUrl,
      clientId,
      loadTokens: expect.any(Function),
      saveTokens: expect.any(Function),
      limitHassInstance: true,
    });
    expect(session).toMatchObject({
      runtime: 'standalone-oauth',
      hassUrl,
      auth,
    });
    expect(window.location.search).toBe('');
  });

  it('rejects malformed standalone OAuth callbacks and clears server-side session data', async () => {
    window.history.replaceState({}, '', '/?auth_callback=1&code=oauth-code&state=not-base64');
    const fetchMock = vi
      .spyOn(window, 'fetch')
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    await expect(standaloneOAuthAuth.init()).rejects.toThrow(
      'Invalid Home Assistant OAuth callback'
    );

    expect(getAuthMock).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenLastCalledWith(
      `${window.location.origin}/__navet_auth__/session`,
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('refreshes standalone OAuth access tokens through the auth handle', async () => {
    const auth = createAuth();
    auth.data.expires = Date.now() - 1;

    const refreshed = await standaloneOAuthAuth.refresh?.({
      runtime: 'standalone-oauth',
      hassUrl: 'https://ha.example.com',
      auth,
      expiresAt: auth.data.expires,
    });

    expect(refreshAccessTokenMock).toHaveBeenCalled();
    expect(refreshed?.expiresAt).toBe(auth.data.expires);
  });

  it('clears server-side OAuth tokens on logout', async () => {
    const auth = createAuth();
    const fetchMock = vi
      .spyOn(window, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify(auth.data), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
      .mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    getAuthMock.mockResolvedValueOnce(auth);

    await standaloneOAuthAuth.logout?.();

    expect(revokeMock).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenLastCalledWith(
      `${window.location.origin}/__navet_auth__/session`,
      expect.objectContaining({ method: 'DELETE' })
    );
  });
});
