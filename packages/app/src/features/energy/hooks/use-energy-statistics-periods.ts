import { ENERGY_STATISTICS_REFRESH_INTERVAL } from '@navet/app/constants';
import {
  getIntegrationHistoryMessageClient,
  supportsIntegrationEnergyStatistics,
} from '@navet/app/services/integration-history.service';
import { useEffect, useRef, useState } from 'react';
import { getCachedEnergyStatistics } from '../services/energy-statistics-cache';
import { getEnergyStatisticsPeriods } from '../services/energy-statistics-service';

const REFRESH_MS = ENERGY_STATISTICS_REFRESH_INTERVAL;
const CACHE_TTL_MS = Math.max(30_000, REFRESH_MS - 1_000);

interface EnergyPeriodTotals {
  today: number;
  week: number;
  month: number;
}

export function useEnergyStatisticsPeriods(entityId?: string, enabled = true): EnergyPeriodTotals {
  const [totals, setTotals] = useState<EnergyPeriodTotals>({ today: 0, week: 0, month: 0 });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const supportsStatistics = supportsIntegrationEnergyStatistics(entityId);

  useEffect(() => {
    if (!enabled || !supportsStatistics || !entityId) {
      setTotals({ today: 0, week: 0, month: 0 });
      return;
    }
    const statisticId = entityId;

    async function fetchStats() {
      const activeMessageClient = getIntegrationHistoryMessageClient(entityId);
      if (!activeMessageClient) return;
      try {
        const result = await getCachedEnergyStatistics(
          `periods-5minute-today:${statisticId}`,
          CACHE_TTL_MS,
          () => getEnergyStatisticsPeriods(activeMessageClient, statisticId)
        );
        setTotals(result);
      } catch (error) {
        console.error('[EnergyStatisticsPeriods] Failed to fetch statistics:', error);
        // Keep previous values if statistics are unavailable
      }
    }

    void fetchStats();
    timerRef.current = setInterval(() => void fetchStats(), REFRESH_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [enabled, entityId, supportsStatistics]);

  return totals;
}
