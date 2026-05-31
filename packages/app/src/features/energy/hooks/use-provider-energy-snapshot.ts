import type {
  PlatformEnergyNowSnapshot,
  PlatformEnergySnapshot,
  PlatformEnergySourceOption,
} from '@navet/app/platform/provider-feature-models';
import { useMemo } from 'react';
import { useProviderEnergyDashboard } from './use-provider-energy-dashboard';

function mapEnergySourceOptions(
  snapshot: Pick<
    PlatformEnergyNowSnapshot,
    | 'currentLoadStatisticId'
    | 'currentLoadW'
    | 'todayTotalUsageKWh'
    | 'solarW'
    | 'solarTodayKWh'
    | 'importW'
    | 'importTodayKWh'
  >,
  topConsumers: Array<{
    id: string;
    name: string;
    powerW: number;
    energyKWh: number;
    powerEntityId?: string;
  }>
): PlatformEnergySourceOption[] {
  const options: PlatformEnergySourceOption[] = [
    {
      id: 'home-load',
      name: 'Home',
      currentPowerW: snapshot.currentLoadW,
      todayUsageKWh: snapshot.todayTotalUsageKWh,
      trendEntityId: snapshot.currentLoadStatisticId,
      group: 'home',
    },
  ];

  if (snapshot.solarTodayKWh > 0 || snapshot.solarW > 0) {
    options.push({
      id: 'solar',
      name: 'Solar',
      currentPowerW: snapshot.solarW,
      todayUsageKWh: snapshot.solarTodayKWh,
      group: 'sources',
    });
  }

  if (snapshot.importTodayKWh > 0 || snapshot.importW > 0) {
    options.push({
      id: 'grid-import',
      name: 'Grid import',
      currentPowerW: snapshot.importW,
      todayUsageKWh: snapshot.importTodayKWh,
      group: 'sources',
    });
  }

  for (const consumer of topConsumers) {
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
}

export function useProviderEnergySnapshot(): PlatformEnergySnapshot {
  const {
    sourceDiagnostics,
    hasEnergyStatisticsLoaded,
    overview,
    isConfigured,
    currentLoadStatisticId,
    todayTotalUsageKWh,
    isConnected,
  } = useProviderEnergyDashboard('now');

  return useMemo(() => {
    const snapshotBase: Omit<PlatformEnergyNowSnapshot, 'sourceOptions'> = {
      isConnected,
      isConfigured,
      currentLoadStatisticId,
      todayTotalUsageKWh,
      currentLoadW: overview.totals.currentLoadW,
      solarW: overview.totals.solarW,
      solarTodayKWh: overview.totals.solarTodayKWh,
      importW: overview.totals.importW,
      importTodayKWh: overview.totals.importTodayKWh,
    };

    return {
      ...snapshotBase,
      hasLoaded: hasEnergyStatisticsLoaded,
      sourceDiagnostics,
      sourceOptions: mapEnergySourceOptions(snapshotBase, overview.topConsumers),
    };
  }, [
    currentLoadStatisticId,
    hasEnergyStatisticsLoaded,
    isConfigured,
    isConnected,
    overview,
    sourceDiagnostics,
    todayTotalUsageKWh,
  ]);
}
