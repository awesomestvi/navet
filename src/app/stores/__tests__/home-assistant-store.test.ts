import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetAppStores } from '@/test/store-reset';

type StubEntityListener = (payload: Record<string, unknown> | null) => void;
type StubConfigListener = StubEntityListener;
type StubRegistriesListener = (payload: unknown) => void;
type StubConnectionListener = (payload: unknown) => void;
type StubListenerMap = {
  entities: Set<StubEntityListener>;
  config: Set<StubConfigListener>;
  registries: Set<StubRegistriesListener>;
  connection: Set<StubConnectionListener>;
  error: Set<(payload: { message: string }) => void>;
};
type StubHomeAssistantService = {
  listeners: StubListenerMap;
  connected: boolean;
  config: Record<string, unknown> | null;
  entities: Record<string, unknown> | null;
  user: unknown;
  connection: unknown;
  areas: Array<{ area_id: string; name: string }>;
  deviceRegistry: Array<{ id: string; area_id?: string | null }>;
  entityRegistry: Array<{ entity_id: string; area_id?: string | null }>;
};

const { homeAssistantServiceStub } = vi.hoisted(() => ({
  homeAssistantServiceStub: {
    listeners: {
      entities: new Set<(payload: Record<string, unknown> | null) => void>(),
      config: new Set<(payload: Record<string, unknown> | null) => void>(),
      registries: new Set<
        (payload: {
          areas: Array<{ area_id: string; name: string }>;
          devices: Array<{ id: string; area_id?: string | null }>;
          entities: Array<{ entity_id: string; area_id?: string | null }>;
        }) => void
      >(),
      connection: new Set<
        (payload: { connected: boolean; connection: unknown; reconnecting: boolean }) => void
      >(),
      error: new Set<(payload: { message: string }) => void>(),
    },
    connected: false,
    config: null as Record<string, unknown> | null,
    entities: null as Record<string, unknown> | null,
    user: null as unknown,
    connection: null as unknown,
    areas: [] as Array<{ area_id: string; name: string }>,
    deviceRegistry: [] as Array<{ id: string; area_id?: string | null }>,
    entityRegistry: [] as Array<{ entity_id: string; area_id?: string | null }>,
    addListener: vi.fn(function (
      this: StubHomeAssistantService,
      type: keyof StubListenerMap,
      listener:
        | StubEntityListener
        | StubConfigListener
        | StubRegistriesListener
        | StubConnectionListener
    ) {
      const listeners = this.listeners[type] as Set<typeof listener>;
      listeners.add(listener);
      return () => listeners.delete(listener);
    }),
    authenticate: vi.fn(async function (this: StubHomeAssistantService) {
      this.connected = true;
    }),
    disconnect: vi.fn(function (this: StubHomeAssistantService) {
      this.connected = false;
      this.connection = null;
    }),
    isConnected: vi.fn(function (this: StubHomeAssistantService) {
      return this.connected;
    }),
    getConfig: vi.fn(function (this: StubHomeAssistantService) {
      return this.config;
    }),
    getEntities: vi.fn(function (this: StubHomeAssistantService) {
      return this.entities;
    }),
    getUser: vi.fn(function (this: StubHomeAssistantService) {
      return this.user;
    }),
    getAreas: vi.fn(function (this: StubHomeAssistantService) {
      return this.areas;
    }),
    getDeviceRegistry: vi.fn(function (this: StubHomeAssistantService) {
      return this.deviceRegistry;
    }),
    getEntityRegistry: vi.fn(function (this: StubHomeAssistantService) {
      return this.entityRegistry;
    }),
    getConnection: vi.fn(function (this: StubHomeAssistantService) {
      return this.connection;
    }),
  },
}));

vi.mock('@/app/services/home-assistant.service', () => ({
  homeAssistantService: homeAssistantServiceStub,
}));

import { useErrorStore } from '../error-store';
import { homeAssistantStore } from '../home-assistant-store';

describe('homeAssistantStore', () => {
  beforeEach(async () => {
    vi.useRealTimers();
    await resetAppStores();
    homeAssistantServiceStub.connected = false;
    homeAssistantServiceStub.config = null;
    homeAssistantServiceStub.entities = null;
    homeAssistantServiceStub.user = { name: 'Test User' };
    homeAssistantServiceStub.connection = { id: 'conn-1' };
    homeAssistantServiceStub.areas = [{ area_id: 'kitchen', name: 'Kitchen' }];
    homeAssistantServiceStub.deviceRegistry = [{ id: 'device-1', area_id: 'kitchen' }];
    homeAssistantServiceStub.entityRegistry = [{ entity_id: 'light.kitchen', area_id: 'kitchen' }];
    Object.values(homeAssistantServiceStub.listeners).forEach((listeners) => {
      listeners.clear();
    });
    homeAssistantServiceStub.addListener.mockClear();
    homeAssistantServiceStub.authenticate.mockClear();
    homeAssistantServiceStub.disconnect.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('registers typed listeners and hydrates state after connect', async () => {
    homeAssistantServiceStub.connected = true;
    homeAssistantServiceStub.config = { location_name: 'Home' };
    homeAssistantServiceStub.entities = {
      'light.kitchen': { entity_id: 'light.kitchen', state: 'on', attributes: {} },
    };

    await homeAssistantStore.getState().connect({
      hassUrl: 'https://ha.example.com',
      token: 'abc',
    });

    expect(homeAssistantServiceStub.addListener).toHaveBeenCalledTimes(5);
    expect(homeAssistantStore.getState().connected).toBe(true);
    expect(homeAssistantStore.getState().areas).toHaveLength(1);
    expect(homeAssistantStore.getState().entities?.['light.kitchen']?.state).toBe('on');
  });

  it('debounces entity updates from the service', async () => {
    vi.useFakeTimers();
    await homeAssistantStore.getState().connect({
      hassUrl: 'https://ha.example.com',
      token: 'abc',
    });

    homeAssistantServiceStub.entities = {
      'light.kitchen': { entity_id: 'light.kitchen', state: 'on', attributes: {} },
    };
    homeAssistantServiceStub.listeners.entities.forEach((listener) => {
      listener({
        'light.kitchen': { entity_id: 'light.kitchen', state: 'on', attributes: {} },
      });
    });

    expect(homeAssistantStore.getState().entities).toBeNull();

    vi.advanceTimersByTime(50);

    expect(homeAssistantStore.getState().entities?.['light.kitchen']?.state).toBe('on');
  });

  it('disconnects and resets the store', async () => {
    await homeAssistantStore.getState().connect({
      hassUrl: 'https://ha.example.com',
      token: 'abc',
    });

    homeAssistantStore.getState().disconnect();

    expect(homeAssistantServiceStub.disconnect).toHaveBeenCalled();
    expect(homeAssistantStore.getState().connected).toBe(false);
    expect(homeAssistantStore.getState().entities).toBeNull();
  });

  it('propagates connection errors into the HA store and global error store', async () => {
    homeAssistantServiceStub.authenticate.mockRejectedValueOnce(new Error('bad token'));

    await expect(
      homeAssistantStore.getState().connect({
        hassUrl: 'https://ha.example.com',
        token: 'abc',
      })
    ).rejects.toThrow('bad token');

    expect(homeAssistantStore.getState().error).toBe('bad token');
    expect(useErrorStore.getState().error?.message).toBe('bad token');
  });

  it('times out a stalled connection attempt and surfaces recovery state', async () => {
    vi.useFakeTimers();
    homeAssistantServiceStub.authenticate.mockImplementationOnce(() => new Promise(() => {}));

    void homeAssistantStore.getState().connect({
      hassUrl: 'https://stale-ha.example.com',
      token: 'abc',
    });

    expect(homeAssistantStore.getState().connecting).toBe(true);

    vi.advanceTimersByTime(10_000);

    expect(homeAssistantServiceStub.disconnect).toHaveBeenCalled();
    expect(homeAssistantStore.getState().connected).toBe(false);
    expect(homeAssistantStore.getState().connecting).toBe(false);
    expect(homeAssistantStore.getState().reconnecting).toBe(false);
    expect(homeAssistantStore.getState().error).toBe(
      'Cannot connect to Home Assistant. Check the saved URL and update it if your Home Assistant address changed.'
    );
    expect(useErrorStore.getState().error?.details).toContain('https://stale-ha.example.com');
  });

  it('does not let an older timeout affect a superseding successful attempt', async () => {
    vi.useFakeTimers();
    homeAssistantServiceStub.authenticate.mockImplementationOnce(() => new Promise(() => {}));

    void homeAssistantStore.getState().connect({
      hassUrl: 'https://old-ha.example.com',
      token: 'old-token',
    });

    vi.advanceTimersByTime(5_000);

    homeAssistantServiceStub.connected = true;
    await homeAssistantStore.getState().connect({
      hassUrl: 'https://new-ha.example.com',
      token: 'new-token',
    });

    vi.advanceTimersByTime(10_000);

    expect(homeAssistantStore.getState().connected).toBe(true);
    expect(homeAssistantStore.getState().connecting).toBe(false);
    expect(homeAssistantStore.getState().error).toBeNull();
    expect(useErrorStore.getState().error).toBeNull();
  });

  it('ignores stale service events after a timed-out connection attempt', async () => {
    vi.useFakeTimers();
    homeAssistantServiceStub.authenticate.mockImplementationOnce(() => new Promise(() => {}));

    void homeAssistantStore.getState().connect({
      hassUrl: 'https://stale-ha.example.com',
      token: 'abc',
    });

    const staleConnectionListeners = [...homeAssistantServiceStub.listeners.connection];

    vi.advanceTimersByTime(10_000);

    staleConnectionListeners.forEach((listener) => {
      listener({ connected: true, connection: { id: 'stale-connection' }, reconnecting: false });
    });

    expect(homeAssistantStore.getState().connected).toBe(false);
    expect(homeAssistantStore.getState().connection).toBeNull();
    expect(homeAssistantStore.getState().error).toBe(
      'Cannot connect to Home Assistant. Check the saved URL and update it if your Home Assistant address changed.'
    );
  });
});
