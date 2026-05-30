import type { HassConfig } from 'home-assistant-js-websocket';
import { beforeEach, describe, expect, it } from 'vitest';
import { homeAssistantStore } from '@/app/stores/home-assistant-store';
import {
  homeAssistantEntityRuntimeService,
  resetHomeAssistantEntityRuntimeServiceCachesForTests,
} from './homeassistant-entity-runtime.service';

describe('homeAssistantEntityRuntimeService', () => {
  beforeEach(() => {
    homeAssistantStore.setState(homeAssistantStore.getInitialState(), true);
    resetHomeAssistantEntityRuntimeServiceCachesForTests();
  });

  it('reuses entity snapshot references when cloned entity maps are semantically unchanged', () => {
    homeAssistantStore.setState({
      ...homeAssistantStore.getState(),
      entities: {
        'sensor.kitchen_temperature': {
          entity_id: 'sensor.kitchen_temperature',
          state: '21',
          attributes: {
            unit_of_measurement: 'C',
          },
          last_changed: '2026-05-30T10:00:00.000Z',
          last_updated: '2026-05-30T10:00:00.000Z',
          context: { id: 'ctx-1', parent_id: null, user_id: null },
        },
      },
    });

    const firstSnapshot = homeAssistantEntityRuntimeService.getEntitySnapshots();

    homeAssistantStore.setState({
      ...homeAssistantStore.getState(),
      entities: {
        'sensor.kitchen_temperature': {
          entity_id: 'sensor.kitchen_temperature',
          state: '21',
          attributes: {
            unit_of_measurement: 'C',
          },
          last_changed: '2026-05-30T10:00:00.000Z',
          last_updated: '2026-05-30T10:00:00.000Z',
          context: { id: 'ctx-1', parent_id: null, user_id: null },
        },
      },
    });

    const secondSnapshot = homeAssistantEntityRuntimeService.getEntitySnapshots();

    expect(secondSnapshot).toBe(firstSnapshot);
  });

  it('reuses config references when cloned config objects are semantically unchanged', () => {
    const config = {
      latitude: 1,
      longitude: 2,
      elevation: 3,
      unit_system: {
        length: 'km',
      },
      location_name: 'Home',
      time_zone: 'Europe/Stockholm',
      components: [],
      config_dir: '/config',
      whitelist_external_dirs: [],
      allowlist_external_dirs: [],
      allowlist_external_urls: [],
      version: '2026.5.0',
      config_source: 'storage',
      safe_mode: false,
      state: 'RUNNING',
      external_url: null,
      internal_url: null,
      currency: 'EUR',
    } as unknown as HassConfig;

    homeAssistantStore.setState({
      ...homeAssistantStore.getState(),
      config,
    });

    const firstConfig = homeAssistantEntityRuntimeService.getConfig();

    homeAssistantStore.setState({
      ...homeAssistantStore.getState(),
      config: {
        ...config,
        unit_system: {
          ...config.unit_system,
        },
      },
    });

    const secondConfig = homeAssistantEntityRuntimeService.getConfig();

    expect(secondConfig).toBe(firstConfig);
  });
});
