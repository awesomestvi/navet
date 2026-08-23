import { ENERGY_STATISTICS_REFRESH_INTERVAL } from '@navet/app/constants';
import type { PlatformStatisticsHistoryPoint } from '@navet/app/platform/provider-feature-models';
import {
  getIntegrationHistoryMessageClient,
  getIntegrationStatisticsHistory,
  supportsIntegrationEnergyStatistics,
  supportsIntegrationStatisticsHistory,
} from '@navet/app/services/integration-history.service';
import { settingsSelectors } from '@navet/app/stores/selectors';
import { useSettingsStore } from '@navet/app/stores/settings-store';
import { detectDeviceTier } from '@navet/app/utils/detect-device-tier';
import { subscribeVisibilityAwareAsyncTask } from '@navet/app/utils/visibility-aware-scheduler';
import { useEffect, useState } from 'react';
import { resolveDashboardPerformanceProfile } from '../../dashboard/hooks/use-dashboard-performance-mode';
import { getCachedEnergyStatistics } from '../services/energy-statistics-cache';
import { getPowerStatisticsHistory } from '../services/energy-statistics-service';
import type { EnergyRange, EnergySeriesPoint } from '../types/energy.types';

const REFRESH_MS = ENERGY_STATISTICS_REFRESH_INTERVAL;
const CACHE_TTL_MS = Math.max(30_000, REFRESH_MS - 1_000);
const FALLBACK_POINT_COUNT = 12;
const RANGE_CACHE_TTL_MS: Record<Exclude<EnergyRange, 'now'>, number> = {
  today: 5 * 60 * 1000,
  week: 15 * 60 * 1000,
  month: 30 * 60 * 1000,
};

export function resolveOverviewStatisticsRange(range: Exclude<EnergyRange, 'now'>) {
  return {
    period: range === 'today' ? ('hour' as const) : ('day' as const),
    ttlMs: RANGE_CACHE_TTL_MS[range],
  };
}

function getHistoryWindow(range: Exclude<EnergyRange, 'now'>, now = new Date()) {
  const end = new Date(now);
  const start = new Date(now);

  if (range === 'today') {
    start.setHours(0, 0, 0, 0);
  } else {
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (range === 'week' ? 6 : 29));
  }

  return { start, end };
}

function formatRangeBucketLabel(timestampMs: number, range: Exclude<EnergyRange, 'now'>) {
  const date = new Date(timestampMs);
  if (range === 'today') {
    return `${date.getHours().toString().padStart(2, '0')}:00`;
  }
  if (range === 'week') {
    return date.toLocaleDateString(undefined, { weekday: 'short' });
  }
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export function buildStatisticsHistoryPoints({
  points,
  range,
}: {
  points: PlatformStatisticsHistoryPoint[];
  range: Exclude<EnergyRange, 'now'>;
}): EnergySeriesPoint[] {
  return points.flatMap((point) => {
    const mean = point.mean;
    if (typeof mean !== 'number' || !Number.isFinite(mean) || mean < 0) return [];
    const durationHours = Math.max(0, point.endMs - point.startMs) / (60 * 60 * 1000);

    return [
      {
        label: formatRangeBucketLabel(point.startMs, range),
        value: Math.round(mean),
        secondaryValue: +((mean * durationHours) / 1000).toFixed(2),
        timestampMs: point.startMs,
        endTimestampMs: point.endMs,
        minValue: Math.round(point.min ?? mean),
        maxValue: Math.round(point.max ?? mean),
      },
    ];
  });
}

function formatBucketLabel(timestampMs: number, index: number, total: number) {
  if (index === total - 1) {
    return 'Now';
  }

  const date = new Date(timestampMs);
  return `${date.getHours().toString().padStart(2, '0')}:${date
    .getMinutes()
    .toString()
    .padStart(2, '0')}`;
}

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededUnit(seed: number, index: number): number {
  const next = Math.imul(seed ^ Math.imul(index + 1, 374761393), 668265263);
  return ((next ^ (next >>> 13)) >>> 0) / 4294967295;
}

function buildFallbackPoints(currentLoadW: number, seedKey: string): EnergySeriesPoint[] {
  if (currentLoadW <= 0) {
    return Array.from({ length: FALLBACK_POINT_COUNT }, (_, index) => ({
      label: index === FALLBACK_POINT_COUNT - 1 ? 'Now' : '',
      value: 0,
    }));
  }

  const seed = hashSeed(seedKey);
  const phase = seededUnit(seed, 0) * Math.PI * 2;
  const amplitude = 0.1 + seededUnit(seed, 1) * 0.14;
  const slope = (seededUnit(seed, 2) - 0.5) * 0.24;
  return Array.from({ length: FALLBACK_POINT_COUNT }, (_, index) => ({
    label: index === FALLBACK_POINT_COUNT - 1 ? 'Now' : '',
    value: Math.max(
      1,
      Math.round(
        currentLoadW *
          (1 +
            Math.sin(phase + index * 0.82) * amplitude +
            Math.cos(phase * 0.7 + index * 0.41) * amplitude * 0.4 +
            slope * (index / (FALLBACK_POINT_COUNT - 1) - 0.5))
      )
    ),
  }));
}

export function useEnergyLoadHistory(
  entityId: string | undefined,
  fallbackCurrentLoadW: number,
  enabled = true,
  range: EnergyRange = 'now'
): EnergySeriesPoint[] {
  const [points, setPoints] = useState<EnergySeriesPoint[]>([]);
  const supportsRecentStatistics = supportsIntegrationEnergyStatistics(entityId);
  const supportsRangeStatistics = supportsIntegrationStatisticsHistory(entityId);
  const effectsQuality = useSettingsStore(settingsSelectors.effectsQuality);
  const lowPowerMode = useSettingsStore(settingsSelectors.lowPowerMode);
  const performanceProfile = resolveDashboardPerformanceProfile({
    activeSection: 'energy',
    deviceTier: detectDeviceTier(),
    effectsQuality,
    isEditMode: false,
    lowPowerMode,
    visibleCardCount: 1,
    visibleDevices: [],
  });

  useEffect(() => {
    const fallbackSeedKey = entityId ?? `load:${Math.round(fallbackCurrentLoadW)}`;

    if (!enabled) {
      setPoints((current) =>
        current.length > 0 || range !== 'now'
          ? current
          : buildFallbackPoints(fallbackCurrentLoadW, fallbackSeedKey)
      );
      return;
    }

    if (!entityId) {
      setPoints(range === 'now' ? buildFallbackPoints(fallbackCurrentLoadW, fallbackSeedKey) : []);
      return;
    }

    const resolvedEntityId = entityId;

    async function fetchHistory() {
      if (range !== 'now') {
        if (!supportsRangeStatistics) {
          setPoints([]);
          return;
        }
        try {
          const window = getHistoryWindow(range);
          const { period, ttlMs } = resolveOverviewStatisticsRange(range);
          const history = await getCachedEnergyStatistics(
            `statistics-history:${resolvedEntityId}:${range}:${period}`,
            ttlMs,
            () =>
              getIntegrationStatisticsHistory({
                entityIds: [resolvedEntityId],
                startTime: window.start.toISOString(),
                endTime: window.end.toISOString(),
                period,
                types: ['mean', 'min', 'max'],
              })
          );
          setPoints(
            buildStatisticsHistoryPoints({ points: history?.[resolvedEntityId] ?? [], range })
          );
        } catch (error) {
          console.error('[EnergyLoadHistory] Failed to fetch aggregated statistics:', error);
          setPoints([]);
        }
        return;
      }

      if (!supportsRecentStatistics) {
        setPoints(buildFallbackPoints(fallbackCurrentLoadW, fallbackSeedKey));
        return;
      }

      const activeMessageClient = getIntegrationHistoryMessageClient(resolvedEntityId);
      if (!activeMessageClient) {
        setPoints(buildFallbackPoints(fallbackCurrentLoadW, fallbackSeedKey));
        return;
      }

      try {
        const stats = await getCachedEnergyStatistics(
          `history:${resolvedEntityId}`,
          CACHE_TTL_MS,
          () => getPowerStatisticsHistory(activeMessageClient, resolvedEntityId)
        );
        if (stats.length === 0) {
          setPoints(buildFallbackPoints(fallbackCurrentLoadW, fallbackSeedKey));
          return;
        }

        setPoints(
          stats.map((entry, index) => ({
            label: formatBucketLabel(entry.start, index, stats.length),
            value: Math.round(entry.mean),
            timestampMs: entry.start,
            endTimestampMs: entry.end,
            minValue: Math.round(entry.min),
            maxValue: Math.round(entry.max),
          }))
        );
      } catch (error) {
        console.error('[EnergyLoadHistory] Failed to fetch history:', error);
        setPoints(buildFallbackPoints(fallbackCurrentLoadW, fallbackSeedKey));
      }
    }

    return subscribeVisibilityAwareAsyncTask(
      fetchHistory,
      performanceProfile.reducePolling ? REFRESH_MS * 2 : REFRESH_MS,
      { runImmediately: true }
    );
  }, [
    enabled,
    entityId,
    fallbackCurrentLoadW,
    performanceProfile.reducePolling,
    range,
    supportsRangeStatistics,
    supportsRecentStatistics,
  ]);

  return points;
}
