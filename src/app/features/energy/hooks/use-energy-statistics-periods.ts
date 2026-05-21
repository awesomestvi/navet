import { useEffect, useRef, useState } from 'react';
import { ENERGY_STATISTICS_REFRESH_INTERVAL } from '@/app/constants';
import { useHomeAssistant } from '@/app/hooks';
import { homeAssistantService } from '@/app/services/home-assistant.service';
import { homeAssistantSelectors } from '@/app/stores/selectors';
import { getCachedEnergyStatistics } from '../services/energy-statistics-cache';
import { getEnergyStatisticsPeriods } from '../services/energy-statistics-service';

const REFRESH_MS = ENERGY_STATISTICS_REFRESH_INTERVAL;
const CACHE_TTL_MS = Math.max(30_000, REFRESH_MS - 1_000);

interface EnergyPeriodTotals {
  today: number;
  week: number;
  month: number;
}

export function useEnergyStatisticsPeriods(entityId?: string): EnergyPeriodTotals {
  const [totals, setTotals] = useState<EnergyPeriodTotals>({ today: 0, week: 0, month: 0 });
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const connection = useHomeAssistant(homeAssistantSelectors.connection);

  useEffect(() => {
    if (!entityId) {
      setTotals({ today: 0, week: 0, month: 0 });
      return;
    }
    const statisticId = entityId;

    async function fetchStats() {
      const activeConnection = connection ?? homeAssistantService.getConnection();
      if (!activeConnection) return;
      try {
        const result = await getCachedEnergyStatistics(`periods:${statisticId}`, CACHE_TTL_MS, () =>
          getEnergyStatisticsPeriods(activeConnection, statisticId)
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
  }, [connection, entityId]);

  return totals;
}
