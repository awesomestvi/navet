import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearEnergyStatisticsCache, getCachedEnergyStatistics } from '../energy-statistics-cache';

afterEach(() => {
  clearEnergyStatisticsCache();
  vi.restoreAllMocks();
});

describe('getCachedEnergyStatistics', () => {
  it('reuses fresh cached values for matching keys', async () => {
    const fetcher = vi.fn().mockResolvedValue({ today: 4 });

    await expect(
      getCachedEnergyStatistics('periods:sensor.grid', 60_000, fetcher)
    ).resolves.toEqual({ today: 4 });
    await expect(
      getCachedEnergyStatistics('periods:sensor.grid', 60_000, fetcher)
    ).resolves.toEqual({ today: 4 });

    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('dedupes simultaneous requests for matching keys', async () => {
    const fetcher = vi.fn().mockResolvedValue([1, 2, 3]);

    const [first, second] = await Promise.all([
      getCachedEnergyStatistics('history:sensor.load', 60_000, fetcher),
      getCachedEnergyStatistics('history:sensor.load', 60_000, fetcher),
    ]);

    expect(first).toEqual([1, 2, 3]);
    expect(second).toEqual([1, 2, 3]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
