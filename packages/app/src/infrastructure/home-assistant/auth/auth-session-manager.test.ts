import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authSessionManager } from './auth-session-manager';

vi.mock('@navet/app/auth/adapters/haPanelAuth', () => ({
  haPanelAuth: {
    providerId: 'home_assistant',
    kind: 'ha-panel',
    init: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('@navet/app/auth/adapters/haIngressAuth', () => ({
  haIngressAuth: {
    providerId: 'home_assistant',
    kind: 'ha-ingress',
    init: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('@navet/app/auth/adapters/standaloneOAuthAuth', () => ({
  standaloneOAuthAuth: {
    providerId: 'home_assistant',
    kind: 'standalone-oauth',
    init: vi.fn().mockResolvedValue(null),
  },
}));

const { homeyInitMock, openhabInitMock } = vi.hoisted(() => ({
  homeyInitMock: vi.fn().mockResolvedValue(null),
  openhabInitMock: vi.fn().mockResolvedValue(null),
}));

vi.mock('@navet/app/auth/adapters/homeyOAuthAuth', () => ({
  homeyOAuthAuth: {
    providerId: 'homey',
    kind: 'standalone-oauth',
    init: homeyInitMock,
  },
}));

vi.mock('@navet/app/auth/adapters/openhabUrlSessionAuth', () => ({
  openhabUrlSessionAuth: {
    providerId: 'openhab',
    kind: 'standalone-oauth',
    init: openhabInitMock,
  },
}));

describe('authSessionManager snapshot', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    authSessionManager.replaceSession(null);
    homeyInitMock.mockReset();
    openhabInitMock.mockReset();
    homeyInitMock.mockResolvedValue(null);
    openhabInitMock.mockResolvedValue(null);
  });

  it('restores both Home Assistant and Homey sessions together', async () => {
    const standaloneOAuthAuthModule = await import('@navet/app/auth/adapters/standaloneOAuthAuth');
    vi.mocked(standaloneOAuthAuthModule.standaloneOAuthAuth.init).mockResolvedValueOnce({
      providerId: 'home_assistant',
      runtime: 'standalone-oauth',
      authMode: 'oauth',
      haBaseUrl: 'https://ha.example.com',
      hassUrl: 'https://ha.example.com',
    });
    homeyInitMock.mockResolvedValueOnce({
      providerId: 'homey',
      runtime: 'standalone-oauth',
      authMode: 'oauth',
      haBaseUrl: 'https://homey.example.com',
      hassUrl: 'https://homey.example.com',
      availableHomeys: [{ id: 'homey-1', name: 'Living Room Homey' }],
      selectedHomeyId: 'homey-1',
      needsHomeySelection: false,
    });

    await expect(authSessionManager.init()).resolves.toMatchObject({
      providerId: 'home_assistant',
      authenticatedProviderIds: ['home_assistant', 'homey'],
      sessions: {
        home_assistant: expect.objectContaining({
          hassUrl: 'https://ha.example.com',
        }),
        homey: expect.objectContaining({
          hassUrl: 'https://homey.example.com',
        }),
      },
    });
  });

  it('includes provider metadata for unauthenticated snapshots', () => {
    authSessionManager.replaceSession(null);

    expect(authSessionManager.getSnapshot()).toMatchObject({
      providerId: 'home_assistant',
      isAuthenticated: false,
      authenticatedProviderIds: [],
    });
  });

  it('preserves provider metadata for authenticated sessions', () => {
    authSessionManager.replaceSession({
      providerId: 'home_assistant',
      runtime: 'standalone-oauth',
      authMode: 'oauth',
      haBaseUrl: 'https://ha.example.com',
      hassUrl: 'https://ha.example.com',
      userId: 'user-1',
    });

    expect(authSessionManager.getSnapshot()).toMatchObject({
      providerId: 'home_assistant',
      haBaseUrl: 'https://ha.example.com',
      userId: 'user-1',
      isAuthenticated: true,
    });
  });

  it('restores stored non-Home-Assistant sessions before falling back to HA auth adapters', async () => {
    homeyInitMock.mockResolvedValueOnce({
      providerId: 'homey',
      runtime: 'standalone-oauth',
      authMode: 'oauth',
      haBaseUrl: 'https://homey.example.com',
      hassUrl: 'https://homey.example.com',
      availableHomeys: [{ id: 'homey-1', name: 'Living Room Homey' }],
      selectedHomeyId: 'homey-1',
      needsHomeySelection: false,
    });

    await expect(authSessionManager.init()).resolves.toMatchObject({
      providerId: 'homey',
      isAuthenticated: true,
      haBaseUrl: 'https://homey.example.com',
    });
  });

  it('restores stored openHAB sessions only when credentials are present', async () => {
    localStorage.setItem(
      'navet_auth_session',
      JSON.stringify({
        providerId: 'openhab',
        runtime: 'standalone-oauth',
        authMode: 'oauth',
        haBaseUrl: 'http://openhab.local:8080',
        hassUrl: 'http://openhab.local:8080',
        username: 'navet',
        password: 'secret',
      })
    );

    await expect(authSessionManager.init()).resolves.toMatchObject({
      providerId: 'openhab',
      isAuthenticated: true,
      sessions: {
        openhab: expect.objectContaining({
          hassUrl: 'http://openhab.local:8080',
          username: 'navet',
        }),
      },
    });
    expect(localStorage.getItem('navet_auth_session')).toBeNull();
  });

  it('does not write openHAB credentials back to localStorage after session updates', () => {
    authSessionManager.replaceSession({
      providerId: 'openhab',
      runtime: 'standalone-oauth',
      authMode: 'oauth',
      haBaseUrl: 'http://openhab.local:8080',
      hassUrl: 'http://openhab.local:8080',
      username: 'navet',
      password: 'secret',
      proxyBaseUrl: '/__navet_openhab_proxy__',
    });

    expect(localStorage.getItem('navet_auth_session')).toBeNull();
  });
});
