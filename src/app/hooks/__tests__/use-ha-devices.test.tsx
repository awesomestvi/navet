import type { HassEntity } from 'home-assistant-js-websocket';
import { describe, expect, it } from 'vitest';
import { homeAssistantStore } from '@/app/stores/home-assistant-store';
import { renderHookWithProviders } from '@/test/render';
import { resetAppStores } from '@/test/store-reset';
import { useHADevices } from '../use-ha-devices';

function createEntity(
  entityId: string,
  state: string,
  attributes: Record<string, unknown> = {}
): HassEntity {
  return {
    entity_id: entityId,
    state,
    attributes,
    last_changed: '2026-05-17T00:00:00.000Z',
    last_updated: '2026-05-17T00:00:00.000Z',
    context: { id: 'ctx', parent_id: null, user_id: null },
  } as HassEntity;
}

describe('useHADevices', () => {
  it('maps Home Assistant fan entities as addable fan devices', async () => {
    await resetAppStores();
    homeAssistantStore.setState({
      entities: {
        'fan.hallway': createEntity('fan.hallway', 'on', {
          friendly_name: 'Hallway Fan',
          percentage: 50,
        }),
      },
      entityRegistry: [{ entity_id: 'fan.hallway', area_id: 'hallway' }],
      areas: [{ area_id: 'hallway', name: 'Hallway' }],
    });

    const { result } = renderHookWithProviders(() => useHADevices());

    expect(result.current.fans).toEqual([
      expect.objectContaining({
        id: 'fan.hallway',
        name: 'Hallway Fan',
        room: 'Hallway',
        state: true,
        percentage: 50,
      }),
    ]);
    expect(result.current.switches).toEqual([]);
  });

  it('maps sensor and binary sensor entities as normal sensor devices', async () => {
    await resetAppStores();
    homeAssistantStore.setState({
      entities: {
        'sensor.kitchen_temperature': createEntity('sensor.kitchen_temperature', '21.4', {
          friendly_name: 'Kitchen Temperature',
          device_class: 'temperature',
          unit_of_measurement: '°C',
        }),
        'binary_sensor.kitchen_motion': createEntity('binary_sensor.kitchen_motion', 'on', {
          friendly_name: 'Kitchen Motion',
          device_class: 'motion',
        }),
      },
      entityRegistry: [
        { entity_id: 'sensor.kitchen_temperature', area_id: 'kitchen' },
        { entity_id: 'binary_sensor.kitchen_motion', area_id: 'kitchen' },
      ],
      areas: [{ area_id: 'kitchen', name: 'Kitchen' }],
    });

    const { result } = renderHookWithProviders(() => useHADevices());

    expect(result.current.sensors).toEqual([
      expect.objectContaining({
        id: 'sensor.kitchen_temperature',
        name: 'Kitchen Temperature',
        room: 'Kitchen',
        value: '21.4',
        unit: '°C',
        icon: 'thermometer',
        deviceClass: 'temperature',
        status: 'measurement',
      }),
      expect.objectContaining({
        id: 'binary_sensor.kitchen_motion',
        name: 'Kitchen Motion',
        room: 'Kitchen',
        value: 'Detected',
        unit: '',
        icon: 'motion',
        deviceClass: 'motion',
        status: 'active',
      }),
    ]);
  });
});
