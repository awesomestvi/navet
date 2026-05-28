import { useEffect, useMemo, useRef, useState } from 'react';
import { ENERGY_STATISTICS_REFRESH_INTERVAL } from '@/app/constants';
import { useHomeAssistant } from '@/app/hooks';
import { integrationHistoryService } from '@/app/services/integration-history.service';
import { homeAssistantSelectors } from '@/app/stores/selectors';
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

export function useEnergyStatisticsToday(entityIds: string[]): EnergyStatisticsTodayState {
  const [todayKWh, setTodayKWh] = useState<Record<string, number>>({});
  const [hasLoaded, setHasLoaded] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const connection = useHomeAssistant(homeAssistantSelectors.connection);
  const entityIdsKey = useMemo(() => JSON.stringify([...entityIds].sort()), [entityIds]);

  useEffect(() => {
    const resolvedEntityIds = JSON.parse(entityIdsKey) as string[];
    if (resolvedEntityIds.length === 0) {
      setTodayKWh({});
      setHasLoaded(false);
      return;
    }
    setHasLoaded(false);

    async function fetchStats() {
      const activeConnection = connection ?? integrationHistoryService.getActiveConnection();
      if (!activeConnection) return;
      try {
        const result = await getCachedEnergyStatistics(
          `today-5minute:${entityIdsKey}`,
          CACHE_TTL_MS,
          () => getEnergyStatisticsToday(activeConnection, resolvedEntityIds)
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
  }, [connection, entityIdsKey]);

  return { hasLoaded, values: todayKWh };
}
