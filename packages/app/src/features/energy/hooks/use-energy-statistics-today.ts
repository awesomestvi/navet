import { ENERGY_STATISTICS_REFRESH_INTERVAL } from '@navet/app/constants';
import { getIntegrationHistoryMessageClient } from '@navet/app/services/integration-history.service';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getCachedEnergyStatistics } from '../services/energy-statistics-cache';
import { getEnergyStatisticsToday } from '../services/energy-statistics-service';

const REFRESH_MS = ENERGY_STATISTICS_REFRESH_INTERVAL;
const CACHE_TTL_MS = Math.max(30_000, REFRESH_MS - 1_000);

/**
 * Polls HA statistics for today's kWh delta for all configured energy entities.
 * Returns a map of entityId → kWh used today (0 when unavailable).
 * Refreshes every 5 minutes.
 */
interface EnergyStatisticsTodayState {
  hasLoaded: boolean;
  values: Record<string, number>;
}

export function useEnergyStatisticsToday(
  entityIds: string[],
  enabled = true
): EnergyStatisticsTodayState {
  const [todayKWh, setTodayKWh] = useState<Record<string, number>>({});
  const [hasLoaded, setHasLoaded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const entityIdsKey = useMemo(() => JSON.stringify([...entityIds].sort()), [entityIds]);

  useEffect(() => {
    const resolvedEntityIds = JSON.parse(entityIdsKey) as string[];
    if (!enabled || resolvedEntityIds.length === 0) {
      setTodayKWh({});
      setHasLoaded(false);
      return;
    }
    setHasLoaded(false);

    async function fetchStats() {
      const activeMessageClient = getIntegrationHistoryMessageClient('home_assistant');
      if (!activeMessageClient) return;
      try {
        const result = await getCachedEnergyStatistics(
          `today-5minute:${entityIdsKey}`,
          CACHE_TTL_MS,
          () => getEnergyStatisticsToday(activeMessageClient, resolvedEntityIds)
        );
        setTodayKWh(result);
        setHasLoaded(true);
      } catch (error) {
        console.error('[EnergyStatisticsToday] Failed to fetch today stats:', error);
        setHasLoaded(true);
        // Dashboard remains useful without today stats
      }
    }

    void fetchStats();
    timerRef.current = setInterval(() => void fetchStats(), REFRESH_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [enabled, entityIdsKey]);

  return { hasLoaded, values: todayKWh };
}
