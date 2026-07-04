import { describe, expect, it } from 'vitest';
import {
  formatBinarySensorState,
  getSensorDeviceClass,
  inferSensorDisplayIcon,
} from '../map-sensor-device';

describe('sensor display helpers', () => {
  it('reads normalized sensor device classes from entity snapshots', () => {
    expect(getSensorDeviceClass({ attributes: { device_class: 'Temperature' } })).toBe(
      'temperature'
    );
    expect(getSensorDeviceClass({ attributes: { device_class: 42 } })).toBeUndefined();
  });

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
    expect(formatBinarySensorState('unknown', 'motion')).toEqual({
      value: 'unknown',
      isActive: false,
    });
  });

  it('infers display icons from device classes and unit fallbacks', () => {
    expect(inferSensorDisplayIcon('sensor.room_temperature', 'temperature', '°C')).toBe(
      'thermometer'
    );
    expect(inferSensorDisplayIcon('sensor.co2', 'carbon_dioxide', 'ppm')).toBe('wind');
    expect(inferSensorDisplayIcon('binary_sensor.front_window', 'window', '')).toBe('window');
    expect(inferSensorDisplayIcon('binary_sensor.water_leak', 'moisture', '')).toBe('droplets');
    expect(inferSensorDisplayIcon('sensor.grid_power', undefined, 'W')).toBe('zap');
  });
});
