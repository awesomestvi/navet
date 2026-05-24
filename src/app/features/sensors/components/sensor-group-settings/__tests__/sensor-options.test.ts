import type { HassEntities, HassEntity } from 'home-assistant-js-websocket';
import { describe, expect, it } from 'vitest';
import { buildAvailableSensorOptions, resolveSensorReadings } from '../sensor-options';

function entity(
  entityId: string,
  state: string,
  attributes: HassEntity['attributes'] = {}
): HassEntity {
  return {
    entity_id: entityId,
    state,
    attributes,
    context: { id: 'context', parent_id: null, user_id: null },
    last_changed: '2026-05-21T00:00:00.000Z',
    last_updated: '2026-05-21T00:00:00.000Z',
  };
}

describe('sensor group options', () => {
  it('builds searchable options from Home Assistant sensor entities only', () => {
    const entities: HassEntities = {
      'sensor.kitchen_temperature': entity('sensor.kitchen_temperature', '21.4', {
        friendly_name: 'Kitchen Temperature',
        device_class: 'temperature',
        unit_of_measurement: '°C',
      }),
      'sensor.grid_power': entity('sensor.grid_power', '742', {
        friendly_name: 'Grid Power',
        device_class: 'power',
        unit_of_measurement: 'W',
      }),
      'sensor.outdoor_pressure': entity('sensor.outdoor_pressure', '1008.527251', {
        friendly_name: 'Outdoor Pressure',
        device_class: 'pressure',
        unit_of_measurement: 'hPa',
      }),
      'light.kitchen': entity('light.kitchen', 'on', {
        friendly_name: 'Kitchen Light',
      }),
    };

    const options = buildAvailableSensorOptions({
      entities,
      areas: [{ area_id: 'kitchen', name: 'Kitchen' }],
      entityRegistry: [
        {
          entity_id: 'sensor.kitchen_temperature',
          area_id: 'kitchen',
        },
      ],
    });

    expect(options.map((option) => option.id).sort()).toEqual([
      'sensor.grid_power',
      'sensor.kitchen_temperature',
      'sensor.outdoor_pressure',
    ]);
    expect(options.find((option) => option.id === 'sensor.kitchen_temperature')).toMatchObject({
      label: 'Kitchen Temperature',
      value: '21.4',
      unit: '°C',
      icon: 'thermometer',
      category: 'climate',
      room: 'Kitchen',
    });
    expect(options.find((option) => option.id === 'sensor.grid_power')).toMatchObject({
      icon: 'zap',
      category: 'energy',
    });
    expect(options.find((option) => option.id === 'sensor.outdoor_pressure')).toMatchObject({
      value: '1009',
      unit: 'hPa',
      category: 'environmental',
    });
  });

  it('resolves selected entity ids to live readings and retains missing sensors', () => {
    const readings = resolveSensorReadings({
      entities: {
        'sensor.co2': entity('sensor.co2', 'unavailable', {
          friendly_name: 'CO2',
          device_class: 'carbon_dioxide',
          unit_of_measurement: 'ppm',
        }),
      },
      sensorEntityIds: ['sensor.co2', 'sensor.removed'],
      fallbackSensors: [
        {
          id: 'sensor.removed',
          label: 'Removed sensor',
          value: '42',
          unit: '%',
          icon: 'droplets',
        },
      ],
    });

    expect(readings).toEqual([
      {
        id: 'sensor.co2',
        label: 'CO2',
        value: 'unavailable',
        unit: 'ppm',
        icon: 'wind',
      },
      {
        id: 'sensor.removed',
        label: 'Removed sensor',
        value: '42',
        unit: '%',
        icon: 'droplets',
      },
    ]);
  });

  it('formats selected sensor readings with the same value utility as single sensor cards', () => {
    const readings = resolveSensorReadings({
      entities: {
        'sensor.sun_next_setting': entity('sensor.sun_next_setting', '2026-05-24T19:29:58+00:00', {
          friendly_name: 'Sun Next setting',
          device_class: 'timestamp',
        }),
        'sensor.outdoor_pressure': entity('sensor.outdoor_pressure', '1008.527251', {
          friendly_name: 'Outdoor Pressure',
          device_class: 'pressure',
          unit_of_measurement: 'hPa',
        }),
      },
      sensorEntityIds: ['sensor.sun_next_setting', 'sensor.outdoor_pressure'],
      formatOptions: { locale: 'en-US', use24HourTime: true },
    });

    expect(readings).toEqual([
      expect.objectContaining({
        id: 'sensor.sun_next_setting',
        value: expect.stringMatching(/^\d{1,2}:\d{2}$/),
        unit: '',
      }),
      expect.objectContaining({
        id: 'sensor.outdoor_pressure',
        value: '1009',
        unit: 'hPa',
      }),
    ]);
  });
});
