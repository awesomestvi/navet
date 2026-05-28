import { useMemo } from 'react';
import type {
  PlatformEnergyNowSnapshot,
  PlatformEnergySourceOption,
} from '@/app/platform/provider-feature-models';
import { useEnergyDashboard } from './use-energy-dashboard';

export function useProviderEnergyNow(): PlatformEnergyNowSnapshot {
  const { overview, currentLoadStatisticId, todayTotalUsageKWh, isConnected, isConfigured } =
    useEnergyDashboard();

  const sourceOptions = useMemo<PlatformEnergySourceOption[]>(() => {
    const options: PlatformEnergySourceOption[] = [
      {
        id: 'home-load',
        name: 'Home',
        currentPowerW: overview.totals.currentLoadW,
        todayUsageKWh: todayTotalUsageKWh,
        trendEntityId: currentLoadStatisticId,
        group: 'home',
      },
    ];

    if (overview.totals.solarTodayKWh > 0 || overview.totals.solarW > 0) {
      options.push({
        id: 'solar',
        name: 'Solar',
        currentPowerW: overview.totals.solarW,
        todayUsageKWh: overview.totals.solarTodayKWh,
        group: 'sources',
      });
    }

    if (overview.totals.importTodayKWh > 0 || overview.totals.importW > 0) {
      options.push({
        id: 'grid-import',
        name: 'Grid import',
        currentPowerW: overview.totals.importW,
        todayUsageKWh: overview.totals.importTodayKWh,
        group: 'sources',
      });
    }

    for (const consumer of overview.topConsumers) {
      options.push({
        id: `device:${consumer.id}`,
        name: consumer.name,
        currentPowerW: consumer.powerW,
        todayUsageKWh: consumer.energyKWh,
        trendEntityId: consumer.powerEntityId,
        group: 'devices',
      });
    }

    return options;
  }, [currentLoadStatisticId, overview, todayTotalUsageKWh]);

  return {
    isConnected,
    isConfigured,
    currentLoadStatisticId,
    todayTotalUsageKWh,
    currentLoadW: overview.totals.currentLoadW,
    solarW: overview.totals.solarW,
    solarTodayKWh: overview.totals.solarTodayKWh,
    importW: overview.totals.importW,
    importTodayKWh: overview.totals.importTodayKWh,
    sourceOptions,
  };
}
