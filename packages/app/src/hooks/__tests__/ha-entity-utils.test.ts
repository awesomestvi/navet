import { calendarEntityFactory } from '@navet/app/test/fixtures/home-assistant/entities/calendar';
import { sensorEntityFactory } from '@navet/app/test/fixtures/home-assistant/entities/sensor';
import { describe, expect, it } from 'vitest';
import {
  formatCalendarTime,
  formatClock,
  formatMetricNumber,
  formatSensorValue,
  formatTimestampTime,
  getName,
} from '../entity-utils';

describe('ha-entity-utils entity naming', () => {
  it('prefers Home Assistant registry names over entity friendly names', () => {
    const entity = sensorEntityFactory({ friendly_name: 'Old kitchen name' });
    entity.entity_id = 'light.kitchen';

    expect(getName(entity, { name: 'Kitchen island' })).toBe('Kitchen island');
  });

  it('falls back to the entity id when Home Assistant does not provide a friendly name', () => {
    const entity = sensorEntityFactory({ friendly_name: undefined });

    expect(getName(entity)).toBe(entity.entity_id);
  });
});

describe('ha-entity-utils time formatting', () => {
  it('formats calendar times from documented Home Assistant date values', () => {
    const entity = calendarEntityFactory({
      start_time: '2026-04-27T13:05:00.000Z',
    });
    const date = new Date(String(entity.attributes.start_time));

    expect(formatCalendarTime(date, 'en-US', true)).toMatch(/^\d{1,2}:\d{2}$/);
    expect(formatCalendarTime(date, 'en-US', false)).toMatch(/^\d{1,2}:\d{2}\s?[AP]M$/);
  });

  it('applies the selected hour preference to clock-style and timestamp values', () => {
    const rawValue = '2026-04-27T06:30:00.000Z';

    expect(formatClock(rawValue, 'en-US', true)).toMatch(/^\d{1,2}:\d{2}$/);
    expect(formatClock(rawValue, 'en-US', false)).toMatch(/^\d{1,2}:\d{2}\s?[AP]M$/);
    expect(formatTimestampTime(rawValue, 'en-US', true)).toMatch(/^\d{1,2}:\d{2}$/);
    expect(formatTimestampTime(rawValue, 'en-US', false)).toMatch(/^\d{1,2}:\d{2}\s?[AP]M$/);
  });
});

describe('ha-entity-utils metric formatting', () => {
  it('formats whole numbers without decimals and fractional numbers with one decimal', () => {
    expect(formatMetricNumber(12)).toBe('12');
    expect(formatMetricNumber(12.34)).toBe('12.3');
  });

  it('formats timestamp sensors as time and pressure sensors as rounded whole numbers', () => {
    const timestampSensor = sensorEntityFactory({ device_class: 'timestamp' });
    timestampSensor.state = '2026-04-27T13:05:00.000Z';

    const pressureSensor = sensorEntityFactory({
      device_class: 'pressure',
      unit_of_measurement: 'hPa',
    });
    pressureSensor.state = '1008.527251';

    expect(formatSensorValue(timestampSensor, { locale: 'en-US', use24HourTime: true })).toEqual({
      value: expect.stringMatching(/^\d{1,2}:\d{2}$/),
      unit: '',
    });

    expect(formatSensorValue(pressureSensor)).toEqual({ value: '1009', unit: 'hPa' });
  });

  it('falls back to native Home Assistant values when state is blank', () => {
    const entity = sensorEntityFactory({
      native_value: 19.5,
      native_unit_of_measurement: '°C',
      unit_of_measurement: undefined,
    });
    entity.state = '';

    expect(formatSensorValue(entity)).toEqual({
      value: '19.5',
      unit: '°C',
    });
  });
});
