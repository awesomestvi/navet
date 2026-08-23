import { describe, expect, it } from 'vitest';
import {
  buildStatisticsHistoryPoints,
  resolveOverviewStatisticsRange,
} from './use-energy-load-history';

describe('Energy load history', () => {
  it('uses bounded statistics buckets for dashboard ranges', () => {
    expect(resolveOverviewStatisticsRange('today')).toEqual({
      period: 'hour',
      ttlMs: 5 * 60 * 1000,
    });
    expect(resolveOverviewStatisticsRange('week')).toEqual({
      period: 'day',
      ttlMs: 15 * 60 * 1000,
    });
    expect(resolveOverviewStatisticsRange('month')).toEqual({
      period: 'day',
      ttlMs: 30 * 60 * 1000,
    });
  });

  it('maps aggregated statistics directly to chart points', () => {
    const startMs = Date.parse('2026-08-20T00:00:00.000Z');
    const endMs = Date.parse('2026-08-20T01:00:00.000Z');

    expect(
      buildStatisticsHistoryPoints({
        range: 'today',
        points: [{ startMs, endMs, mean: 437, min: 147, max: 3764 }],
      })
    ).toEqual([
      {
        label: expect.any(String),
        value: 437,
        secondaryValue: 0.44,
        timestampMs: startMs,
        endTimestampMs: endMs,
        minValue: 147,
        maxValue: 3764,
      },
    ]);
  });

  it('drops malformed aggregate points instead of fabricating history', () => {
    expect(
      buildStatisticsHistoryPoints({
        range: 'today',
        points: [
          {
            startMs: Date.parse('2026-08-20T00:00:00.000Z'),
            endMs: Date.parse('2026-08-20T01:00:00.000Z'),
          },
        ],
      })
    ).toEqual([]);
  });
});
