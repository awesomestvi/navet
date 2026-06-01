import type { HomeAssistantEntityRegistryEntry } from '@navet/app/services/home-assistant.service';
import { climateEntityFactory } from '@navet/app/test/fixtures/home-assistant/entities/climate';
import { waterHeaterEntityFactory } from '@navet/app/test/fixtures/home-assistant/entities/water-heater';
import { makeHassEntityFixture } from '@navet/app/test/fixtures/home-assistant/shared';
import type { HassEntities } from 'home-assistant-js-websocket';
import { describe, expect, it } from 'vitest';
import {
  buildDeviceIndexes,
  shouldSkipSwitchDevice,
  shouldSuppressHelperCard,
} from '../use-ha-devices.helpers';

function createRegistryMap(entries: HomeAssistantEntityRegistryEntry[]) {
  return new Map(entries.map((entry) => [entry.entity_id, entry]));
}

describe('use-ha-devices helpers', () => {
  it('collects sensor and config metrics for the owning switch device', () => {
    const entities: HassEntities = {
      'switch.kitchen_outlet': makeHassEntityFixture({
        entityId: 'switch.kitchen_outlet',
        state: 'on',
        attributes: {
          friendly_name: 'Kitchen outlet',
          icon: 'mdi:power-socket-eu',
        },
      }),
      'sensor.kitchen_outlet_power': makeHassEntityFixture({
        entityId: 'sensor.kitchen_outlet_power',
        state: '127',
        attributes: {
          friendly_name: 'Kitchen outlet power',
          device_class: 'power',
          unit_of_measurement: 'W',
          state_class: 'measurement',
        },
      }),
      'select.kitchen_outlet_mode': makeHassEntityFixture({
        entityId: 'select.kitchen_outlet_mode',
        state: 'eco',
        attributes: {
          friendly_name: 'Outlet mode',
          options: ['eco', 'comfort'],
        },
      }),
    };

    const entityRegistryMap = createRegistryMap([
      { entity_id: 'switch.kitchen_outlet', device_id: 'device-1' },
      { entity_id: 'sensor.kitchen_outlet_power', device_id: 'device-1' },
      {
        entity_id: 'select.kitchen_outlet_mode',
        device_id: 'device-1',
        entity_category: 'config',
      },
    ]);

    const indexes = buildDeviceIndexes(entities, entityRegistryMap);
    const metrics = indexes.switchMetricsByDeviceId.get('device-1');

    expect(metrics).toBeDefined();
    expect(metrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Power', value: 127, unit: 'W', category: 'measurement' }),
        expect.objectContaining({
          label: 'Outlet mode',
          value: 'eco',
          unit: '',
          category: 'configuration',
        }),
      ])
    );
  });

  it('skips config metrics with Home Assistant placeholder values', () => {
    const entities: HassEntities = {
      'switch.pax_calima_boostmode': makeHassEntityFixture({
        entityId: 'switch.pax_calima_boostmode',
        state: 'on',
        attributes: {
          friendly_name: 'Pax Calima BoostMode',
        },
      }),
      'select.pax_calima_power_on_behaviour': makeHassEntityFixture({
        entityId: 'select.pax_calima_power_on_behaviour',
        state: 'PreviousValue',
        attributes: {
          friendly_name: 'Pax Calima Power-on behaviour',
          options: ['PreviousValue', 'On', 'Off'],
        },
      }),
    };

    const entityRegistryMap = createRegistryMap([
      { entity_id: 'switch.pax_calima_boostmode', device_id: 'device-pax-calima' },
      {
        entity_id: 'select.pax_calima_power_on_behaviour',
        device_id: 'device-pax-calima',
        entity_category: 'config',
      },
    ]);

    const indexes = buildDeviceIndexes(entities, entityRegistryMap);

    expect(indexes.switchMetricsByDeviceId.get('device-pax-calima')).toBeUndefined();
  });

  it('collects cumulative total energy sensors for switch metrics', () => {
    const entities: HassEntities = {
      'switch.garden_lights_switch': makeHassEntityFixture({
        entityId: 'switch.garden_lights_switch',
        state: 'on',
        attributes: {
          friendly_name: 'Garden Mains',
        },
      }),
      'sensor.garden_mains_total_energy': makeHassEntityFixture({
        entityId: 'sensor.garden_mains_total_energy',
        state: '0.092',
        attributes: {
          friendly_name: 'Garden Mains Total energy',
          device_class: 'energy',
          state_class: 'total_increasing',
          unit_of_measurement: 'kWh',
        },
      }),
      'sensor.garden_mains_energy_today': makeHassEntityFixture({
        entityId: 'sensor.garden_mains_energy_today',
        state: '1.4',
        attributes: {
          friendly_name: 'Garden Mains Energy today',
          device_class: 'energy',
          state_class: 'total_increasing',
          unit_of_measurement: 'kWh',
        },
      }),
    };

    const entityRegistryMap = createRegistryMap([
      { entity_id: 'switch.garden_lights_switch', device_id: 'device-garden-mains' },
      { entity_id: 'sensor.garden_mains_total_energy', device_id: 'device-garden-mains' },
      { entity_id: 'sensor.garden_mains_energy_today', device_id: 'device-garden-mains' },
    ]);

    const indexes = buildDeviceIndexes(entities, entityRegistryMap);
    const metrics = indexes.switchMetricsByDeviceId.get('device-garden-mains');

    expect(metrics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Energy', value: 1.4, unit: 'kWh' }),
      ])
    );
  });

  it('collects total energy when it is the only switch energy metric', () => {
    const entities: HassEntities = {
      'switch.garden_lights_switch': makeHassEntityFixture({
        entityId: 'switch.garden_lights_switch',
        state: 'on',
        attributes: {
          friendly_name: 'Garden Mains',
        },
      }),
      'sensor.garden_mains_total_energy': makeHassEntityFixture({
        entityId: 'sensor.garden_mains_total_energy',
        state: '0.092',
        attributes: {
          friendly_name: 'Garden Mains Total energy',
          device_class: 'energy',
          state_class: 'total_increasing',
          unit_of_measurement: 'kWh',
        },
      }),
    };

    const entityRegistryMap = createRegistryMap([
      { entity_id: 'switch.garden_lights_switch', device_id: 'device-garden-mains' },
      { entity_id: 'sensor.garden_mains_total_energy', device_id: 'device-garden-mains' },
    ]);

    const indexes = buildDeviceIndexes(entities, entityRegistryMap);

    expect(indexes.switchMetricsByDeviceId.get('device-garden-mains')).toEqual([
      expect.objectContaining({ label: 'Energy', value: 0.092, unit: 'kWh' }),
    ]);
  });

  it('suppresses switches attached to climate, water heater, or vacuum devices', () => {
    const entities: HassEntities = {
      'climate.hallway': climateEntityFactory(),
      'water_heater.boiler': waterHeaterEntityFactory(),
      'vacuum.roborock': makeHassEntityFixture({
        entityId: 'vacuum.roborock',
        state: 'docked',
        attributes: {
          friendly_name: 'Roborock',
          battery_level: 76,
          fan_speed: 'balanced',
          fan_speed_list: ['quiet', 'balanced', 'turbo'],
          supported_features: 127,
        },
      }),
      'switch.hallway_boost': makeHassEntityFixture({
        entityId: 'switch.hallway_boost',
        state: 'off',
        attributes: {
          friendly_name: 'Hallway Boost',
        },
      }),
      'switch.boiler_boost': makeHassEntityFixture({
        entityId: 'switch.boiler_boost',
        state: 'off',
        attributes: {
          friendly_name: 'Boiler Boost',
        },
      }),
      'switch.roborock_child_lock': makeHassEntityFixture({
        entityId: 'switch.roborock_child_lock',
        state: 'off',
        attributes: {
          friendly_name: 'Roborock Child Lock',
        },
      }),
    };
    const entityRegistryMap = createRegistryMap([
      { entity_id: 'climate.hallway', device_id: 'device-climate' },
      { entity_id: 'water_heater.boiler', device_id: 'device-boiler' },
      { entity_id: 'vacuum.roborock', device_id: 'device-vacuum' },
      { entity_id: 'switch.hallway_boost', device_id: 'device-climate' },
      { entity_id: 'switch.boiler_boost', device_id: 'device-boiler' },
      { entity_id: 'switch.roborock_child_lock', device_id: 'device-vacuum' },
    ]);

    const indexes = buildDeviceIndexes(entities, entityRegistryMap);

    expect(
      shouldSkipSwitchDevice(
        'switch.hallway_boost',
        entityRegistryMap.get('switch.hallway_boost'),
        indexes
      )
    ).toBe(true);
    expect(
      shouldSkipSwitchDevice(
        'switch.boiler_boost',
        entityRegistryMap.get('switch.boiler_boost'),
        indexes
      )
    ).toBe(true);
    expect(
      shouldSkipSwitchDevice(
        'switch.roborock_child_lock',
        entityRegistryMap.get('switch.roborock_child_lock'),
        indexes
      )
    ).toBe(true);
  });

  it('suppresses accessory switches attached to fan devices', () => {
    const entities: HassEntities = {
      'fan.xiaomi_smart_tower_fan': makeHassEntityFixture({
        entityId: 'fan.xiaomi_smart_tower_fan',
        state: 'on',
        attributes: {
          friendly_name: 'Xiaomi Smart Tower Fan',
          percentage: 33,
        },
      }),
      'switch.xiaomi_smart_tower_fan_physical_control_locked': makeHassEntityFixture({
        entityId: 'switch.xiaomi_smart_tower_fan_physical_control_locked',
        state: 'off',
        attributes: {
          friendly_name: 'Xiaomi Smart Tower Fan Physical Control Locked',
        },
      }),
    };
    const entityRegistryMap = createRegistryMap([
      { entity_id: 'fan.xiaomi_smart_tower_fan', device_id: 'device-xiaomi-fan' },
      {
        entity_id: 'switch.xiaomi_smart_tower_fan_physical_control_locked',
        device_id: 'device-xiaomi-fan',
      },
    ]);

    const indexes = buildDeviceIndexes(entities, entityRegistryMap);

    expect(
      shouldSkipSwitchDevice(
        'switch.xiaomi_smart_tower_fan_physical_control_locked',
        entityRegistryMap.get('switch.xiaomi_smart_tower_fan_physical_control_locked'),
        indexes
      )
    ).toBe(true);
  });

  it('suppresses helper cards when a device already has a primary card', () => {
    const entities: HassEntities = {
      'switch.kitchen_main': makeHassEntityFixture({
        entityId: 'switch.kitchen_main',
        state: 'on',
        attributes: {
          friendly_name: 'Kitchen Main',
        },
      }),
      'input_boolean.kitchen_timer': makeHassEntityFixture({
        entityId: 'input_boolean.kitchen_timer',
        state: 'off',
        attributes: {
          friendly_name: 'Kitchen Timer',
          editable: true,
        },
      }),
    };

    const entityRegistryMap = createRegistryMap([
      { entity_id: 'switch.kitchen_main', device_id: 'device-3' },
      { entity_id: 'input_boolean.kitchen_timer', device_id: 'device-3' },
    ]);

    const indexes = buildDeviceIndexes(entities, entityRegistryMap);

    expect(
      shouldSuppressHelperCard('input_boolean.kitchen_timer', entityRegistryMap, indexes)
    ).toBe(true);
  });

  it('suppresses helper buttons when a device is already represented by a sensor card', () => {
    const entities: HassEntities = {
      'sensor.aqara_humidity_sensor_humidity': makeHassEntityFixture({
        entityId: 'sensor.aqara_humidity_sensor_humidity',
        state: '48',
        attributes: {
          friendly_name: 'Aqara Humidity Sensor Humidity',
          device_class: 'humidity',
          unit_of_measurement: '%',
        },
      }),
      'button.aqara_humidity_sensor_identify': makeHassEntityFixture({
        entityId: 'button.aqara_humidity_sensor_identify',
        state: 'unknown',
        attributes: {
          friendly_name: 'Aqara Humidity Sensor Identify',
        },
      }),
    };

    const entityRegistryMap = createRegistryMap([
      {
        entity_id: 'sensor.aqara_humidity_sensor_humidity',
        device_id: 'device-aqara-humidity',
      },
      {
        entity_id: 'button.aqara_humidity_sensor_identify',
        device_id: 'device-aqara-humidity',
      },
    ]);

    const indexes = buildDeviceIndexes(entities, entityRegistryMap);

    expect(
      shouldSuppressHelperCard('button.aqara_humidity_sensor_identify', entityRegistryMap, indexes)
    ).toBe(true);
  });

  it('does not choose brightness accessory switches as the primary switch card', () => {
    const entities: HassEntities = {
      'switch.xiaomi_smart_tower_fan': makeHassEntityFixture({
        entityId: 'switch.xiaomi_smart_tower_fan',
        state: 'on',
        attributes: {
          friendly_name: 'Xiaomi Smart Tower Fan',
        },
      }),
      'switch.xiaomi_smart_tower_fan_brightness': makeHassEntityFixture({
        entityId: 'switch.xiaomi_smart_tower_fan_brightness',
        state: 'off',
        attributes: {
          friendly_name: 'Xiaomi Smart Tower Fan Brightness',
        },
      }),
    };

    const entityRegistryMap = createRegistryMap([
      { entity_id: 'switch.xiaomi_smart_tower_fan', device_id: 'device-xiaomi-fan' },
      {
        entity_id: 'switch.xiaomi_smart_tower_fan_brightness',
        device_id: 'device-xiaomi-fan',
      },
    ]);

    const indexes = buildDeviceIndexes(entities, entityRegistryMap);

    expect(indexes.primarySwitchEntityIdByDeviceId.get('device-xiaomi-fan')).toBe(
      'switch.xiaomi_smart_tower_fan'
    );
  });
});
