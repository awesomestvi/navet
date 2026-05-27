import type { HassConfig, HassEntity, HassUser } from 'home-assistant-js-websocket';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { HomeAssistantPanelHass } from '@/app/services/home-assistant-panel-adapter';
import { lightEntityFactory } from '@/test/fixtures/home-assistant/entities/light';
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

const panelConfig = {
  latitude: 0,
  longitude: 0,
  elevation: 0,
  radius: 100,
  unit_system: {
    length: 'km',
    mass: 'g',
    volume: 'L',
    temperature: 'C',
    pressure: 'Pa',
    wind_speed: 'm/s',
    accumulated_precipitation: 'mm',
  },
  location_name: 'Panel Home',
  time_zone: 'Europe/Stockholm',
  components: [],
  config_dir: '/config',
  allowlist_external_dirs: [],
  allowlist_external_urls: [],
  version: '2026.5.0',
  config_source: 'storage',
  recovery_mode: false,
  safe_mode: false,
  state: 'RUNNING',
  external_url: null,
  internal_url: null,
  currency: 'SEK',
  country: 'SE',
  language: 'en',
} satisfies HassConfig;

const panelUser = {
  id: 'panel-user',
  is_admin: true,
  is_owner: true,
  name: 'Panel User',
} as HassUser;

function createPanelEntity(state: string): HassEntity {
  const entity = lightEntityFactory({
    friendly_name: 'Kitchen',
  });
  entity.entity_id = 'light.kitchen';
  entity.state = state;
  entity.attributes = {};
  entity.context = {
    id: 'context-1',
    user_id: 'panel-user',
    parent_id: null,
  };
  return entity;
}

function createPanelHass(state: string): HomeAssistantPanelHass {
  const callWS: HomeAssistantPanelHass['callWS'] = async <T = unknown>() => [] as T;

  return {
    states: {
      'light.kitchen': createPanelEntity(state),
    },
    config: panelConfig,
    user: panelUser,
    callService: vi.fn(async () => undefined),
    callWS: vi.fn(callWS) as HomeAssistantPanelHass['callWS'],
  };
}

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
    setPanelHass: vi.fn(function (
      this: StubHomeAssistantService,
      hass: {
        states: Record<string, unknown>;
        config: Record<string, unknown>;
        user?: unknown;
        connection?: unknown;
      }
    ) {
      this.connected = true;
      this.config = hass.config;
      this.entities = hass.states;
      this.user = hass.user ?? null;
      this.connection = hass.connection ?? { id: 'panel-connection' };
    }),
    loadRegistries: vi.fn(async function (this: StubHomeAssistantService) {
      this.listeners.registries.forEach((listener) => {
        listener({
          areas: this.areas,
          devices: this.deviceRegistry,
          entities: this.entityRegistry,
        });
      });
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
    homeAssistantServiceStub.setPanelHass.mockClear();
    homeAssistantServiceStub.loadRegistries.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('registers typed listeners and hydrates state after connect', async () => {
    homeAssistantServiceStub.connected = true;
    homeAssistantServiceStub.config = { location_name: 'Home' };
    homeAssistantServiceStub.entities = {
      'light.kitchen': createPanelEntity('on'),
    };

    await homeAssistantStore.getState().connect({
      providerId: 'home_assistant',
      runtime: 'standalone-oauth',
      authMode: 'oauth',
      haBaseUrl: 'https://ha.example.com',
      hassUrl: 'https://ha.example.com',
    });

    expect(homeAssistantServiceStub.addListener).toHaveBeenCalledTimes(5);
    expect(homeAssistantStore.getState().connected).toBe(true);
    expect(homeAssistantStore.getState().areas).toHaveLength(1);
    expect(homeAssistantStore.getState().registriesHydrated).toBe(true);
    expect(homeAssistantStore.getState().entities?.['light.kitchen']?.state).toBe('on');
  });

  it('marks registries hydrated after registry service events', async () => {
    await homeAssistantStore.getState().connect({
      providerId: 'home_assistant',
      runtime: 'standalone-oauth',
      authMode: 'oauth',
      haBaseUrl: 'https://ha.example.com',
      hassUrl: 'https://ha.example.com',
    });
    homeAssistantStore.setState({ registriesHydrated: false });

    homeAssistantServiceStub.listeners.registries.forEach((listener) => {
      listener({
        areas: [{ area_id: 'office', name: 'Office' }],
        devices: [{ id: 'device-2', area_id: 'office' }],
        entities: [{ entity_id: 'light.office', area_id: 'office' }],
      });
    });

    expect(homeAssistantStore.getState().registriesHydrated).toBe(true);
    expect(homeAssistantStore.getState().areas).toEqual([{ area_id: 'office', name: 'Office' }]);
  });

  it('debounces entity updates from the service', async () => {
    vi.useFakeTimers();
    await homeAssistantStore.getState().connect({
      providerId: 'home_assistant',
      runtime: 'standalone-oauth',
      authMode: 'oauth',
      haBaseUrl: 'https://ha.example.com',
      hassUrl: 'https://ha.example.com',
    });

    homeAssistantServiceStub.entities = {
      'light.kitchen': createPanelEntity('on'),
    };
    homeAssistantServiceStub.listeners.entities.forEach((listener) => {
      listener({
        'light.kitchen': createPanelEntity('on'),
      });
    });

    expect(homeAssistantStore.getState().entities).toBeNull();

    vi.advanceTimersByTime(50);

    expect(homeAssistantStore.getState().entities?.['light.kitchen']?.state).toBe('on');
  });

  it('disconnects and resets the store', async () => {
    await homeAssistantStore.getState().connect({
      providerId: 'home_assistant',
      runtime: 'standalone-oauth',
      authMode: 'oauth',
      haBaseUrl: 'https://ha.example.com',
      hassUrl: 'https://ha.example.com',
    });

    homeAssistantStore.getState().disconnect();

    expect(homeAssistantServiceStub.disconnect).toHaveBeenCalled();
    expect(homeAssistantStore.getState().connected).toBe(false);
    expect(homeAssistantStore.getState().entities).toBeNull();
    expect(homeAssistantStore.getState().registriesHydrated).toBe(false);
  });

  it('propagates connection errors into the HA store and global error store', async () => {
    homeAssistantServiceStub.authenticate.mockRejectedValueOnce(new Error('bad token'));

    await expect(
      homeAssistantStore.getState().connect({
        providerId: 'home_assistant',
        runtime: 'standalone-oauth',
        authMode: 'oauth',
        haBaseUrl: 'https://ha.example.com',
        hassUrl: 'https://ha.example.com',
      })
    ).rejects.toThrow('bad token');

    expect(homeAssistantStore.getState().error).toBe('bad token');
    expect(useErrorStore.getState().error?.message).toBe('bad token');
  });

  it('times out a stalled connection attempt and surfaces recovery state', async () => {
    vi.useFakeTimers();
    homeAssistantServiceStub.authenticate.mockImplementationOnce(() => new Promise(() => {}));

    void homeAssistantStore.getState().connect({
      providerId: 'home_assistant',
      runtime: 'standalone-oauth',
      authMode: 'oauth',
      haBaseUrl: 'https://stale-ha.example.com',
      hassUrl: 'https://stale-ha.example.com',
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
      providerId: 'home_assistant',
      runtime: 'standalone-oauth',
      authMode: 'oauth',
      haBaseUrl: 'https://old-ha.example.com',
      hassUrl: 'https://old-ha.example.com',
    });

    vi.advanceTimersByTime(5_000);

    homeAssistantServiceStub.connected = true;
    await homeAssistantStore.getState().connect({
      providerId: 'home_assistant',
      runtime: 'standalone-oauth',
      authMode: 'oauth',
      haBaseUrl: 'https://new-ha.example.com',
      hassUrl: 'https://new-ha.example.com',
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
      providerId: 'home_assistant',
      runtime: 'standalone-oauth',
      authMode: 'oauth',
      haBaseUrl: 'https://stale-ha.example.com',
      hassUrl: 'https://stale-ha.example.com',
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

  it('syncs repeated panel hass updates without recreating panel registry listeners', async () => {
    homeAssistantStore.getState().syncPanelHass(createPanelHass('on'));

    await Promise.resolve();

    expect(homeAssistantServiceStub.addListener).toHaveBeenCalledTimes(1);
    expect(homeAssistantServiceStub.loadRegistries).toHaveBeenCalledTimes(1);
    expect(homeAssistantStore.getState().entities?.['light.kitchen']?.state).toBe('on');

    homeAssistantStore.getState().syncPanelHass(createPanelHass('off'));

    expect(homeAssistantServiceStub.addListener).toHaveBeenCalledTimes(1);
    expect(homeAssistantServiceStub.loadRegistries).toHaveBeenCalledTimes(1);
    expect(homeAssistantStore.getState().entities?.['light.kitchen']?.state).toBe('off');
  });
});
