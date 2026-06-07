import type { HomeAssistantPanelHass } from '@navet/app/services/home-assistant-panel-adapter';
import type { HassConfig, HassEntity, HassUser } from 'home-assistant-js-websocket';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { homeAssistantService } from '../home-assistant.service';

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
  location_name: 'Ingress Home',
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

function createAlarmEntity(state: string): HassEntity {
  return {
    entity_id: 'alarm_control_panel.home',
    state,
    attributes: {
      friendly_name: 'Home Alarm',
      supported_features: 3,
    },
    last_changed: '2026-06-07T18:00:00.000Z',
    last_updated: '2026-06-07T18:00:00.000Z',
    context: {
      id: 'ctx-1',
      parent_id: null,
      user_id: 'panel-user',
    },
  };
}

function createPanelHass(state: string): HomeAssistantPanelHass {
  return {
    states: {
      'alarm_control_panel.home': createAlarmEntity(state),
    },
    config: panelConfig,
    user: panelUser,
    connection: {
      sendMessagePromise: vi.fn(async () => ({ ok: true })),
      subscribeMessage: vi.fn(async () => vi.fn()),
    } as unknown as HomeAssistantPanelHass['connection'],
    callService: vi.fn(async () => undefined),
    callWS: vi.fn(async () => ({ ok: true })) as HomeAssistantPanelHass['callWS'],
  };
}

describe('homeAssistantService panel bridge updates', () => {
  beforeEach(() => {
    homeAssistantService.disconnect();
  });

  it('emits entity updates when the ingress bridge refreshes in place', () => {
    const entityStates: string[] = [];
    const unsubscribe = homeAssistantService.addListener('entities', (entities) => {
      entityStates.push(entities['alarm_control_panel.home']?.state ?? 'missing');
    });

    const hass = createPanelHass('disarmed');
    homeAssistantService.setPanelHass(hass);

    hass.states['alarm_control_panel.home'].state = 'armed_home';
    homeAssistantService.setPanelHass(hass);

    unsubscribe();

    expect(entityStates).toEqual(['disarmed', 'armed_home']);
  });
});
