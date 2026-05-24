import type { HassEntity } from 'home-assistant-js-websocket';
import { describe, expect, it } from 'vitest';
import {
  formatBinarySensorState,
  inferSensorDisplayIcon,
  mapSensorDevice,
} from '../map-sensor-device';

function entity(
  entityId: string,
  state: string,
  attributes: Record<string, unknown> = {}
): HassEntity {
  return {
    entity_id: entityId,
    state,
    attributes,
    last_changed: '2026-05-24T08:15:00.000Z',
    last_updated: '2026-05-24T08:15:00.000Z',
    context: { id: 'ctx', parent_id: null, user_id: null },
  } as HassEntity;
}

describe('mapSensorDevice', () => {
  it('formats binary sensor states by device class', () => {
    expect(formatBinarySensorState('on', 'motion')).toEqual({
      value: 'Detected',
      isActive: true,
    });
    expect(formatBinarySensorState('off', 'motion')).toEqual({
      value: 'Clear',
      isActive: false,
    });
    expect(formatBinarySensorState('on', 'window')).toEqual({ value: 'Open', isActive: true });
    expect(formatBinarySensorState('off', 'window')).toEqual({ value: 'Closed', isActive: false });
    expect(formatBinarySensorState('on', 'problem')).toEqual({
      value: 'Problem',
      isActive: true,
    });
    expect(formatBinarySensorState('off', 'problem')).toEqual({ value: 'OK', isActive: false });
  });

  it('infers sensor icons from device class and fallback text', () => {
    expect(inferSensorDisplayIcon('sensor.room_temperature', 'temperature', '°C')).toBe(
      'thermometer'
    );
    expect(inferSensorDisplayIcon('sensor.co2', 'carbon_dioxide', 'ppm')).toBe('wind');
    expect(inferSensorDisplayIcon('binary_sensor.front_window', 'window', '')).toBe('window');
    expect(inferSensorDisplayIcon('binary_sensor.water_leak', 'moisture', '')).toBe('droplets');
    expect(inferSensorDisplayIcon('sensor.grid_power', undefined, 'W')).toBe('zap');
  });

  it('maps numeric and binary entities to normal sensor devices', () => {
    expect(
      mapSensorDevice(
        'sensor.living_room_humidity',
        entity('sensor.living_room_humidity', '48', {
          friendly_name: 'Living Room Humidity',
          device_class: 'humidity',
          unit_of_measurement: '%',
        }),
        'Living Room Humidity',
        'Living Room'
      )
    ).toEqual(
      expect.objectContaining({
        id: 'sensor.living_room_humidity',
        value: '48',
        unit: '%',
        icon: 'droplets',
        status: 'measurement',
      })
    );

    expect(
      mapSensorDevice(
        'binary_sensor.bathroom_leak',
        entity('binary_sensor.bathroom_leak', 'off', {
          friendly_name: 'Bathroom Leak',
          device_class: 'moisture',
        }),
        'Bathroom Leak',
        'Bathroom'
      )
    ).toEqual(
      expect.objectContaining({
        id: 'binary_sensor.bathroom_leak',
        value: 'Clear',
        unit: '',
        icon: 'droplets',
        status: 'clear',
      })
    );
  });

  it('formats timestamp and pressure sensor values for card display', () => {
    expect(
      mapSensorDevice(
        'sensor.sun_next_setting',
        entity('sensor.sun_next_setting', '2026-05-24T19:29:58+00:00', {
          friendly_name: 'Sun Next setting',
          device_class: 'timestamp',
        }),
        'Sun Next setting',
        'Unassigned',
        { locale: 'en-US', use24HourTime: true }
      )
    ).toEqual(
      expect.objectContaining({
        value: expect.stringMatching(/^\d{1,2}:\d{2}$/),
        unit: '',
      })
    );

    expect(
      mapSensorDevice(
        'sensor.outdoor_pressure',
        entity('sensor.outdoor_pressure', '1008.527251', {
          friendly_name: 'Outdoor Pressure',
          device_class: 'pressure',
          unit_of_measurement: 'hPa',
        }),
        'Outdoor Pressure',
        'Outdoor'
      )
    ).toEqual(
      expect.objectContaining({
        value: '1009',
        unit: 'hPa',
      })
    );
  });
});
