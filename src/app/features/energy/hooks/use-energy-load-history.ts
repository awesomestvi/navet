import { useEffect, useRef, useState } from 'react';
import { homeAssistantService } from '@/app/services/home-assistant.service';
import { getPowerStatisticsHistory } from '../services/energy-statistics-service';
import type { EnergySeriesPoint } from '../types/energy.types';

const REFRESH_MS = 5 * 60 * 1000;

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

export function useEnergyLoadHistory(
  entityId: string | undefined,
  fallbackCurrentLoadW: number
): EnergySeriesPoint[] {
  const [points, setPoints] = useState<EnergySeriesPoint[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!entityId) {
      setPoints(
        Array.from({ length: 12 }, (_, index) => ({
          label: index === 11 ? 'Now' : '',
          value: Math.round(fallbackCurrentLoadW),
        }))
      );
      return;
    }

    const resolvedEntityId = entityId;

    async function fetchHistory() {
      const connection = homeAssistantService.getConnection();
      if (!connection) {
        return;
      }

      try {
        const stats = await getPowerStatisticsHistory(connection, resolvedEntityId);
        if (stats.length === 0) {
          setPoints([
            {
              label: 'Now',
              value: Math.round(fallbackCurrentLoadW),
            },
          ]);
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
      } catch {
        setPoints([
          {
            label: 'Now',
            value: Math.round(fallbackCurrentLoadW),
          },
        ]);
      }
    }

    void fetchHistory();
    timerRef.current = setInterval(() => void fetchHistory(), REFRESH_MS);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [entityId, fallbackCurrentLoadW]);

  return points;
}
