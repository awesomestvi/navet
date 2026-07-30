import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetRuntimeContextForTests } from '../runtime/runtime-detector';
import { authSessionManager } from './auth-session-manager';

const {
  standaloneInitMock,
  standaloneInvalidatePersistedSessionMock,
  standaloneLogoutMock,
  standaloneRefreshMock,
} = vi.hoisted(() => ({
  standaloneInitMock: vi.fn().mockResolvedValue(null),
  standaloneInvalidatePersistedSessionMock: vi.fn(),
  standaloneLogoutMock: vi.fn(),
  standaloneRefreshMock: vi.fn(),
}));

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
    init: standaloneInitMock,
    invalidatePersistedSession: standaloneInvalidatePersistedSessionMock,
    logout: standaloneLogoutMock,
    refresh: standaloneRefreshMock,
  },
}));

const {
  homeyInitMock,
  homeyLoginMock,
  homeyLogoutMock,
  openhabInitMock,
  openhabLoginMock,
  openhabLogoutMock,
} = vi.hoisted(() => ({
  homeyInitMock: vi.fn().mockResolvedValue(null),
  homeyLoginMock: vi.fn(),
  homeyLogoutMock: vi.fn(),
  openhabInitMock: vi.fn().mockResolvedValue(null),
  openhabLoginMock: vi.fn(),
  openhabLogoutMock: vi.fn(),
}));

vi.mock('@navet/app/auth/adapters/homeyOAuthAuth', () => ({
  homeyOAuthAuth: {
    providerId: 'homey',
    kind: 'standalone-oauth',
    init: homeyInitMock,
    login: homeyLoginMock,
    logout: homeyLogoutMock,
  },
}));

vi.mock('@navet/app/auth/adapters/openhabUrlSessionAuth', () => ({
  openhabUrlSessionAuth: {
    providerId: 'openhab',
    kind: 'standalone-oauth',
    init: openhabInitMock,
    login: openhabLoginMock,
    logout: openhabLogoutMock,
  },
}));

describe('authSessionManager snapshot', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    window.__NAVET_PANEL__ = undefined;
    resetRuntimeContextForTests();
    authSessionManager.replaceSession(null);
    standaloneInitMock.mockReset();
    standaloneInitMock.mockResolvedValue(null);
    standaloneLogoutMock.mockReset();
    standaloneRefreshMock.mockReset();
    homeyInitMock.mockReset();
    homeyLoginMock.mockReset();
    homeyLogoutMock.mockReset();
    openhabInitMock.mockReset();
    openhabLoginMock.mockReset();
    openhabLogoutMock.mockReset();
    homeyInitMock.mockResolvedValue(null);
    openhabInitMock.mockResolvedValue(null);
    standaloneInvalidatePersistedSessionMock.mockReset();
  });

  it('restores both Home Assistant and Homey sessions together', async () => {
    standaloneInitMock.mockResolvedValueOnce({
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

  it('publishes restored HttpOnly sessions when local storage operations are denied', async () => {
    standaloneInitMock.mockResolvedValueOnce({
      providerId: 'home_assistant',
      runtime: 'standalone-oauth',
      authMode: 'oauth',
      haBaseUrl: 'https://ha.example.com',
      hassUrl: 'https://ha.example.com',
    });
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('Storage access denied', 'SecurityError');
    });
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage access denied', 'SecurityError');
    });
    const removeItem = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new DOMException('Storage access denied', 'SecurityError');
    });
    const listener = vi.fn();
    const unsubscribe = authSessionManager.subscribe(listener);

    try {
      await expect(authSessionManager.init()).resolves.toMatchObject({
        isAuthenticated: true,
        authenticatedProviderIds: ['home_assistant'],
      });
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          isAuthenticated: true,
          authenticatedProviderIds: ['home_assistant'],
        }),
        expect.objectContaining({ providerId: 'home_assistant' })
      );
    } finally {
      unsubscribe();
      getItem.mockRestore();
      setItem.mockRestore();
      removeItem.mockRestore();
      warning.mockRestore();
    }
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

  it('keeps startup pending when an optional provider may own the only durable session', async () => {
    const failure = new Error('Homey session endpoint unavailable');
    homeyInitMock.mockRejectedValueOnce(failure);

    await expect(authSessionManager.init()).rejects.toBe(failure);
  });

  it('restores a temporarily unavailable secondary provider in the background', async () => {
    vi.useFakeTimers();
    try {
      standaloneInitMock.mockResolvedValueOnce({
        providerId: 'home_assistant',
        runtime: 'standalone-oauth',
        authMode: 'oauth',
        haBaseUrl: 'https://ha.example.com',
        hassUrl: 'https://ha.example.com',
      });
      homeyInitMock
        .mockRejectedValueOnce(new Error('Homey session endpoint unavailable'))
        .mockResolvedValueOnce({
          providerId: 'homey',
          runtime: 'standalone-oauth',
          authMode: 'oauth',
          haBaseUrl: 'https://homey.example.com',
          hassUrl: 'https://homey.example.com',
          availableHomeys: [],
          selectedHomeyId: null,
          needsHomeySelection: true,
        });

      await expect(authSessionManager.init()).resolves.toMatchObject({
        authenticatedProviderIds: ['home_assistant'],
      });

      await vi.advanceTimersByTimeAsync(5_000);

      expect(authSessionManager.getSnapshot()).toMatchObject({
        authenticatedProviderIds: ['home_assistant', 'homey'],
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not resurrect an in-flight provider restore after the session is reset', async () => {
    vi.useFakeTimers();
    try {
      standaloneInitMock.mockResolvedValueOnce({
        providerId: 'home_assistant',
        runtime: 'standalone-oauth',
        authMode: 'oauth',
        haBaseUrl: 'https://ha.example.com',
        hassUrl: 'https://ha.example.com',
      });
      let resolveHomeyRestore:
        | ((session: {
            providerId: 'homey';
            runtime: 'standalone-oauth';
            authMode: 'oauth';
            haBaseUrl: string;
            hassUrl: string;
            availableHomeys: never[];
            selectedHomeyId: null;
            needsHomeySelection: true;
          }) => void)
        | undefined;
      homeyInitMock
        .mockRejectedValueOnce(new Error('Homey session endpoint unavailable'))
        .mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              resolveHomeyRestore = resolve;
            })
        );

      await authSessionManager.init();
      vi.advanceTimersByTime(5_000);
      expect(resolveHomeyRestore).toBeDefined();

      authSessionManager.replaceSession(null);
      resolveHomeyRestore?.({
        providerId: 'homey',
        runtime: 'standalone-oauth',
        authMode: 'oauth',
        haBaseUrl: 'https://stale-homey.example.com',
        hassUrl: 'https://stale-homey.example.com',
        availableHomeys: [],
        selectedHomeyId: null,
        needsHomeySelection: true,
      });
      await Promise.resolve();
      await Promise.resolve();

      expect(authSessionManager.getSnapshot()).toMatchObject({
        isAuthenticated: false,
        sessions: {},
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not let an older provider restore replace a newer provider login', async () => {
    vi.useFakeTimers();
    try {
      standaloneInitMock.mockResolvedValueOnce({
        providerId: 'home_assistant',
        runtime: 'standalone-oauth',
        authMode: 'oauth',
        haBaseUrl: 'https://ha.example.com',
        hassUrl: 'https://ha.example.com',
      });
      let resolveHomeyRestore:
        | ((session: {
            providerId: 'homey';
            runtime: 'standalone-oauth';
            authMode: 'oauth';
            haBaseUrl: string;
            hassUrl: string;
            availableHomeys: never[];
            selectedHomeyId: null;
            needsHomeySelection: true;
          }) => void)
        | undefined;
      homeyInitMock
        .mockRejectedValueOnce(new Error('Homey session endpoint unavailable'))
        .mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              resolveHomeyRestore = resolve;
            })
        );
      homeyLoginMock.mockResolvedValueOnce({
        providerId: 'homey',
        runtime: 'standalone-oauth',
        authMode: 'oauth',
        haBaseUrl: 'https://new-homey.example.com',
        hassUrl: 'https://new-homey.example.com',
        availableHomeys: [],
        selectedHomeyId: null,
        needsHomeySelection: true,
      });

      await authSessionManager.init();
      vi.advanceTimersByTime(5_000);
      expect(resolveHomeyRestore).toBeDefined();
      await authSessionManager.login({ providerId: 'homey' });

      resolveHomeyRestore?.({
        providerId: 'homey',
        runtime: 'standalone-oauth',
        authMode: 'oauth',
        haBaseUrl: 'https://stale-homey.example.com',
        hassUrl: 'https://stale-homey.example.com',
        availableHomeys: [],
        selectedHomeyId: null,
        needsHomeySelection: true,
      });
      await Promise.resolve();
      await Promise.resolve();

      expect(authSessionManager.getSessions().homey?.haBaseUrl).toBe(
        'https://new-homey.example.com'
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not apply an initial restore that completes after a session reset', async () => {
    let resolveInitialRestore:
      | ((session: {
          providerId: 'home_assistant';
          runtime: 'standalone-oauth';
          authMode: 'oauth';
          haBaseUrl: string;
          hassUrl: string;
        }) => void)
      | undefined;
    standaloneInitMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveInitialRestore = resolve;
        })
    );

    const initPromise = authSessionManager.init();
    await Promise.resolve();
    authSessionManager.replaceSession(null);
    resolveInitialRestore?.({
      providerId: 'home_assistant',
      runtime: 'standalone-oauth',
      authMode: 'oauth',
      haBaseUrl: 'https://stale-ha.example.com',
      hassUrl: 'https://stale-ha.example.com',
    });
    await initPromise;

    expect(authSessionManager.getSnapshot()).toMatchObject({
      isAuthenticated: false,
      sessions: {},
    });
  });

  it('keeps startup pending when the primary Home Assistant session endpoint is unavailable', async () => {
    const failure = new Error('Home Assistant session endpoint unavailable');
    standaloneInitMock.mockRejectedValueOnce(failure);

    await expect(authSessionManager.init()).rejects.toBe(failure);
  });

  it('keeps startup pending when the previously active provider cannot be restored', async () => {
    authSessionManager.replaceSession({
      providerId: 'homey',
      runtime: 'standalone-oauth',
      authMode: 'oauth',
      haBaseUrl: 'https://homey.example.com',
      hassUrl: 'https://homey.example.com',
      availableHomeys: [],
      selectedHomeyId: undefined,
      needsHomeySelection: true,
    });
    const failure = new Error('Homey session endpoint unavailable');
    homeyInitMock.mockRejectedValueOnce(failure);

    await expect(authSessionManager.init()).rejects.toBe(failure);
    expect(authSessionManager.getSession()?.providerId).toBe('homey');
  });

  it('discards legacy plaintext openHAB credentials instead of restoring them', async () => {
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
      isAuthenticated: false,
      sessions: {},
    });
    expect(localStorage.getItem('navet_auth_session')).toBeNull();
  });

  it('only restores the Home Assistant panel session in panel mode', async () => {
    window.__NAVET_PANEL__ = true;
    resetRuntimeContextForTests();

    const haPanelAuthModule = await import('@navet/app/auth/adapters/haPanelAuth');
    vi.mocked(haPanelAuthModule.haPanelAuth.init).mockResolvedValueOnce({
      providerId: 'home_assistant',
      runtime: 'ha-panel',
      authMode: 'ha_frontend_session',
      haBaseUrl: window.location.origin,
      hassUrl: window.location.origin,
    });

    await expect(authSessionManager.init()).resolves.toMatchObject({
      providerId: 'home_assistant',
      runtime: 'ha_panel',
      authMode: 'ha_frontend_session',
      authenticatedProviderIds: ['home_assistant'],
    });
    expect(homeyInitMock).not.toHaveBeenCalled();
    expect(openhabInitMock).not.toHaveBeenCalled();
  });

  it('restores durable Homey and openHAB sessions in add-on ingress mode', async () => {
    const base = document.createElement('base');
    base.href = `${window.location.origin}/api/hassio_ingress/navet/`;
    document.head.append(base);
    resetRuntimeContextForTests();

    const haIngressAuthModule = await import('@navet/app/auth/adapters/haIngressAuth');
    vi.mocked(haIngressAuthModule.haIngressAuth.init).mockResolvedValueOnce({
      providerId: 'home_assistant',
      runtime: 'ha-ingress',
      authMode: 'ingress_session',
      haBaseUrl: window.location.origin,
      hassUrl: window.location.origin,
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
    openhabInitMock.mockResolvedValueOnce({
      providerId: 'openhab',
      runtime: 'standalone-oauth',
      authMode: 'oauth',
      haBaseUrl: 'http://openhab.local:8080',
      hassUrl: 'http://openhab.local:8080',
      proxyBaseUrl: '/__navet_openhab_proxy__',
    });

    await expect(authSessionManager.init()).resolves.toMatchObject({
      authenticatedProviderIds: ['home_assistant', 'homey', 'openhab'],
    });
    expect(homeyInitMock).toHaveBeenCalledTimes(1);
    expect(openhabInitMock).toHaveBeenCalledTimes(1);

    base.remove();
    resetRuntimeContextForTests();
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

  it('keeps the current active provider when another provider connects', async () => {
    authSessionManager.replaceSession({
      providerId: 'home_assistant',
      runtime: 'standalone-oauth',
      authMode: 'oauth',
      haBaseUrl: 'https://ha.example.com',
      hassUrl: 'https://ha.example.com',
    });

    homeyLoginMock.mockResolvedValueOnce({
      providerId: 'homey',
      runtime: 'standalone-oauth',
      authMode: 'oauth',
      haBaseUrl: 'https://homey.example.com',
      hassUrl: 'https://homey.example.com',
      availableHomeys: [{ id: 'homey-1', name: 'Living Room Homey' }],
      selectedHomeyId: 'homey-1',
      needsHomeySelection: false,
    });

    await expect(authSessionManager.login({ providerId: 'homey' })).resolves.toMatchObject({
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

  it('removes a confirmed-invalid persisted session after durable invalidation succeeds', async () => {
    authSessionManager.replaceSession({
      providerId: 'home_assistant',
      runtime: 'standalone-oauth',
      authMode: 'oauth',
      haBaseUrl: 'https://ha.example.com',
      hassUrl: 'https://ha.example.com',
    });

    await authSessionManager.invalidatePersistedSession();

    expect(standaloneInvalidatePersistedSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        providerId: 'home_assistant',
        runtime: 'standalone-oauth',
      })
    );
    expect(authSessionManager.getSnapshot()).toMatchObject({
      providerId: 'home_assistant',
      isAuthenticated: false,
    });
  });

  it('atomically retains a newer session when confirmed-invalid cleanup is superseded', async () => {
    const staleSession = {
      providerId: 'home_assistant' as const,
      runtime: 'standalone-oauth' as const,
      authMode: 'oauth' as const,
      haBaseUrl: 'https://ha.example.com',
      hassUrl: 'https://ha.example.com',
      credentialSessionId: `nas_${'a'.repeat(32)}`,
      credentialRevision: 0,
      expiresAt: 1,
    };
    const winnerSession = {
      ...staleSession,
      credentialRevision: 1,
      expiresAt: 2,
    };
    standaloneInvalidatePersistedSessionMock.mockResolvedValueOnce(winnerSession);
    authSessionManager.replaceSession(staleSession);

    await authSessionManager.invalidatePersistedSession('home_assistant');

    expect(authSessionManager.getSession()).toBe(winnerSession);
    expect(authSessionManager.getSnapshot()).toMatchObject({
      providerId: 'home_assistant',
      isAuthenticated: true,
      sessions: {
        home_assistant: {
          credentialRevision: 1,
          expiresAt: 2,
        },
      },
    });
  });

  it('falls back to another authenticated provider after invalidating Home Assistant', async () => {
    authSessionManager.replaceSession({
      providerId: 'homey',
      runtime: 'standalone-oauth',
      authMode: 'oauth',
      haBaseUrl: 'https://homey.example.com',
      hassUrl: 'https://homey.example.com',
      availableHomeys: [],
      selectedHomeyId: undefined,
      needsHomeySelection: true,
    });
    authSessionManager.replaceSession({
      providerId: 'home_assistant',
      runtime: 'standalone-oauth',
      authMode: 'oauth',
      haBaseUrl: 'https://ha.example.com',
      hassUrl: 'https://ha.example.com',
    });

    await authSessionManager.invalidatePersistedSession('home_assistant');

    expect(authSessionManager.getSnapshot()).toMatchObject({
      providerId: 'homey',
      isAuthenticated: true,
      authenticatedProviderIds: ['homey'],
    });
  });

  it('retains the live session when durable invalidation fails', async () => {
    standaloneInvalidatePersistedSessionMock.mockRejectedValueOnce(
      new Error('session service unavailable')
    );
    authSessionManager.replaceSession({
      providerId: 'home_assistant',
      runtime: 'standalone-oauth',
      authMode: 'oauth',
      haBaseUrl: 'https://ha.example.com',
      hassUrl: 'https://ha.example.com',
    });

    await expect(authSessionManager.invalidatePersistedSession('home_assistant')).rejects.toThrow(
      'session service unavailable'
    );
    expect(authSessionManager.getSession()?.providerId).toBe('home_assistant');
  });

  it('treats persisted-session invalidation as optional for runtimes without the hook', async () => {
    window.__NAVET_PANEL__ = true;
    resetRuntimeContextForTests();
    authSessionManager.replaceSession({
      providerId: 'home_assistant',
      runtime: 'ha-panel',
      authMode: 'ha_frontend_session',
      haBaseUrl: window.location.origin,
      hassUrl: window.location.origin,
    });

    await expect(authSessionManager.invalidatePersistedSession()).resolves.toBeUndefined();
    expect(authSessionManager.getSnapshot()).toMatchObject({
      providerId: 'home_assistant',
      isAuthenticated: true,
      runtime: 'ha_panel',
      authMode: 'ha_frontend_session',
    });
    window.__NAVET_PANEL__ = undefined;
    resetRuntimeContextForTests();
  });

  it('does not call the Home Assistant adapter when an absent provider is logged out', async () => {
    authSessionManager.replaceSession({
      providerId: 'home_assistant',
      runtime: 'standalone-oauth',
      authMode: 'oauth',
      haBaseUrl: 'https://ha.example.com',
      hassUrl: 'https://ha.example.com',
    });

    await authSessionManager.logout('homey');

    expect(standaloneLogoutMock).not.toHaveBeenCalled();
    expect(homeyLogoutMock).not.toHaveBeenCalled();
    expect(authSessionManager.getSession()?.providerId).toBe('home_assistant');
  });

  it('retains the live session until provider logout succeeds', async () => {
    standaloneLogoutMock.mockRejectedValueOnce(new Error('session deletion failed'));
    authSessionManager.replaceSession({
      providerId: 'home_assistant',
      runtime: 'standalone-oauth',
      authMode: 'oauth',
      haBaseUrl: 'https://ha.example.com',
      hassUrl: 'https://ha.example.com',
    });

    await expect(authSessionManager.logout()).rejects.toThrow('session deletion failed');
    expect(authSessionManager.getSession()?.providerId).toBe('home_assistant');
  });

  it('does not let an older logout delete a replacement session', async () => {
    const previousSession = {
      providerId: 'home_assistant' as const,
      runtime: 'standalone-oauth' as const,
      authMode: 'oauth' as const,
      haBaseUrl: 'https://previous-ha.example.com',
      hassUrl: 'https://previous-ha.example.com',
    };
    const replacementSession = {
      ...previousSession,
      haBaseUrl: 'https://replacement-ha.example.com',
      hassUrl: 'https://replacement-ha.example.com',
    };
    let resolveLogout: (() => void) | undefined;
    standaloneLogoutMock.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveLogout = resolve;
        })
    );
    authSessionManager.replaceSession(previousSession);

    const logoutPromise = authSessionManager.logout('home_assistant');
    await Promise.resolve();
    authSessionManager.replaceSession(replacementSession);
    resolveLogout?.();
    await logoutPromise;

    expect(authSessionManager.getSession()).toBe(replacementSession);
  });

  it('does not restore a session when an older refresh finishes after logout', async () => {
    const session = {
      providerId: 'home_assistant' as const,
      runtime: 'standalone-oauth' as const,
      authMode: 'oauth' as const,
      haBaseUrl: 'https://ha.example.com',
      hassUrl: 'https://ha.example.com',
      expiresAt: 1,
    };
    let resolveRefresh: ((nextSession: typeof session) => void) | undefined;
    standaloneRefreshMock.mockImplementationOnce(
      async () =>
        await new Promise<typeof session>((resolve) => {
          resolveRefresh = resolve;
        })
    );
    authSessionManager.replaceSession(session);

    const refreshPromise = authSessionManager.refresh('home_assistant');
    await Promise.resolve();
    await authSessionManager.logout('home_assistant');
    resolveRefresh?.({ ...session, expiresAt: 2 });
    await refreshPromise;

    expect(authSessionManager.getSnapshot()).toMatchObject({
      isAuthenticated: false,
      sessions: {},
    });
  });

  it('lets an in-flight logout invalidate a refresh that completes before deletion', async () => {
    const session = {
      providerId: 'home_assistant' as const,
      runtime: 'standalone-oauth' as const,
      authMode: 'oauth' as const,
      haBaseUrl: 'https://ha.example.com',
      hassUrl: 'https://ha.example.com',
      expiresAt: 1,
    };
    let resolveRefresh: ((nextSession: typeof session) => void) | undefined;
    let resolveLogout: (() => void) | undefined;
    standaloneRefreshMock.mockImplementationOnce(
      async () =>
        await new Promise<typeof session>((resolve) => {
          resolveRefresh = resolve;
        })
    );
    standaloneLogoutMock.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveLogout = resolve;
        })
    );
    authSessionManager.replaceSession(session);

    const refreshPromise = authSessionManager.refresh('home_assistant');
    await Promise.resolve();
    const logoutPromise = authSessionManager.logout('home_assistant');
    await Promise.resolve();
    resolveRefresh?.({ ...session, expiresAt: 2 });
    await refreshPromise;
    resolveLogout?.();
    await logoutPromise;

    expect(authSessionManager.getSnapshot()).toMatchObject({
      isAuthenticated: false,
      sessions: {},
    });
  });
});
