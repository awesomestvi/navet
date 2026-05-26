import { describe, expect, it } from 'vitest';
import {
  binarySensorEntityFactory,
  binarySensorEntityFixtures,
} from '@/test/fixtures/home-assistant/entities/binary-sensor';
import {
  sensorEntityFactory,
  sensorEntityFixtures,
} from '@/test/fixtures/home-assistant/entities/sensor';
import {
  formatBinarySensorState,
  inferSensorDisplayIcon,
  mapSensorDevice,
} from '../map-sensor-device';

describe('mapSensorDevice', () => {
  it('formats documented binary sensor states by device class', () => {
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
    expect(formatBinarySensorState('unknown', 'motion')).toEqual({
      value: 'unknown',
      isActive: false,
    });
  });

  it('infers display icons from Home Assistant device classes and unit fallbacks', () => {
    expect(inferSensorDisplayIcon('sensor.room_temperature', 'temperature', '°C')).toBe(
      'thermometer'
    );
    expect(inferSensorDisplayIcon('sensor.co2', 'carbon_dioxide', 'ppm')).toBe('wind');
    expect(inferSensorDisplayIcon('binary_sensor.front_window', 'window', '')).toBe('window');
    expect(inferSensorDisplayIcon('binary_sensor.water_leak', 'moisture', '')).toBe('droplets');
    expect(inferSensorDisplayIcon('sensor.grid_power', undefined, 'W')).toBe('zap');
  });

  it('maps numeric and binary entities to user-visible sensor devices', () => {
    const humidity = sensorEntityFactory({
      friendly_name: 'Living Room Humidity',
      device_class: 'humidity',
      unit_of_measurement: '%',
    });
    humidity.entity_id = 'sensor.living_room_humidity';
    humidity.state = '48';

    const leak = binarySensorEntityFactory({
      friendly_name: 'Bathroom Leak',
      device_class: 'moisture',
    });
    leak.entity_id = 'binary_sensor.bathroom_leak';
    leak.state = 'off';

    expect(
      mapSensorDevice(humidity.entity_id, humidity, 'Living Room Humidity', 'Living Room')
    ).toEqual(
      expect.objectContaining({
        id: 'sensor.living_room_humidity',
        value: '48',
        unit: '%',
        icon: 'droplets',
        status: 'measurement',
      })
    );

    expect(mapSensorDevice(leak.entity_id, leak, 'Bathroom Leak', 'Bathroom')).toEqual(
      expect.objectContaining({
        id: 'binary_sensor.bathroom_leak',
        value: 'Clear',
        unit: '',
        icon: 'droplets',
        status: 'clear',
      })
    );
  });

  it('marks unknown and unavailable Home Assistant states as unavailable', () => {
    const unknownSensor = sensorEntityFixtures.unknown;
    const unavailableBinary = binarySensorEntityFixtures.unavailable;

    expect(
      mapSensorDevice(unknownSensor.entity_id, unknownSensor, 'Kitchen Temperature', 'Kitchen')
    ).toEqual(
      expect.objectContaining({
        value: 'unknown',
        status: 'unavailable',
      })
    );

    expect(
      mapSensorDevice(
        unavailableBinary.entity_id,
        unavailableBinary,
        'Front Door Motion',
        'Entrance'
      )
    ).toEqual(
      expect.objectContaining({
        value: 'unavailable',
        status: 'unavailable',
      })
    );
  });

  it('formats timestamp and pressure values using documented sensor conventions', () => {
    const timestampSensor = sensorEntityFactory({
      friendly_name: 'Sun Next Setting',
      device_class: 'timestamp',
    });
    timestampSensor.entity_id = 'sensor.sun_next_setting';
    timestampSensor.state = '2026-05-24T19:29:58+00:00';

    const pressureSensor = sensorEntityFactory({
      friendly_name: 'Outdoor Pressure',
      device_class: 'pressure',
      unit_of_measurement: 'hPa',
    });
    pressureSensor.entity_id = 'sensor.outdoor_pressure';
    pressureSensor.state = '1008.527251';

    expect(
      mapSensorDevice(
        timestampSensor.entity_id,
        timestampSensor,
        'Sun Next Setting',
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
      mapSensorDevice(pressureSensor.entity_id, pressureSensor, 'Outdoor Pressure', 'Outdoor')
    ).toEqual(
      expect.objectContaining({
        value: '1009',
        unit: 'hPa',
      })
    );
  });
});
