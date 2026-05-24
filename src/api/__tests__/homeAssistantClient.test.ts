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
});
