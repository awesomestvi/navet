import { advancedClimateEntityFactory } from '@navet/app/test/fixtures/home-assistant/entities/advanced-climate';
import { writableHelperEntities } from '@navet/app/test/fixtures/home-assistant/entities/writable-helper';
import type { NavetCommand } from '@navet/core/types';
import type { Connection } from 'home-assistant-js-websocket';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { homeAssistantService } from '../services/home-assistant.service';
import type { HomeAssistantPanelHass } from '../services/home-assistant-panel-adapter';
import { homeAssistantStore } from '../stores/home-assistant-store';
import { createHomeAssistantAppProviderPackageRegistration } from './home-assistant-package-registration';

const client = vi.hoisted(() => ({ connection: null as unknown }));
vi.mock('@navet/app/api/homeAssistantClient', () => ({
  createHomeAssistantClient: vi.fn(async () => ({ connection: client.connection })),
}));
vi.mock('home-assistant-js-websocket', async (importOriginal) => ({
  ...(await importOriginal<typeof import('home-assistant-js-websocket')>()),
  getUser: vi.fn(async () => null),
  subscribeEntities: vi.fn(),
  subscribeConfig: vi.fn(),
}));

const commands: Array<[NavetCommand, string, string, Record<string, unknown>]> = [
  [
    { type: 'set_number_value', entityId: 'home_assistant:input_number.target', value: 21 },
    'input_number.target',
    'set_value',
    { value: 21 },
  ],
  [
    { type: 'select_option', entityId: 'home_assistant:input_select.house_mode', option: 'Away' },
    'input_select.house_mode',
    'select_option',
    { option: 'Away' },
  ],
  [
    { type: 'set_text_value', entityId: 'home_assistant:input_text.note', value: 'Lunch' },
    'input_text.note',
    'set_value',
    { value: 'Lunch' },
  ],
  [
    {
      type: 'set_datetime_value',
      entityId: 'home_assistant:input_datetime.wakeup',
      value: '08:30:00',
    },
    'input_datetime.wakeup',
    'set_datetime',
    { time: '08:30:00' },
  ],
  [
    { type: 'set_climate_preset', entityId: 'home_assistant:climate.living_room', preset: 'sleep' },
    'climate.living_room',
    'set_preset_mode',
    { preset_mode: 'sleep' },
  ],
  [
    { type: 'set_climate_fan_mode', entityId: 'home_assistant:climate.living_room', mode: 'quiet' },
    'climate.living_room',
    'set_fan_mode',
    { fan_mode: 'quiet' },
  ],
  [
    {
      type: 'set_climate_swing_mode',
      entityId: 'home_assistant:climate.living_room',
      mode: 'vertical',
    },
    'climate.living_room',
    'set_swing_mode',
    { swing_mode: 'vertical' },
  ],
  [
    {
      type: 'set_climate_swing_horizontal_mode',
      entityId: 'home_assistant:climate.living_room',
      mode: 'on',
    },
    'climate.living_room',
    'set_swing_horizontal_mode',
    { swing_horizontal_mode: 'on' },
  ],
  [
    { type: 'set_climate_humidity', entityId: 'home_assistant:climate.living_room', humidity: 50 },
    'climate.living_room',
    'set_humidity',
    { humidity: 50 },
  ],
];

afterEach(() => {
  homeAssistantService.disconnect();
  vi.restoreAllMocks();
});

describe('Home Assistant app package command targets', () => {
  it.each(['standalone', 'panel'] as const)(
    'targets writable helpers and advanced climate through the existing %s transport',
    async (mode) => {
      const sendMessagePromise = vi.fn(async () => []);
      const connection = {
        sendMessagePromise,
        subscribeMessage: vi.fn(async () => vi.fn()),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        close: vi.fn(),
      } as unknown as Connection;
      const entities = {
        ...writableHelperEntities,
        'climate.living_room': advancedClimateEntityFactory(),
      };
      const callService = vi.fn(async () => undefined);
      if (mode === 'panel') {
        homeAssistantService.setPanelHass({
          states: entities,
          config: {} as never,
          connection,
          callService,
          callWS: vi.fn(async () => []) as HomeAssistantPanelHass['callWS'],
        });
      } else {
        client.connection = connection;
        await homeAssistantService.authenticate({
          providerId: 'home_assistant',
          runtime: 'standalone-oauth',
          authMode: 'oauth',
          haBaseUrl: 'https://ha.example.test',
          hassUrl: 'https://ha.example.test',
        });
      }
      homeAssistantStore.setState({
        connected: true,
        entities,
        areas: [],
        deviceRegistry: [],
        entityRegistry: [],
        registriesHydrated: true,
      });
      const registration = createHomeAssistantAppProviderPackageRegistration({
        getProviderSession: () => null,
      });
      for (const [command, entityId, service, data] of commands) {
        await registration.providerContractAdapter.execute(command);
        const domain = entityId.split('.')[0];
        if (mode === 'panel') {
          expect(callService).toHaveBeenLastCalledWith(
            domain,
            service,
            { ...data, entity_id: entityId },
            { entity_id: entityId }
          );
        } else {
          expect(sendMessagePromise).toHaveBeenLastCalledWith({
            type: 'call_service',
            domain,
            service,
            service_data: { ...data, entity_id: entityId },
            target: { entity_id: entityId },
          });
        }
      }
    }
  );
});
