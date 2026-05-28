import { useMemo } from 'react';
import type { PlatformEnergySourceDiagnostic } from '@/app/platform/provider-feature-models';
import type { EnergyRange } from '../types/energy.types';
import { buildEnergyDashboardModel } from '../utils/build-energy-dashboard-model';
import { useProviderEnergyData } from './use-provider-energy-data';

function mapEnergySourceDiagnostics(
  diagnostics: Array<{
    id: string;
    label: string;
    entityId?: string;
    liveEntityId?: string;
    status: PlatformEnergySourceDiagnostic['status'];
  }>
): PlatformEnergySourceDiagnostic[] {
  return diagnostics.map((diagnostic) => ({
    id: diagnostic.id,
    label: diagnostic.label,
    entityId: diagnostic.entityId,
    liveEntityId: diagnostic.liveEntityId,
    status: diagnostic.status,
  }));
}

export function useProviderEnergyDashboard(range: EnergyRange) {
  const providerData = useProviderEnergyData(range);
  const dashboard = useMemo(
    () =>
      buildEnergyDashboardModel({
        overview: providerData.overview,
        range,
        trend: providerData.recentLoadTrend,
        periodTotals: providerData.periodTotals,
        sourceConfig: providerData.haSourceConfig,
      }),
    [
      providerData.haSourceConfig,
      providerData.overview,
      providerData.periodTotals,
      providerData.recentLoadTrend,
      range,
    ]
  );
  const sourceDiagnostics = useMemo(
    () => mapEnergySourceDiagnostics(providerData.energySourceDiagnostics),
    [providerData.energySourceDiagnostics]
  );

  return {
    ...providerData,
    dashboard,
    sourceDiagnostics,
  };
}
