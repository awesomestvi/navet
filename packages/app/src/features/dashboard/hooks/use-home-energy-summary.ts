import { useProviderEnergyData } from '@navet/app/features/energy/hooks/use-provider-energy-data';
import { useMemo } from 'react';

interface HomeEnergySummary {
  gridImportTodayKWh?: number;
  isConfigured: boolean;
}

export function useHomeEnergySummary(): HomeEnergySummary {
  const { isConfigured, overview } = useProviderEnergyData('now');

  return useMemo(
    () => ({
      isConfigured,
      gridImportTodayKWh: isConfigured ? overview.totals.importTodayKWh : undefined,
    }),
    [isConfigured, overview.totals.importTodayKWh]
  );
}
