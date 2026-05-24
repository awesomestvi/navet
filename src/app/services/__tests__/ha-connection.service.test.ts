import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  connectionListeners,
  createHomeAssistantClientMock,
  getUserMock,
  subscribeConfigMock,
  subscribeEntitiesMock,
} = vi.hoisted(() => ({
  connectionListeners: new Map<string, (connection: unknown, error?: unknown) => void>(),
  createHomeAssistantClientMock: vi.fn(),
  getUserMock: vi.fn(async () => ({ name: 'Test User' })),
  subscribeConfigMock: vi.fn(),
  subscribeEntitiesMock: vi.fn(),
}));

vi.mock('@/api/homeAssistantClient', () => ({
  createHomeAssistantClient: createHomeAssistantClientMock,
}));

vi.mock('home-assistant-js-websocket', () => ({
  callService: vi.fn(),
  ERR_CANNOT_CONNECT: 1,
  ERR_INVALID_AUTH: 2,
  ERR_CONNECTION_LOST: 3,
  ERR_HASS_HOST_REQUIRED: 4,
  ERR_INVALID_HTTPS_TO_HTTP: 5,
  getUser: getUserMock,
  subscribeConfig: subscribeConfigMock,
  subscribeEntities: subscribeEntitiesMock,
}));

import HAConnectionService from '../ha-connection.service';

describe('HAConnectionService', () => {
  beforeEach(() => {
    vi.useRealTimers();
    connectionListeners.clear();
    createHomeAssistantClientMock.mockReset();
    getUserMock.mockClear();
    subscribeConfigMock.mockClear();
    subscribeEntitiesMock.mockClear();
  });

  it('uses the shared Home Assistant client', async () => {
    const connection = createConnection();
    createHomeAssistantClientMock.mockResolvedValueOnce({ connection });

    const service = new HAConnectionService();
    const session = {
      runtime: 'standalone-oauth' as const,
      hassUrl: 'https://ha.example.com',
    };

    await service.authenticate(session);

    expect(createHomeAssistantClientMock).toHaveBeenCalledWith(session);
    expect(service.getConnection()).toBe(connection);
  });

  it('does not schedule another authentication attempt after invalid auth', async () => {
    vi.useFakeTimers();
    createHomeAssistantClientMock.mockRejectedValueOnce(2);

    const service = new HAConnectionService();

    await expect(
      service.authenticate({
        runtime: 'standalone-oauth',
        hassUrl: 'https://ha.example.com',
      })
    ).rejects.toThrow(
      'Invalid Home Assistant authentication. Sign in again to refresh the session.'
    );

    await vi.advanceTimersByTimeAsync(60_000);

    expect(createHomeAssistantClientMock).toHaveBeenCalledTimes(1);
  });

  it('surfaces reconnect invalid auth without starting a second authenticate loop', async () => {
    vi.useFakeTimers();
    createHomeAssistantClientMock.mockResolvedValueOnce({ connection: createConnection() });

    const service = new HAConnectionService();
    const errors: string[] = [];
    service.addListener('error', ({ message }) => errors.push(message));

    await service.authenticate({
      runtime: 'standalone-oauth',
      hassUrl: 'https://ha.example.com',
    });

    connectionListeners.get('reconnect-error')?.({}, 2);
    await vi.advanceTimersByTimeAsync(60_000);

    expect(errors).toEqual([
      'Invalid Home Assistant authentication. Sign in again to refresh the session.',
    ]);
    expect(createHomeAssistantClientMock).toHaveBeenCalledTimes(1);
  });

  it('allows a new authentication attempt to replace a pending websocket attempt', async () => {
    const firstConnection = createConnection();
    const secondConnection = createConnection();
    const firstAttempt = deferred<{ connection: typeof firstConnection }>();
    const secondAttempt = deferred<{ connection: typeof secondConnection }>();
    createHomeAssistantClientMock
      .mockReturnValueOnce(firstAttempt.promise)
      .mockReturnValueOnce(secondAttempt.promise);

    const service = new HAConnectionService();

    const firstAuthenticate = service.authenticate({
      runtime: 'standalone-oauth',
      hassUrl: 'https://old-ha.example.com',
    });
    const secondAuthenticate = service.authenticate({
      runtime: 'standalone-oauth',
      hassUrl: 'https://new-ha.example.com',
    });

    expect(createHomeAssistantClientMock).toHaveBeenCalledTimes(2);

    secondAttempt.resolve({ connection: secondConnection });
    await secondAuthenticate;

    firstAttempt.resolve({ connection: firstConnection });
    await firstAuthenticate;

    expect(service.getConnection()).toBe(secondConnection);
    expect(firstConnection.close).toHaveBeenCalled();
    expect(secondConnection.close).not.toHaveBeenCalled();
  });
});

function createConnection() {
  return {
    addEventListener: (event: string, listener: (connection: unknown, error?: unknown) => void) => {
      connectionListeners.set(event, listener);
    },
    close: vi.fn(),
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, resolve, reject };
}
