import { describe, expect, it } from 'vitest';
import type {
  PlatformEntityRegistryEntry,
  PlatformEntitySnapshotMap,
} from '@/app/platform/provider-feature-models';
import { sensorEntityFactory } from '@/test/fixtures/home-assistant/entities/sensor';
import { vacuumEntityFactory } from '@/test/fixtures/home-assistant/entities/vacuum';
import { resolveVacuumGlanceMetrics } from '../vacuum-metrics';

describe('resolveVacuumGlanceMetrics', () => {
  it('reads direct vacuum attributes first', () => {
    const vacuumEntity = vacuumEntityFactory({
      battery_level: 82,
      next_cleaning: 'Every weekday 09:00',
      water_level: 63,
      bin_level: 41,
    });
    vacuumEntity.entity_id = 'vacuum.roborock';
    vacuumEntity.state = 'docked';

    const metrics = resolveVacuumGlanceMetrics({
      vacuumEntityId: 'vacuum.roborock',
      fallbackBattery: 10,
      vacuumEntity: {
        entityId: 'vacuum.roborock',
        state: vacuumEntity.state,
        attributes: vacuumEntity.attributes,
        lastChanged: vacuumEntity.last_changed,
        lastUpdated: vacuumEntity.last_updated,
      },
    });

    expect(metrics).toEqual({
      battery: 82,
      nextCleaning: 'Every weekday 09:00',
      waterLevel: { value: '63%', percentage: 63, isWarning: false },
      binLevel: { value: '41%', percentage: 41, isWarning: false },
    });
  });

  it('discovers related water and bin sensors from the entity registry', () => {
    const vacuum = vacuumEntityFactory();
    vacuum.entity_id = 'vacuum.roborock';
    vacuum.state = 'docked';
    const waterSensor = sensorEntityFactory({
      friendly_name: 'Water tank',
      unit_of_measurement: '%',
    });
    waterSensor.entity_id = 'sensor.roborock_water_tank';
    waterSensor.state = '17';
    const dustbinSensor = sensorEntityFactory({
      friendly_name: 'Dustbin',
      unit_of_measurement: '%',
    });
    dustbinSensor.entity_id = 'sensor.roborock_dustbin';
    dustbinSensor.state = '91';
    const unrelatedWaterSensor = sensorEntityFactory({
      friendly_name: 'Water tank',
      unit_of_measurement: '%',
    });
    unrelatedWaterSensor.entity_id = 'sensor.unrelated_water';
    unrelatedWaterSensor.state = '100';

    const entities = {
      'vacuum.roborock': vacuum,
      'sensor.roborock_water_tank': waterSensor,
      'sensor.roborock_dustbin': dustbinSensor,
      'sensor.unrelated_water': unrelatedWaterSensor,
    } as unknown as PlatformEntitySnapshotMap;
    const entityRegistry: PlatformEntityRegistryEntry[] = [
      { entityId: 'vacuum.roborock', deviceId: 'device-vacuum' },
      {
        entityId: 'sensor.roborock_water_tank',
        deviceId: 'device-vacuum',
        name: 'Water tank',
      },
      {
        entityId: 'sensor.roborock_dustbin',
        deviceId: 'device-vacuum',
        name: 'Dustbin',
      },
      {
        entityId: 'sensor.unrelated_water',
        deviceId: 'device-other',
        name: 'Water tank',
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
