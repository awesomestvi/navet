import { afterEach, describe, expect, it, vi } from 'vitest';
import { loadDemoEnergyHistory } from './demo-energy-history';

describe('demo Energy history', () => {
  afterEach(() => vi.useRealTimers());

  it('supplies a full day of five-minute usage and stable device breakdowns', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-13T12:00:00Z'));
    const request = {
      startTime: '2026-09-12T00:00:00Z',
      endTime: '2026-09-13T00:00:00Z',
      period: '5minute' as const,
      types: ['mean' as const],
      entityIds: ['sensor.whole_home_power', 'sensor.hvac_power'],
    };
    const history = await loadDemoEnergyHistory(request);
    const reordered = await loadDemoEnergyHistory({
      ...request,
      entityIds: [...request.entityIds].reverse(),
    });
    expect(history['sensor.whole_home_power']).toHaveLength(288);
    expect(
      history['sensor.whole_home_power'].every((point) => point.endMs - point.startMs === 300_000)
    ).toBe(true);
    expect(history['sensor.hvac_power']).toEqual(reordered['sensor.hvac_power']);
    expect(history['sensor.hvac_power'].every((point) => (point.mean ?? 0) > 0)).toBe(true);
  });

  it('leaves future periods empty and clips the current interval to now', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-13T00:07:00Z'));
    const history = await loadDemoEnergyHistory({
      startTime: '2026-09-13T00:00:00Z',
      endTime: '2026-09-14T00:00:00Z',
      period: '5minute',
      types: ['mean'],
      entityIds: ['sensor.whole_home_power'],
    });
    expect(history['sensor.whole_home_power']).toHaveLength(2);
    expect(history['sensor.whole_home_power'][1].endMs).toBe(Date.now());
    expect(
      await loadDemoEnergyHistory({
        startTime: '2026-09-14T00:00:00Z',
        period: 'day',
        types: ['mean'],
        entityIds: ['sensor.whole_home_power'],
      })
    ).toEqual({});
  });
});
