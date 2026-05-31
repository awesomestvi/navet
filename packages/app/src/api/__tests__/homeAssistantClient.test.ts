import { resetRuntimeContextForTests } from '@navet/app/infrastructure/home-assistant/runtime/runtime-detector';
import { ingressSessionFixture } from '@navet/app/test/fixtures/home-assistant/auth/ingress';
import { oauthSessionFixture } from '@navet/app/test/fixtures/home-assistant/auth/oauth';
import { panelSessionFixture } from '@navet/app/test/fixtures/home-assistant/auth/panel';
import type { Auth } from 'home-assistant-js-websocket';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHomeAssistantClient } from '../homeAssistantClient';

const { createConnectionMock, getAuthMock } = vi.hoisted(() => ({
  createConnectionMock: vi.fn(),
  getAuthMock: vi.fn(),
}));

interface AuthDataShape {
  hassUrl: string;
  clientId: string | null;
  expires: number;
  refresh_token: string;
  access_token: string;
  expires_in: number;
}

vi.mock('home-assistant-js-websocket', () => ({
  Auth: class Auth {
    data: AuthDataShape;

    constructor(data: AuthDataShape) {
      this.data = data;
    }

    get wsUrl() {
      return `ws${this.data.hassUrl.slice(4)}/api/websocket`;
    }

    get accessToken() {
      return this.data.access_token;
    }

    get expired() {
      return Date.now() > this.data.expires;
    }

    refreshAccessToken = vi.fn();
    revoke = vi.fn();
  },
  createConnection: createConnectionMock,
  getAuth: getAuthMock,
}));

describe('createHomeAssistantClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/');
    createConnectionMock.mockResolvedValue({ id: 'connection' });
    window.__NAVET_CONFIG__ = undefined;
    resetRuntimeContextForTests();
  });

  it('does not start OAuth for an auth-less add-on ingress session', async () => {
    window.history.replaceState({}, '', ingressSessionFixture.ingressPath);
    resetRuntimeContextForTests();

    await createHomeAssistantClient({
      providerId: 'home_assistant',
      runtime: ingressSessionFixture.runtime,
      authMode: ingressSessionFixture.authMode,
      haBaseUrl: ingressSessionFixture.haBaseUrl,
      hassUrl: ingressSessionFixture.hassUrl,
    });

    expect(getAuthMock).not.toHaveBeenCalled();
    expect(createConnectionMock).toHaveBeenCalledWith({
      auth: expect.objectContaining({
        data: expect.objectContaining({
          hassUrl: `${window.location.origin}/api/hassio_ingress/navet_dev/__navet_ha_proxy__`,
          clientId: null,
        }),
      }),
      setupRetry: 3,
    });
  });

  it('falls back to ingress proxy auth when a reused frontend token has expired', async () => {
    window.history.replaceState({}, '', ingressSessionFixture.ingressPath);
    resetRuntimeContextForTests();

    const refreshAccessToken = vi.fn(async () => {
      throw new Error('expired frontend token');
    });
    const auth = {
      data: {
        hassUrl: ingressSessionFixture.haBaseUrl,
        clientId: `${window.location.origin}/`,
        expires: Date.now() - 1,
        refresh_token: 'refresh-token',
        access_token: 'stale-token',
        expires_in: 3600,
      },
      refreshAccessToken,
      revoke: vi.fn(),
      get wsUrl() {
        return `ws${this.data.hassUrl.slice(4)}/api/websocket`;
      },
      get accessToken() {
        return this.data.access_token;
      },
      get expired() {
        return Date.now() > this.data.expires;
      },
    } as Auth;

    await createHomeAssistantClient({
      providerId: 'home_assistant',
      runtime: ingressSessionFixture.runtime,
      authMode: ingressSessionFixture.authMode,
      haBaseUrl: ingressSessionFixture.haBaseUrl,
      hassUrl: ingressSessionFixture.hassUrl,
      auth,
      expiresAt: auth.data.expires,
    });

    expect(refreshAccessToken).toHaveBeenCalled();
    expect(createConnectionMock).toHaveBeenCalledWith({
      auth: expect.objectContaining({
        data: expect.objectContaining({
          hassUrl: `${window.location.origin}/api/hassio_ingress/navet_dev/__navet_ha_proxy__`,
          clientId: null,
        }),
      }),
      setupRetry: 3,
    });
  });

  it('keeps standalone OAuth persistence pointed at Home Assistant while proxying the connection', async () => {
    window.__NAVET_CONFIG__ = {
      hassUrl: oauthSessionFixture.haBaseUrl,
      proxyBaseUrl: '/__navet_ha_proxy__',
    };
    resetRuntimeContextForTests();

    const refreshAccessToken = vi.fn();
    const revoke = vi.fn();
    const auth = {
      data: {
        hassUrl: oauthSessionFixture.haBaseUrl,
        clientId: `${window.location.origin}/`,
        expires: Date.now() + 3_600_000,
        refresh_token: 'refresh-token',
        access_token: 'access-token',
        expires_in: 3600,
      },
      refreshAccessToken,
      revoke,
      get wsUrl() {
        return `ws${this.data.hassUrl.slice(4)}/api/websocket`;
      },
      get accessToken() {
        return this.data.access_token;
      },
      get expired() {
        return Date.now() > this.data.expires;
      },
    } as Auth;

    await createHomeAssistantClient({
      providerId: 'home_assistant',
      runtime: oauthSessionFixture.runtime,
      authMode: oauthSessionFixture.authMode,
      haBaseUrl: oauthSessionFixture.haBaseUrl,
      hassUrl: oauthSessionFixture.hassUrl,
      auth,
      expiresAt: auth.data.expires,
    });

    expect(createConnectionMock).toHaveBeenCalledWith({
      auth: expect.objectContaining({
        data: expect.objectContaining({
          hassUrl: `${window.location.origin}/__navet_ha_proxy__`,
          access_token: 'access-token',
        }),
      }),
      setupRetry: 3,
    });
    expect(auth.data.hassUrl).toBe(oauthSessionFixture.haBaseUrl);
    expect(refreshAccessToken).not.toHaveBeenCalled();
  });

  it('refreshes standalone proxy auth through the original OAuth session', async () => {
    window.__NAVET_CONFIG__ = {
      hassUrl: oauthSessionFixture.haBaseUrl,
      proxyBaseUrl: '/__navet_ha_proxy__',
    };
    resetRuntimeContextForTests();

    const auth = {
      data: {
        hassUrl: oauthSessionFixture.haBaseUrl,
        clientId: `${window.location.origin}/`,
        expires: Date.now() - 1,
        refresh_token: 'refresh-token',
        access_token: 'stale-token',
        expires_in: 3600,
      },
      refreshAccessToken: vi.fn(async () => {
        auth.data = {
          ...auth.data,
          access_token: 'fresh-token',
          expires: Date.now() + 3_600_000,
        };
      }),
      revoke: vi.fn(),
      get wsUrl() {
        return `ws${this.data.hassUrl.slice(4)}/api/websocket`;
      },
      get accessToken() {
        return this.data.access_token;
      },
      get expired() {
        return Date.now() > this.data.expires;
      },
    } as Auth;

    await createHomeAssistantClient({
      providerId: 'home_assistant',
      runtime: oauthSessionFixture.runtime,
      authMode: oauthSessionFixture.authMode,
      haBaseUrl: oauthSessionFixture.haBaseUrl,
      hassUrl: oauthSessionFixture.hassUrl,
      auth,
      expiresAt: auth.data.expires,
    });

    expect(auth.refreshAccessToken).toHaveBeenCalled();
    expect(auth.data.hassUrl).toBe(oauthSessionFixture.haBaseUrl);
    expect(createConnectionMock).toHaveBeenCalledWith({
      auth: expect.objectContaining({
        data: expect.objectContaining({
          hassUrl: `${window.location.origin}/__navet_ha_proxy__`,
          access_token: 'fresh-token',
        }),
      }),
      setupRetry: 3,
    });
  });

  it('keeps panel-auth sessions same-origin when no proxy session is needed', async () => {
    window.__NAVET_PANEL__ = true;
    resetRuntimeContextForTests();
    getAuthMock.mockResolvedValue({
      id: 'panel-auth',
    });

    await createHomeAssistantClient({
      providerId: 'home_assistant',
      runtime: panelSessionFixture.runtime,
      authMode: panelSessionFixture.authMode,
      haBaseUrl: panelSessionFixture.haBaseUrl,
      hassUrl: panelSessionFixture.hassUrl,
    });

    expect(getAuthMock).toHaveBeenCalledWith({ hassUrl: panelSessionFixture.haBaseUrl });
  });

  it('surfaces invalid Home Assistant auth errors instead of mutating them', async () => {
    const error = new Error('auth_invalid');
    getAuthMock.mockRejectedValueOnce(error);

    await expect(
      createHomeAssistantClient({
        providerId: 'home_assistant',
        runtime: panelSessionFixture.runtime,
        authMode: panelSessionFixture.authMode,
        haBaseUrl: panelSessionFixture.haBaseUrl,
        hassUrl: panelSessionFixture.hassUrl,
      })
    ).rejects.toThrow('auth_invalid');
  });
});
