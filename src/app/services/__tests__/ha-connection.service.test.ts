import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  connectionListeners,
  createConnectionMock,
  createLongLivedTokenAuthMock,
  getUserMock,
  subscribeConfigMock,
  subscribeEntitiesMock,
} = vi.hoisted(() => ({
  connectionListeners: new Map<string, (connection: unknown, error?: unknown) => void>(),
  createConnectionMock: vi.fn(),
  createLongLivedTokenAuthMock: vi.fn((hassUrl: string, token: string) => ({
    hassUrl,
    token,
  })),
  getUserMock: vi.fn(async () => ({ name: 'Test User' })),
  subscribeConfigMock: vi.fn(),
  subscribeEntitiesMock: vi.fn(),
}));

vi.mock('home-assistant-js-websocket', () => ({
  callService: vi.fn(),
  createConnection: createConnectionMock,
  createLongLivedTokenAuth: createLongLivedTokenAuthMock,
  ERR_CANNOT_CONNECT: 1,
  ERR_INVALID_AUTH: 2,
  ERR_CONNECTION_LOST: 3,
  ERR_HASS_HOST_REQUIRED: 4,
  ERR_INVALID_HTTPS_TO_HTTP: 5,
  getAuth: vi.fn(),
  getUser: getUserMock,
  subscribeConfig: subscribeConfigMock,
  subscribeEntities: subscribeEntitiesMock,
}));

import HAConnectionService from '../ha-connection.service';

describe('HAConnectionService', () => {
  beforeEach(() => {
    vi.useRealTimers();
    connectionListeners.clear();
    createConnectionMock.mockReset();
    createLongLivedTokenAuthMock.mockClear();
    getUserMock.mockClear();
    subscribeConfigMock.mockClear();
    subscribeEntitiesMock.mockClear();
  });

  it('configures a bounded websocket setup retry', async () => {
    createConnectionMock.mockResolvedValueOnce({
      addEventListener: (event: string, listener: (connection: unknown) => void) => {
        connectionListeners.set(event, listener);
      },
      close: vi.fn(),
    });

    const service = new HAConnectionService();

    await service.authenticate({
      hassUrl: 'https://ha.example.com',
      token: 'token',
    });

    expect(createConnectionMock).toHaveBeenCalledWith({
      auth: {
        hassUrl: 'https://ha.example.com',
        token: 'token',
      },
      setupRetry: 3,
    });
  });

  it('does not schedule another authentication attempt after invalid auth', async () => {
    vi.useFakeTimers();
    createConnectionMock.mockRejectedValueOnce(2);

    const service = new HAConnectionService();

    await expect(
      service.authenticate({
        hassUrl: 'https://ha.example.com',
        token: 'bad-token',
      })
    ).rejects.toThrow('Invalid authentication token. Please check your long-lived access token.');

    await vi.advanceTimersByTimeAsync(60_000);

    expect(createConnectionMock).toHaveBeenCalledTimes(1);
  });

  it('surfaces reconnect invalid auth without starting a second authenticate loop', async () => {
    vi.useFakeTimers();
    createConnectionMock.mockResolvedValueOnce({
      addEventListener: (
        event: string,
        listener: (connection: unknown, error?: unknown) => void
      ) => {
        connectionListeners.set(event, listener);
      },
      close: vi.fn(),
    });

    const service = new HAConnectionService();
    const errors: string[] = [];
    service.addListener('error', ({ message }) => errors.push(message));

    await service.authenticate({
      hassUrl: 'https://ha.example.com',
      token: 'token',
    });

    connectionListeners.get('reconnect-error')?.({}, 2);
    await vi.advanceTimersByTimeAsync(60_000);

    expect(errors).toEqual([
      'Invalid authentication token. Please check your long-lived access token.',
    ]);
    expect(createConnectionMock).toHaveBeenCalledTimes(1);
  });

  it('allows a new authentication attempt to replace a pending websocket attempt', async () => {
    const firstConnection = {
      addEventListener: vi.fn(),
      close: vi.fn(),
    };
    const secondConnection = {
      addEventListener: vi.fn(),
      close: vi.fn(),
    };
    const firstAttempt = deferred<typeof firstConnection>();
    const secondAttempt = deferred<typeof secondConnection>();
    createConnectionMock
      .mockReturnValueOnce(firstAttempt.promise)
      .mockReturnValueOnce(secondAttempt.promise);

    const service = new HAConnectionService();

    const firstAuthenticate = service.authenticate({
      hassUrl: 'https://old-ha.example.com',
      token: 'old-token',
    });
    const secondAuthenticate = service.authenticate({
      hassUrl: 'https://new-ha.example.com',
      token: 'new-token',
    });

    expect(createConnectionMock).toHaveBeenCalledTimes(2);

    secondAttempt.resolve(secondConnection);
    await secondAuthenticate;

    firstAttempt.resolve(firstConnection);
    await firstAuthenticate;

    expect(service.getConnection()).toBe(secondConnection);
    expect(firstConnection.close).toHaveBeenCalled();
    expect(secondConnection.close).not.toHaveBeenCalled();
  });
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, resolve, reject };
}
