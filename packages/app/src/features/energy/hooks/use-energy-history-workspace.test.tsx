import type { PlatformStatisticsHistoryRequest } from '@navet/app/platform/provider-feature-models';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearEnergyStatisticsCache } from '../services/energy-statistics-cache';
import type { EnergyConsumer } from '../types/energy.types';
import { useEnergyHistoryWorkspace } from './use-energy-history-workspace';

const DAY_MS = 24 * 60 * 60 * 1000;
const consumers: EnergyConsumer[] = [
  {
    id: 'kitchen-heater',
    name: 'Kitchen heater',
    category: 'other',
    powerEntityId: 'sensor.kitchen_power',
    powerW: 0,
    energyKWh: 0,
    shareOfLoad: 0,
    costToday: 0,
    status: 'idle',
    room: 'Kitchen',
  },
];

afterEach(() => {
  clearEnergyStatisticsCache();
});

describe('useEnergyHistoryWorkspace', () => {
  it('loads whole-home statistics first and device statistics only for a selected bucket', async () => {
    const statisticsLoader = vi.fn(async (request: PlatformStatisticsHistoryRequest) => {
      const startMs = Date.parse(request.startTime);
      const requestedEndMs = request.endTime ? Date.parse(request.endTime) : startMs + DAY_MS;
      const endMs = Math.min(requestedEndMs, startMs + DAY_MS);

      return Object.fromEntries(
        request.entityIds.map((entityId) => [
          entityId,
          [
            {
              startMs,
              endMs,
              mean: entityId === 'sensor.house_power' ? 1000 : 250,
              min: entityId === 'sensor.house_power' ? 200 : 100,
              max: entityId === 'sensor.house_power' ? 1800 : 500,
            },
          ],
        ])
      );
    });

    const { result, rerender } = renderHook(
      ({ selectedBucketIndex }: { selectedBucketIndex: number | null }) =>
        useEnergyHistoryWorkspace({
          currentLoadStatisticId: 'sensor.house_power',
          consumers,
          range: 'month',
          selectedBucketIndex,
          enabled: true,
          statisticsLoader,
        }),
      { initialProps: { selectedBucketIndex: null as number | null } }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(statisticsLoader).toHaveBeenCalledTimes(2);
    expect(statisticsLoader.mock.calls.map(([request]) => request.entityIds)).toEqual([
      ['sensor.house_power'],
      ['sensor.house_power'],
    ]);
    expect(statisticsLoader.mock.calls[0]?.[0]).toMatchObject({
      period: 'day',
      types: ['mean', 'min', 'max'],
    });
    expect(statisticsLoader.mock.calls[1]?.[0]).toMatchObject({
      period: 'day',
      types: ['mean'],
    });
    expect(result.current.model?.deviceBreakdown).toEqual([]);

    rerender({ selectedBucketIndex: 0 });

    await waitFor(() => expect(result.current.isBreakdownLoading).toBe(false));
    await waitFor(() => expect(statisticsLoader).toHaveBeenCalledTimes(3));
    expect(statisticsLoader.mock.calls[2]?.[0]).toMatchObject({
      entityIds: ['sensor.kitchen_power'],
      period: 'day',
      types: ['mean'],
    });
    expect(result.current.model?.deviceBreakdown[0]?.name).toBe('Kitchen heater');
    expect(result.current.model?.roomBreakdown[0]?.name).toBe('Kitchen');

    const emptyBucketIndex = (result.current.model?.buckets.length ?? 1) - 1;
    rerender({ selectedBucketIndex: emptyBucketIndex });

    await waitFor(() => expect(result.current.model?.selectedBucket?.hasData).toBe(false));
    expect(statisticsLoader).toHaveBeenCalledTimes(3);
  });
});
