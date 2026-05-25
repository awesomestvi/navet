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
  });

  it('does not start OAuth for an auth-less add-on ingress session', async () => {
    window.history.replaceState({}, '', '/api/hassio_ingress/navet/');

    await createHomeAssistantClient({
      runtime: 'ha-ingress',
      hassUrl: window.location.origin,
    });

    expect(getAuthMock).not.toHaveBeenCalled();
    expect(createConnectionMock).toHaveBeenCalledWith({
      auth: expect.objectContaining({
        data: expect.objectContaining({
          hassUrl: `${window.location.origin}/api/hassio_ingress/navet/__navet_ha_proxy__`,
          clientId: null,
        }),
      }),
      setupRetry: 3,
    });
  });

  it('keeps standalone OAuth persistence pointed at Home Assistant while proxying the connection', async () => {
    window.__NAVET_CONFIG__ = {
      hassUrl: 'http://homeassistant.local:8123',
      proxyBaseUrl: '/__navet_ha_proxy__',
    };

    const refreshAccessToken = vi.fn();
    const revoke = vi.fn();
    const auth = {
      data: {
        hassUrl: 'http://homeassistant.local:8123',
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
      runtime: 'standalone-oauth',
      hassUrl: 'http://homeassistant.local:8123',
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
    expect(auth.data.hassUrl).toBe('http://homeassistant.local:8123');
    expect(refreshAccessToken).not.toHaveBeenCalled();
  });

  it('refreshes standalone proxy auth through the original OAuth session', async () => {
    window.__NAVET_CONFIG__ = {
      hassUrl: 'http://homeassistant.local:8123',
      proxyBaseUrl: '/__navet_ha_proxy__',
    };

    const auth = {
      data: {
        hassUrl: 'http://homeassistant.local:8123',
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
      runtime: 'standalone-oauth',
      hassUrl: 'http://homeassistant.local:8123',
      auth,
      expiresAt: auth.data.expires,
    });

    expect(auth.refreshAccessToken).toHaveBeenCalled();
    expect(auth.data.hassUrl).toBe('http://homeassistant.local:8123');
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
});
