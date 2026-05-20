import { describe, expect, it } from 'vitest';
import { formatCalendarTime, formatClock, formatMetricNumber, getName } from '../ha-entity-utils';

describe('ha-entity-utils entity naming', () => {
  it('prefers Home Assistant registry names over cached friendly names', () => {
    expect(
      getName(
        {
          entity_id: 'light.kitchen',
          state: 'on',
          attributes: { friendly_name: 'Old kitchen name' },
        } as never,
        { name: 'Kitchen island' }
      )
    ).toBe('Kitchen island');
  });
});

describe('ha-entity-utils time formatting', () => {
  it('formats calendar times in 24-hour mode when requested', () => {
    const date = new Date('2026-04-27T13:05:00.000Z');

    expect(formatCalendarTime(date, 'en-US', true)).toMatch(/^\d{1,2}:\d{2}$/);
  });

  it('formats calendar times in 12-hour mode when requested', () => {
    const date = new Date('2026-04-27T13:05:00.000Z');

    expect(formatCalendarTime(date, 'en-US', false)).toMatch(/^\d{1,2}:\d{2}\s?[AP]M$/);
  });

  it('applies the same 24-hour preference to clock-style values', () => {
    const rawValue = '2026-04-27T06:30:00.000Z';

    expect(formatClock(rawValue, 'en-US', true)).toMatch(/^\d{1,2}:\d{2}$/);
    expect(formatClock(rawValue, 'en-US', false)).toMatch(/^\d{1,2}:\d{2}\s?[AP]M$/);
  });
});

describe('ha-entity-utils metric formatting', () => {
  it('formats whole numbers without decimals and fractional numbers with one decimal', () => {
    expect(formatMetricNumber(12)).toBe('12');
    expect(formatMetricNumber(12.34)).toBe('12.3');
  });
});
