import { describe, expect, it } from 'vitest';
import { formatDaylight } from './time-format';

describe('formatDaylight', () => {
  it('formats daylight duration from same-day sunrise and sunset times', () => {
    expect(formatDaylight('2026-05-30T04:33:00+02:00', '2026-05-30T21:39:00+02:00')).toBe(
      '17 h 6 m'
    );
  });

  it('handles Home Assistant next_rising and next_setting ordering across dates', () => {
    expect(formatDaylight('2026-05-31T04:33:00+02:00', '2026-05-30T21:39:00+02:00')).toBe(
      '17 h 6 m'
    );
  });
});
