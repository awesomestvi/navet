import type { HassConfig, HassEntity, HassUser } from 'home-assistant-js-websocket';
import { describe, expect, it, vi } from 'vitest';
import {
  HomeAssistantPanelAdapter,
  type HomeAssistantPanelHass,
} from '../home-assistant-panel-adapter';

const config = {
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
  location_name: 'Home',
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

const user = {
  id: 'user-1',
  is_admin: true,
  is_owner: true,
  name: 'Panel User',
} as HassUser;

const states = {
  'light.kitchen': {
    entity_id: 'light.kitchen',
    state: 'on',
    last_changed: '2026-05-18T00:00:00.000Z',
    last_updated: '2026-05-18T00:00:00.000Z',
    attributes: { friendly_name: 'Kitchen' },
    context: {
      id: 'context-1',
      user_id: 'user-1',
      parent_id: null,
    },
  },
} satisfies Record<string, HassEntity>;

function createCallWS(results: unknown[] = []): HomeAssistantPanelHass['callWS'] {
  const queue = [...results];
  const handler: HomeAssistantPanelHass['callWS'] = async <T = unknown>() => queue.shift() as T;
  return vi.fn(handler) as HomeAssistantPanelHass['callWS'];
}

function createPanelHass(overrides: Partial<HomeAssistantPanelHass> = {}): HomeAssistantPanelHass {
  return {
    states,
    config,
    user,
    callService: vi.fn(async () => undefined),
    callWS: createCallWS([[]]),
    ...overrides,
  };
}

describe('HomeAssistantPanelAdapter', () => {
  it('exposes injected Home Assistant state without opening a websocket', () => {
    const adapter = new HomeAssistantPanelAdapter(createPanelHass());

    expect(adapter.getConfig()).toBe(config);
    expect(adapter.getEntities()).toBe(states);
    expect(adapter.getUser()).toBe(user);
  });

  it('routes service calls through the injected hass object', async () => {
    const callService = vi.fn(async () => undefined);
    const adapter = new HomeAssistantPanelAdapter(createPanelHass({ callService }));

    await adapter.callService(
      'light',
      'turn_on',
      { brightness_pct: 50 },
      { entity_id: 'light.kitchen' }
    );

    expect(callService).toHaveBeenCalledWith(
      'light',
      'turn_on',
      { brightness_pct: 50, entity_id: 'light.kitchen' },
      { entity_id: 'light.kitchen' }
    );
  });

  it('loads registries with Home Assistant websocket commands', async () => {
    const callWS = createCallWS([
      [{ area_id: 'kitchen', name: 'Kitchen' }],
      [{ id: 'device-1', area_id: 'kitchen' }],
      [{ entity_id: 'light.kitchen', device_id: 'device-1' }],
    ]);
    const adapter = new HomeAssistantPanelAdapter(createPanelHass({ callWS }));

    await expect(adapter.loadRegistries()).resolves.toEqual({
      areas: [{ area_id: 'kitchen', name: 'Kitchen' }],
      devices: [{ id: 'device-1', area_id: 'kitchen' }],
      entities: [{ entity_id: 'light.kitchen', device_id: 'device-1' }],
    });

    expect(callWS).toHaveBeenNthCalledWith(1, { type: 'config/area_registry/list' });
    expect(callWS).toHaveBeenNthCalledWith(2, { type: 'config/device_registry/list' });
    expect(callWS).toHaveBeenNthCalledWith(3, { type: 'config/entity_registry/list' });
  });

  it('returns a connection-compatible websocket command bridge', async () => {
    const callWS = createCallWS([{ ok: true }]);
    const adapter = new HomeAssistantPanelAdapter(createPanelHass({ callWS }));

    await expect(
      adapter.getConnection().sendMessagePromise({ type: 'camera/capabilities' })
    ).resolves.toEqual({ ok: true });
  });

  it('routes websocket subscriptions through the injected frontend connection', async () => {
    const unsubscribe = vi.fn();
    const subscribeMessage = vi.fn(async () => unsubscribe);
    const adapter = new HomeAssistantPanelAdapter(
      createPanelHass({
        connection: {
          subscribeMessage,
        } as unknown as HomeAssistantPanelHass['connection'],
      })
    );
    const callback = vi.fn();

    await expect(
      adapter.getConnection().subscribeMessage(callback, {
        type: 'persistent_notification/subscribe',
      })
    ).resolves.toBe(unsubscribe);

    expect(subscribeMessage).toHaveBeenCalledWith(
      callback,
      { type: 'persistent_notification/subscribe' },
      undefined
    );
  });

  it('exposes a subscription method even when Home Assistant omits the frontend connection', async () => {
    const adapter = new HomeAssistantPanelAdapter(createPanelHass());

    await expect(
      adapter.getConnection().subscribeMessage(vi.fn(), {
        type: 'persistent_notification/subscribe',
      })
    ).rejects.toThrow('Home Assistant panel connection cannot subscribe');
  });
});
