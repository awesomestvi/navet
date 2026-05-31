import { describe, expect, it, vi } from 'vitest';
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

const { homeyInitMock } = vi.hoisted(() => ({
  homeyInitMock: vi.fn().mockResolvedValue(null),
}));

vi.mock('@navet/app/auth/adapters/homeyOAuthAuth', () => ({
  homeyOAuthAuth: {
    providerId: 'homey',
    kind: 'standalone-oauth',
    init: homeyInitMock,
  },
}));

describe('authSessionManager snapshot', () => {
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
});
