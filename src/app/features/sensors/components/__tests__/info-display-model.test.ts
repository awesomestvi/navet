import { describe, expect, it } from 'vitest';
import type { SensorDevice } from '@/app/types/device.types';
import { buildInfoDisplayModel } from '../info-display-model';

function sensor(overrides: Partial<SensorDevice>): SensorDevice {
  return {
    id: 'sensor.test',
    name: 'Test sensor',
    room: 'Living Room',
    value: '21',
    unit: '°C',
    icon: 'thermometer',
    entityType: 'temperature',
    deviceClass: 'temperature',
    status: 'measurement',
    size: 'small',
    ...overrides,
  };
}

describe('info display model', () => {
  it('normalizes numeric, timestamp, pressure, and binary sensor display data', () => {
    expect(buildInfoDisplayModel(sensor({ value: '21.8', unit: '°C' }))).toEqual(
      expect.objectContaining({
        title: 'Test sensor',
        eyebrow: 'Temperature',
        value: '21.8',
        unit: '°C',
        tone: 'red',
      })
    );

    expect(
      buildInfoDisplayModel(
        sensor({
          id: 'sensor.sun_next_setting',
          name: 'Sun Next setting',
          value: '19:29',
          unit: '',
          entityType: 'timestamp',
          deviceClass: 'timestamp',
          icon: 'gauge',
        })
      )
    ).toEqual(expect.objectContaining({ value: '19:29', unit: '', icon: 'gauge' }));

    expect(
      buildInfoDisplayModel(
        sensor({
          id: 'sensor.outdoor_pressure',
          name: 'Outdoor Pressure',
          value: '1009',
          unit: 'hPa',
          entityType: 'pressure',
          deviceClass: 'pressure',
          icon: 'gauge',
        })
      )
    ).toEqual(expect.objectContaining({ eyebrow: 'Pressure', value: '1009', unit: 'hPa' }));

    expect(
      buildInfoDisplayModel(
        sensor({
          id: 'binary_sensor.bedroom_window',
          name: 'Bedroom Window',
          value: 'Open',
          unit: '',
          entityType: 'window',
          deviceClass: 'window',
          icon: 'window',
          status: 'active',
        })
      )
    ).toEqual(expect.objectContaining({ value: 'Open', status: 'active', tone: 'amber' }));
  });
});
