import type { HassEntities, HassEntity } from 'home-assistant-js-websocket';
import { describe, expect, it } from 'vitest';
import type { HomeAssistantEntityRegistryEntry } from '@/app/services/home-assistant.service';
import { resolveVacuumGlanceMetrics } from '../vacuum-metrics';

function entity(state: string, attributes: Record<string, unknown> = {}): HassEntity {
  return {
    entity_id: 'sensor.test',
    state,
    attributes,
    last_changed: '',
    last_updated: '',
    context: { id: '', parent_id: null, user_id: null },
  } as HassEntity;
}

describe('resolveVacuumGlanceMetrics', () => {
  it('reads direct vacuum attributes first', () => {
    const metrics = resolveVacuumGlanceMetrics({
      vacuumEntityId: 'vacuum.roborock',
      fallbackBattery: 10,
      vacuumEntity: entity('docked', {
        battery_level: 82,
        next_cleaning: 'Every weekday 09:00',
        water_level: 63,
        bin_level: 41,
      }),
    });

    expect(metrics).toEqual({
      battery: 82,
      nextCleaning: 'Every weekday 09:00',
      waterLevel: { value: '63%', percentage: 63, isWarning: false },
      binLevel: { value: '41%', percentage: 41, isWarning: false },
    });
  });

  it('discovers related water and bin sensors from the entity registry', () => {
    const entities = {
      'vacuum.roborock': entity('docked'),
      'sensor.roborock_water_tank': entity('17'),
      'sensor.roborock_dustbin': entity('91'),
      'sensor.unrelated_water': entity('100'),
    } as HassEntities;
    const entityRegistry: HomeAssistantEntityRegistryEntry[] = [
      { entity_id: 'vacuum.roborock', device_id: 'device-vacuum' },
      {
        entity_id: 'sensor.roborock_water_tank',
        device_id: 'device-vacuum',
        original_name: 'Water tank',
      },
      {
        entity_id: 'sensor.roborock_dustbin',
        device_id: 'device-vacuum',
        original_name: 'Dustbin',
      },
      {
        entity_id: 'sensor.unrelated_water',
        device_id: 'device-other',
        original_name: 'Water tank',
      },
    ];

    const metrics = resolveVacuumGlanceMetrics({
      vacuumEntityId: 'vacuum.roborock',
      fallbackBattery: 55,
      entities,
      entityRegistry,
    });

    expect(metrics.waterLevel).toEqual({ value: '17%', percentage: 17, isWarning: true });
    expect(metrics.binLevel).toEqual({ value: '91%', percentage: 91, isWarning: true });
  });

  it('uses explicit fallback values when live data is unavailable', () => {
    const metrics = resolveVacuumGlanceMetrics({
      vacuumEntityId: 'vacuum.roborock',
      fallbackBattery: 120,
      fallbackNextCleaning: 'Tonight 21:00',
      fallbackWaterLevel: 'low',
      fallbackBinLevel: 86,
    });

    expect(metrics.battery).toBe(100);
    expect(metrics.nextCleaning).toBe('Tonight 21:00');
    expect(metrics.waterLevel).toEqual({ value: 'low', isWarning: true });
    expect(metrics.binLevel).toEqual({ value: '86%', percentage: 86, isWarning: true });
  });

  it('formats scheduled cleanings with the selected 12-hour preference', () => {
    const metrics = resolveVacuumGlanceMetrics({
      vacuumEntityId: 'vacuum.roborock',
      fallbackBattery: 100,
      fallbackNextCleaning: '2026-05-17T13:00:00.000Z',
      use24HourTime: false,
    });

    expect(metrics.nextCleaning).toMatch(/[ap]m$/i);
  });

  it('formats scheduled cleanings with the selected 24-hour preference', () => {
    const metrics = resolveVacuumGlanceMetrics({
      vacuumEntityId: 'vacuum.roborock',
      fallbackBattery: 100,
      fallbackNextCleaning: '2026-05-17T13:00:00.000Z',
      use24HourTime: true,
    });

    expect(metrics.nextCleaning).not.toMatch(/[AP]M$/);
  });
});
