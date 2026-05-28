import { useMemo } from 'react';
import { useProviderBatterySensorRows } from '@/app/features/dashboard/components/widgets/use-provider-battery-sensor-rows';
import { useIntegrationStore, useProviderHealth } from '@/app/hooks';
import { integrationSelectors } from '@/app/stores/selectors';
import type { EnergyRange, EnergySeriesPoint } from '../types/energy.types';
import { useEnergyHaData } from './use-energy-ha-data';
import { useEnergyLoadHistory } from './use-energy-load-history';
import { useEnergyStatisticsPeriods } from './use-energy-statistics-periods';

function getTodayUsageFromLoadTrend(points: EnergySeriesPoint[], fallbackKWh: number): number {
  const timestampedPoints = points.filter(
    (point): point is EnergySeriesPoint & { timestampMs: number } =>
      typeof point.timestampMs === 'number' && Number.isFinite(point.timestampMs)
  );

  if (timestampedPoints.length === 0) {
    return fallbackKWh;
  }

  const nowMs = Date.now();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTodayMs = startOfToday.getTime();

  let wattHours = 0;

  for (const [index, point] of timestampedPoints.entries()) {
    const startMs = point.timestampMs;
    const nextStartMs = timestampedPoints[index + 1]?.timestampMs;
    const endMs =
      typeof point.endTimestampMs === 'number' && point.endTimestampMs > startMs
        ? point.endTimestampMs
        : typeof nextStartMs === 'number' && nextStartMs > startMs
          ? nextStartMs
          : startMs + 5 * 60 * 1000;

    const clippedStartMs = Math.max(startMs, startOfTodayMs);
    const clippedEndMs = Math.min(endMs, nowMs);

    if (clippedEndMs <= clippedStartMs) {
      continue;
    }

    const durationHours = (clippedEndMs - clippedStartMs) / (60 * 60 * 1000);
    wattHours += Math.max(0, point.value) * durationHours;
  }

  return wattHours > 0 ? +(wattHours / 1000).toFixed(2) : fallbackKWh;
}

export function useProviderEnergyData(range: EnergyRange) {
  const currentProviderId = useIntegrationStore(integrationSelectors.currentProviderId);
  const isHomeAssistantProvider = currentProviderId === 'home_assistant';
  const providerHealth = useProviderHealth(currentProviderId);
  const batteryDevices = useProviderBatterySensorRows();
  const {
    energySourceDiagnostics,
    hasEnergyStatisticsLoaded,
    overview,
    isConfigured,
    currentLoadStatisticId,
    haSourceConfig,
  } = useEnergyHaData(range, isHomeAssistantProvider);
  const recentLoadTrend = useEnergyLoadHistory(
    currentLoadStatisticId,
    overview.totals.currentLoadW,
    isHomeAssistantProvider
  );
  const periodTotals = useEnergyStatisticsPeriods(
    haSourceConfig?.gridImportEnergyEntityId,
    isHomeAssistantProvider
  );
  const todayTotalUsageKWh = useMemo(
    () => getTodayUsageFromLoadTrend(recentLoadTrend, periodTotals.today),
    [periodTotals.today, recentLoadTrend]
  );
  const isConnected = providerHealth.connected;

  return {
    batteryDevices,
    currentLoadStatisticId,
    energySourceDiagnostics,
    haSourceConfig,
    hasEnergyStatisticsLoaded,
    isConfigured,
    isConnected,
    overview,
    periodTotals,
    recentLoadTrend,
    todayTotalUsageKWh,
  };
}
