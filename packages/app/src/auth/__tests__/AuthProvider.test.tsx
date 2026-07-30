import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuthSession } from '../AuthProvider';
import { AUTH_SESSION_REFRESHED_EVENT } from '../session-events';

const INVALID_HOME_ASSISTANT_AUTH_ERROR = 2;

const { integrationSessionRuntimeMock } = vi.hoisted(() => ({
  integrationSessionRuntimeMock: {
    getAuthRuntime: vi.fn(),
    getSnapshot: vi.fn(),
    getSession: vi.fn(),
    subscribe: vi.fn(),
    init: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    refresh: vi.fn(),
    invalidatePersistedSession: vi.fn(),
    replaceSession: vi.fn(),
    setActiveProvider: vi.fn(),
  },
}));

vi.mock('../integration-session-runtime', () => ({
  integrationSessionRuntime: integrationSessionRuntimeMock,
}));

vi.mock('../adapters/standaloneOAuthAuth', () => ({
  isInvalidStandaloneOAuthAuthError: (error: unknown) => error === 2,
}));

vi.mock('../session-errors', () => ({
  isDurableAuthSessionUnavailableError: (error: unknown) =>
    error instanceof Error && error.name === 'StandaloneOAuthSessionUnavailableError',
}));

function AuthState() {
  const { error, logout, ready, refresh, retryInitialization, session } = useAuthSession();
  const [refreshedProviderId, setRefreshedProviderId] = useState('none');
  return (
    <>
      <div data-testid="ready">{ready ? 'ready' : 'loading'}</div>
      <div data-testid="session">{session?.providerId ?? 'none'}</div>
      <div data-testid="refreshed-provider">{refreshedProviderId}</div>
      <div data-testid="error">{error ?? 'none'}</div>
      <button type="button" onClick={() => void logout().catch(() => undefined)}>
        Log out
      </button>
      <button
        type="button"
        onClick={() =>
          void refresh('home_assistant')
            .then((refreshedSession) => {
              setRefreshedProviderId(refreshedSession?.providerId ?? 'none');
            })
            .catch(() => undefined)
        }
      >
        Refresh Home Assistant
      </button>
      <button type="button" onClick={retryInitialization}>
        Retry initialization
      </button>
    </>
  );
}

function createStandaloneSession(expiresAt: number) {
  return {
    providerId: 'home_assistant' as const,
    runtime: 'standalone-oauth' as const,
    authMode: 'oauth' as const,
    haBaseUrl: 'https://ha.example.com',
    hassUrl: 'https://ha.example.com',
    expiresAt,
  };
}

function createSnapshot(session: ReturnType<typeof createStandaloneSession>) {
  return {
    providerId: 'home_assistant' as const,
    runtime: 'standalone' as const,
    authMode: 'oauth' as const,
    haBaseUrl: session.haBaseUrl,
    expiresAt: session.expiresAt,
    isAuthenticated: true,
    sessions: {
      home_assistant: session,
    },
    authenticatedProviderIds: ['home_assistant' as const],
  };
}

function createUnauthenticatedSnapshot() {
  return {
    providerId: 'home_assistant' as const,
    runtime: 'standalone' as const,
    authMode: 'oauth' as const,
    haBaseUrl: null,
    isAuthenticated: false,
    sessions: {},
    authenticatedProviderIds: [],
  };
}

function createHomeySession() {
  return {
    providerId: 'homey' as const,
    runtime: 'standalone-oauth' as const,
    authMode: 'oauth' as const,
    haBaseUrl: 'https://homey.example.com',
    hassUrl: 'https://homey.example.com',
    availableHomeys: [],
    selectedHomeyId: null,
    needsHomeySelection: true,
  };
}

function createHomeySnapshot(session: ReturnType<typeof createHomeySession>) {
  return {
    providerId: 'homey' as const,
    runtime: 'standalone' as const,
    authMode: 'oauth' as const,
    haBaseUrl: session.haBaseUrl,
    isAuthenticated: true,
    sessions: { homey: session },
    authenticatedProviderIds: ['homey' as const],
  };
}

function createMixedSnapshot(
  homeAssistantSession: ReturnType<typeof createStandaloneSession>,
  homeySession: ReturnType<typeof createHomeySession>
) {
  return {
    providerId: 'homey' as const,
    runtime: 'standalone' as const,
    authMode: 'oauth' as const,
    haBaseUrl: homeySession.haBaseUrl,
    isAuthenticated: true,
    sessions: {
      home_assistant: homeAssistantSession,
      homey: homeySession,
    },
    authenticatedProviderIds: ['home_assistant' as const, 'homey' as const],
  };
}

async function renderAuthProvider() {
  render(
    <AuthProvider>
      <AuthState />
    </AuthProvider>
  );
  await act(async () => {
    await Promise.resolve();
  });
  expect(screen.getByTestId('ready')).toHaveTextContent('ready');
}

describe('AuthProvider OAuth refresh durability', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-28T12:00:00.000Z'));
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
    });
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });

    const session = createStandaloneSession(Date.now() + 61_000);
    const snapshot = createSnapshot(session);
    integrationSessionRuntimeMock.getAuthRuntime.mockReturnValue('standalone-oauth');
    integrationSessionRuntimeMock.getSnapshot.mockReturnValue(snapshot);
    integrationSessionRuntimeMock.getSession.mockReturnValue(session);
    integrationSessionRuntimeMock.subscribe.mockReturnValue(() => undefined);
    integrationSessionRuntimeMock.init.mockResolvedValue(snapshot);
    integrationSessionRuntimeMock.login.mockReset();
    integrationSessionRuntimeMock.logout.mockReset();
    integrationSessionRuntimeMock.refresh.mockReset();
    integrationSessionRuntimeMock.invalidatePersistedSession.mockReset();
    integrationSessionRuntimeMock.invalidatePersistedSession.mockResolvedValue(undefined);
    integrationSessionRuntimeMock.replaceSession.mockReset();
    integrationSessionRuntimeMock.setActiveProvider.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('publishes a restored durable session when local storage is denied', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const removeItem = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new DOMException('Storage access denied', 'SecurityError');
    });

    try {
      await renderAuthProvider();
      expect(screen.getByTestId('session')).toHaveTextContent('home_assistant');
      expect(screen.getByTestId('error')).toHaveTextContent('none');
    } finally {
      removeItem.mockRestore();
      warning.mockRestore();
    }
  });

  it('keeps the live session and retries transient failures with capped backoff', async () => {
    integrationSessionRuntimeMock.refresh.mockRejectedValue(new Error('upstream unavailable'));
    await renderAuthProvider();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });
    expect(integrationSessionRuntimeMock.refresh).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('session')).toHaveTextContent('home_assistant');
    expect(screen.getByTestId('error')).toHaveTextContent('upstream unavailable');
    expect(integrationSessionRuntimeMock.invalidatePersistedSession).not.toHaveBeenCalled();

    for (const delay of [5_000, 15_000, 30_000, 60_000, 60_000]) {
      await act(async () => {
        await vi.advanceTimersByTimeAsync(delay - 1);
      });
      const callCountBeforeBoundary = integrationSessionRuntimeMock.refresh.mock.calls.length;
      await act(async () => {
        await vi.advanceTimersByTimeAsync(1);
      });
      expect(integrationSessionRuntimeMock.refresh).toHaveBeenCalledTimes(
        callCountBeforeBoundary + 1
      );
    }

    expect(screen.getByTestId('session')).toHaveTextContent('home_assistant');
    expect(integrationSessionRuntimeMock.invalidatePersistedSession).not.toHaveBeenCalled();
  });

  it('refreshes an expired retained Home Assistant session while Homey stays active', async () => {
    const homeAssistantSession = createStandaloneSession(Date.now() - 1);
    const homeySession = createHomeySession();
    const snapshot = createMixedSnapshot(homeAssistantSession, homeySession);
    integrationSessionRuntimeMock.getSnapshot.mockReturnValue(snapshot);
    integrationSessionRuntimeMock.getSession.mockReturnValue(homeySession);
    integrationSessionRuntimeMock.init.mockResolvedValue(snapshot);
    integrationSessionRuntimeMock.refresh.mockResolvedValue(snapshot);

    await renderAuthProvider();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(integrationSessionRuntimeMock.refresh).toHaveBeenCalledWith('home_assistant');
    expect(screen.getByTestId('session')).toHaveTextContent('homey');
  });

  it('refreshes immediately inside the early window and signals dependent services', async () => {
    const session = createStandaloneSession(Date.now() + 30_000);
    const snapshot = createSnapshot(session);
    const refreshed = createStandaloneSession(Date.now() + 3_600_000);
    const refreshedSnapshot = createSnapshot(refreshed);
    const listener = vi.fn();
    integrationSessionRuntimeMock.getSnapshot.mockReturnValue(snapshot);
    integrationSessionRuntimeMock.getSession
      .mockReturnValueOnce(session)
      .mockReturnValue(refreshed);
    integrationSessionRuntimeMock.init.mockResolvedValue(snapshot);
    integrationSessionRuntimeMock.refresh.mockResolvedValue(refreshedSnapshot);
    window.addEventListener(AUTH_SESSION_REFRESHED_EVENT, listener);

    try {
      await renderAuthProvider();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(integrationSessionRuntimeMock.refresh).toHaveBeenCalledWith('home_assistant');
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: { providerId: 'home_assistant' },
        })
      );
    } finally {
      window.removeEventListener(AUTH_SESSION_REFRESHED_EVENT, listener);
    }
  });

  it('keeps startup pending and retries when the browser session endpoint is unavailable', async () => {
    const session = createStandaloneSession(Date.now() + 3_600_000);
    const snapshot = createSnapshot(session);
    const unavailableError = new Error('authentication service unavailable');
    unavailableError.name = 'StandaloneOAuthSessionUnavailableError';
    integrationSessionRuntimeMock.init
      .mockRejectedValueOnce(unavailableError)
      .mockResolvedValueOnce(snapshot);

    render(
      <AuthProvider>
        <AuthState />
      </AuthProvider>
    );
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByTestId('ready')).toHaveTextContent('loading');
    expect(screen.getByTestId('session')).toHaveTextContent('none');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });

    expect(integrationSessionRuntimeMock.init).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('ready')).toHaveTextContent('ready');
    expect(screen.getByTestId('session')).toHaveTextContent('home_assistant');
    expect(screen.getByTestId('error')).toHaveTextContent('none');
  });

  it('allows an unavailable startup to be retried immediately', async () => {
    const session = createStandaloneSession(Date.now() + 3_600_000);
    const snapshot = createSnapshot(session);
    const unavailableError = new Error('authentication service unavailable');
    unavailableError.name = 'StandaloneOAuthSessionUnavailableError';
    integrationSessionRuntimeMock.init
      .mockRejectedValueOnce(unavailableError)
      .mockResolvedValueOnce(snapshot);

    render(
      <AuthProvider>
        <AuthState />
      </AuthProvider>
    );
    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Retry initialization' }));
    await act(async () => {
      await Promise.resolve();
    });

    expect(integrationSessionRuntimeMock.init).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('ready')).toHaveTextContent('ready');
    expect(screen.getByTestId('session')).toHaveTextContent('home_assistant');
  });

  it.each(['online', 'visibilitychange'] as const)(
    'retries a transient failure immediately on %s recovery',
    async (recoveryEvent) => {
      const initialSession = createStandaloneSession(Date.now() + 61_000);
      const refreshedSession = createStandaloneSession(Date.now() + 3_600_000);
      integrationSessionRuntimeMock.getSession
        .mockReturnValueOnce(initialSession)
        .mockReturnValue(refreshedSession);
      integrationSessionRuntimeMock.refresh
        .mockRejectedValueOnce(new Error('temporary network failure'))
        .mockResolvedValueOnce(createSnapshot(refreshedSession));

      await renderAuthProvider();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5_000);
      });
      expect(integrationSessionRuntimeMock.refresh).toHaveBeenCalledTimes(1);

      await act(async () => {
        if (recoveryEvent === 'online') {
          window.dispatchEvent(new Event(recoveryEvent));
        } else {
          document.dispatchEvent(new Event(recoveryEvent));
        }
        await Promise.resolve();
      });

      expect(integrationSessionRuntimeMock.refresh).toHaveBeenCalledTimes(2);
      expect(screen.getByTestId('session')).toHaveTextContent('home_assistant');
      expect(screen.getByTestId('error')).toHaveTextContent('none');
      expect(integrationSessionRuntimeMock.invalidatePersistedSession).not.toHaveBeenCalled();
    }
  );

  it('clears the live and durable session after confirmed invalid auth', async () => {
    integrationSessionRuntimeMock.refresh.mockRejectedValueOnce(INVALID_HOME_ASSISTANT_AUTH_ERROR);
    integrationSessionRuntimeMock.invalidatePersistedSession.mockImplementationOnce(async () => {
      integrationSessionRuntimeMock.getSnapshot.mockReturnValue(createUnauthenticatedSnapshot());
      integrationSessionRuntimeMock.getSession.mockReturnValue(null);
    });
    await renderAuthProvider();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });

    expect(integrationSessionRuntimeMock.invalidatePersistedSession).toHaveBeenCalledWith(
      'home_assistant'
    );
    expect(screen.getByTestId('session')).toHaveTextContent('none');
    expect(screen.getByTestId('error')).toHaveTextContent('Authentication expired');
  });

  it('falls back to another authenticated provider after invalid Home Assistant auth', async () => {
    const homeySession = createHomeySession();
    integrationSessionRuntimeMock.refresh.mockRejectedValueOnce(INVALID_HOME_ASSISTANT_AUTH_ERROR);
    integrationSessionRuntimeMock.invalidatePersistedSession.mockImplementationOnce(async () => {
      integrationSessionRuntimeMock.getSnapshot.mockReturnValue(createHomeySnapshot(homeySession));
      integrationSessionRuntimeMock.getSession.mockReturnValue(homeySession);
    });
    await renderAuthProvider();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });

    expect(screen.getByTestId('session')).toHaveTextContent('homey');
    expect(screen.getByTestId('error')).toHaveTextContent('none');
  });

  it('keeps the live session when durable invalidation is temporarily unavailable', async () => {
    integrationSessionRuntimeMock.refresh.mockRejectedValueOnce(INVALID_HOME_ASSISTANT_AUTH_ERROR);
    integrationSessionRuntimeMock.invalidatePersistedSession.mockRejectedValueOnce(
      new Error('session deletion failed')
    );
    await renderAuthProvider();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });

    expect(screen.getByTestId('session')).toHaveTextContent('home_assistant');
    expect(screen.getByTestId('error')).toHaveTextContent('session deletion failed');
  });

  it('keeps an explicit recovery refresh from invalidating a transiently unavailable session', async () => {
    integrationSessionRuntimeMock.refresh.mockRejectedValueOnce(
      new Error('temporary network failure')
    );
    await renderAuthProvider();

    fireEvent.click(screen.getByRole('button', { name: 'Refresh Home Assistant' }));
    await act(async () => {
      await Promise.resolve();
    });

    expect(integrationSessionRuntimeMock.refresh).toHaveBeenCalledWith('home_assistant');
    expect(integrationSessionRuntimeMock.invalidatePersistedSession).not.toHaveBeenCalled();
    expect(screen.getByTestId('session')).toHaveTextContent('home_assistant');
  });

  it('coalesces an explicit recovery with a scheduled refresh for the same session', async () => {
    const session = createStandaloneSession(Date.now() + 61_000);
    const snapshot = createSnapshot(session);
    let resolveRefresh: ((value: typeof snapshot) => void) | undefined;
    integrationSessionRuntimeMock.refresh.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRefresh = resolve;
      })
    );
    await renderAuthProvider();

    fireEvent.click(screen.getByRole('button', { name: 'Refresh Home Assistant' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });

    expect(integrationSessionRuntimeMock.refresh).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveRefresh?.(snapshot);
      await Promise.resolve();
    });
    expect(screen.getByTestId('session')).toHaveTextContent('home_assistant');
  });

  it('coalesces confirmed invalid auth through refresh and invalidation', async () => {
    let rejectRefresh: ((reason: unknown) => void) | undefined;
    integrationSessionRuntimeMock.refresh.mockReturnValueOnce(
      new Promise((_resolve, reject) => {
        rejectRefresh = reject;
      })
    );
    integrationSessionRuntimeMock.invalidatePersistedSession.mockImplementationOnce(async () => {
      integrationSessionRuntimeMock.getSnapshot.mockReturnValue(createUnauthenticatedSnapshot());
      integrationSessionRuntimeMock.getSession.mockReturnValue(null);
    });
    await renderAuthProvider();

    fireEvent.click(screen.getByRole('button', { name: 'Refresh Home Assistant' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
      rejectRefresh?.(INVALID_HOME_ASSISTANT_AUTH_ERROR);
      await Promise.resolve();
    });

    expect(integrationSessionRuntimeMock.refresh).toHaveBeenCalledTimes(1);
    expect(integrationSessionRuntimeMock.invalidatePersistedSession).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('session')).toHaveTextContent('none');
  });

  it('returns a refreshed retained Home Assistant session while Homey stays active', async () => {
    const homeAssistantSession = createStandaloneSession(Date.now() + 61_000);
    const refreshedHomeAssistantSession = createStandaloneSession(Date.now() + 3_600_000);
    const homeySession = createHomeySession();
    const initialSnapshot = createMixedSnapshot(homeAssistantSession, homeySession);
    const refreshedSnapshot = createMixedSnapshot(refreshedHomeAssistantSession, homeySession);
    integrationSessionRuntimeMock.getSnapshot.mockReturnValue(initialSnapshot);
    integrationSessionRuntimeMock.getSession.mockReturnValue(homeySession);
    integrationSessionRuntimeMock.init.mockResolvedValue(initialSnapshot);
    integrationSessionRuntimeMock.refresh.mockResolvedValueOnce(refreshedSnapshot);
    await renderAuthProvider();

    fireEvent.click(screen.getByRole('button', { name: 'Refresh Home Assistant' }));
    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByTestId('session')).toHaveTextContent('homey');
    expect(screen.getByTestId('refreshed-provider')).toHaveTextContent('home_assistant');
  });

  it('invalidates an explicit recovery refresh only after confirmed invalid auth', async () => {
    integrationSessionRuntimeMock.refresh.mockRejectedValueOnce(INVALID_HOME_ASSISTANT_AUTH_ERROR);
    integrationSessionRuntimeMock.invalidatePersistedSession.mockImplementationOnce(async () => {
      integrationSessionRuntimeMock.getSnapshot.mockReturnValue(createUnauthenticatedSnapshot());
      integrationSessionRuntimeMock.getSession.mockReturnValue(null);
    });
    await renderAuthProvider();

    fireEvent.click(screen.getByRole('button', { name: 'Refresh Home Assistant' }));
    await act(async () => {
      await Promise.resolve();
    });

    expect(integrationSessionRuntimeMock.invalidatePersistedSession).toHaveBeenCalledWith(
      'home_assistant'
    );
    expect(screen.getByTestId('session')).toHaveTextContent('none');
    expect(screen.getByTestId('error')).toHaveTextContent('Authentication expired');
  });

  it('keeps the live session visible until durable logout succeeds', async () => {
    let resolveLogout: (() => void) | undefined;
    integrationSessionRuntimeMock.logout.mockImplementationOnce(
      async () =>
        await new Promise<void>((resolve) => {
          resolveLogout = resolve;
        })
    );
    await renderAuthProvider();

    fireEvent.click(screen.getByRole('button', { name: 'Log out' }));
    expect(screen.getByTestId('session')).toHaveTextContent('home_assistant');

    integrationSessionRuntimeMock.getSnapshot.mockReturnValue(createUnauthenticatedSnapshot());
    integrationSessionRuntimeMock.getSession.mockReturnValue(null);
    await act(async () => {
      resolveLogout?.();
      await Promise.resolve();
    });

    expect(screen.getByTestId('session')).toHaveTextContent('none');
  });
});
