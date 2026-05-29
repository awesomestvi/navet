import { useEffect, useRef, useState } from 'react';
import { ENERGY_STATISTICS_REFRESH_INTERVAL } from '@/app/constants';
import {
  getIntegrationHistoryMessageClient,
  supportsIntegrationEnergyStatistics,
} from '@/app/services/integration-history.service';
import { getCachedEnergyStatistics } from '../services/energy-statistics-cache';
import { getPowerStatisticsHistory } from '../services/energy-statistics-service';
import type { EnergySeriesPoint } from '../types/energy.types';

const REFRESH_MS = ENERGY_STATISTICS_REFRESH_INTERVAL;
const CACHE_TTL_MS = Math.max(30_000, REFRESH_MS - 1_000);
const FALLBACK_POINT_COUNT = 12;

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
  enabled = true
): EnergySeriesPoint[] {
  const [points, setPoints] = useState<EnergySeriesPoint[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const supportsStatistics = supportsIntegrationEnergyStatistics(entityId);

  useEffect(() => {
    const fallbackSeedKey = entityId ?? `load:${Math.round(fallbackCurrentLoadW)}`;

    if (!enabled || !supportsStatistics || !entityId) {
      setPoints(buildFallbackPoints(fallbackCurrentLoadW, fallbackSeedKey));
      return;
    }

    const resolvedEntityId = entityId;

    async function fetchHistory() {
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

    void fetchHistory();
    timerRef.current = setInterval(() => void fetchHistory(), REFRESH_MS);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [enabled, entityId, fallbackCurrentLoadW, supportsStatistics]);

  return points;
}
