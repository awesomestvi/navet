import { useI18n } from '@navet/app/hooks';
import type { TranslateFn } from '@navet/app/i18n';
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
  }>,
  t: TranslateFn
): PlatformEnergySourceOption[] {
  const options: PlatformEnergySourceOption[] = [
    {
      id: 'home-load',
      name: t('energy.model.home'),
      currentPowerW: snapshot.currentLoadW,
      todayUsageKWh: snapshot.todayTotalUsageKWh,
      trendEntityId: snapshot.currentLoadStatisticId,
      group: 'home',
    },
  ];

  if (snapshot.solarTodayKWh > 0 || snapshot.solarW > 0) {
    options.push({
      id: 'solar',
      name: t('energy.model.solar'),
      currentPowerW: snapshot.solarW,
      todayUsageKWh: snapshot.solarTodayKWh,
      group: 'sources',
    });
  }

  if (snapshot.importTodayKWh > 0 || snapshot.importW > 0) {
    options.push({
      id: 'grid-import',
      name: t('energy.stats.gridImport'),
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
  const { t } = useI18n();
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
      sourceOptions: mapEnergySourceOptions(snapshotBase, overview.topConsumers, t),
    };
  }, [
    t,
    currentLoadStatisticId,
    hasEnergyStatisticsLoaded,
    isConfigured,
    isConnected,
    overview,
    sourceDiagnostics,
    todayTotalUsageKWh,
  ]);
}
