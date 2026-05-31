import type { PlatformEnergyNowSnapshot } from '@navet/app/platform/provider-feature-models';
import { useProviderEnergySnapshot } from './use-provider-energy-snapshot';

export function useProviderEnergyNow(): PlatformEnergyNowSnapshot {
  const snapshot = useProviderEnergySnapshot();

  return {
    currentLoadStatisticId: snapshot.currentLoadStatisticId,
    currentLoadW: snapshot.currentLoadW,
    importTodayKWh: snapshot.importTodayKWh,
    importW: snapshot.importW,
    isConfigured: snapshot.isConfigured,
    isConnected: snapshot.isConnected,
    solarTodayKWh: snapshot.solarTodayKWh,
    solarW: snapshot.solarW,
    sourceOptions: snapshot.sourceOptions,
    todayTotalUsageKWh: snapshot.todayTotalUsageKWh,
  };
}
