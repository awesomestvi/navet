import { useEffect, useRef, useState } from 'react';
import { useHomeAssistant } from '@/app/hooks';
import { homeAssistantService } from '@/app/services/home-assistant.service';
import { homeAssistantSelectors } from '@/app/stores/selectors';
import { getPowerStatisticsHistory } from '../services/energy-statistics-service';
import type { EnergySeriesPoint } from '../types/energy.types';

const REFRESH_MS = 5 * 60 * 1000;
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

function buildFallbackPoints(currentLoadW: number): EnergySeriesPoint[] {
  return Array.from({ length: FALLBACK_POINT_COUNT }, (_, index) => ({
    label: index === FALLBACK_POINT_COUNT - 1 ? 'Now' : '',
    value: Math.round(currentLoadW),
  }));
}

export function useEnergyLoadHistory(
  entityId: string | undefined,
  fallbackCurrentLoadW: number
): EnergySeriesPoint[] {
  const [points, setPoints] = useState<EnergySeriesPoint[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const connection = useHomeAssistant(homeAssistantSelectors.connection);

  useEffect(() => {
    if (!entityId) {
      setPoints(buildFallbackPoints(fallbackCurrentLoadW));
      return;
    }

    const resolvedEntityId = entityId;

    async function fetchHistory() {
      const activeConnection = connection ?? homeAssistantService.getConnection();
      if (!activeConnection) {
        setPoints(buildFallbackPoints(fallbackCurrentLoadW));
        return;
      }

      try {
        const stats = await getPowerStatisticsHistory(activeConnection, resolvedEntityId);
        if (stats.length === 0) {
          setPoints(buildFallbackPoints(fallbackCurrentLoadW));
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
        setPoints(buildFallbackPoints(fallbackCurrentLoadW));
      }
    }

    void fetchHistory();
    timerRef.current = setInterval(() => void fetchHistory(), REFRESH_MS);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [connection, entityId, fallbackCurrentLoadW]);

  return points;
}
