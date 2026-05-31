import { useMemo } from 'react';
import { HEATING_CATEGORIES } from '../data/energy-constants';
import { useEnergyDashboardStore } from '../stores/energy-dashboard-store';
import type { EnergyDashboardNode } from '../types/energy.types';
import { useProviderEnergyDashboard } from './use-provider-energy-dashboard';

export function useEnergyDashboard() {
  const range = useEnergyDashboardStore((state) => state.range);
  const setRange = useEnergyDashboardStore((state) => state.setRange);
  const selectedNodeId = useEnergyDashboardStore((state) => state.selectedNodeId);
  const setSelectedNodeId = useEnergyDashboardStore((state) => state.setSelectedNodeId);
  const visibleWidgets = useEnergyDashboardStore((state) => state.visibleWidgets);
  const toggleWidgetVisibility = useEnergyDashboardStore((state) => state.toggleWidgetVisibility);
  const {
    batteryDevices,
    currentLoadStatisticId,
    dashboard,
    hasEnergyStatisticsLoaded,
    isConfigured,
    isConnected,
    overview,
    periodTotals,
    recentLoadTrend,
    sourceDiagnostics,
    todayTotalUsageKWh,
  } = useProviderEnergyDashboard(range);

  const heatingConsumers = useMemo(
    () => overview.topConsumers.filter((consumer) => HEATING_CATEGORIES.has(consumer.category)),
    [overview.topConsumers]
  );

  const bathroomToiletConsumers = useMemo(
    () =>
      overview.topConsumers.filter((consumer) => {
        const room = consumer.room?.toLowerCase() ?? '';
        return (
          consumer.category === 'bathroom_heater' ||
          consumer.category === 'floor_heating' ||
          consumer.category === 'toilet_heater' ||
          room.includes('bathroom') ||
          room.includes('toilet')
        );
      }),
    [overview.topConsumers]
  );

  const bathroomToiletTodayKWh = useMemo(
    () => bathroomToiletConsumers.reduce((sum, consumer) => sum + consumer.energyKWh, 0),
    [bathroomToiletConsumers]
  );

  const bathroomToiletPowerW = useMemo(
    () => bathroomToiletConsumers.reduce((sum, consumer) => sum + consumer.powerW, 0),
    [bathroomToiletConsumers]
  );

  const topDeviceTotals = useMemo(() => overview.topConsumers.slice(0, 8), [overview.topConsumers]);

  const gridAllocation = useMemo(() => {
    const measuredTotal = topDeviceTotals.reduce((sum, consumer) => sum + consumer.energyKWh, 0);
    const gridToday = overview.totals.importTodayKWh;

    if (gridToday <= 0 || measuredTotal <= 0) {
      return [];
    }

    const tracked = topDeviceTotals.map((consumer) => ({
      id: consumer.id,
      name: consumer.name,
      kWh: +(gridToday * (consumer.energyKWh / measuredTotal)).toFixed(2),
      share: consumer.energyKWh / measuredTotal,
    }));

    const allocated = tracked.reduce((sum, item) => sum + item.kWh, 0);
    const untrackedKWh = Math.max(0, +(gridToday - allocated).toFixed(2));

    return untrackedKWh > 0
      ? [
          ...tracked,
          {
            id: 'untracked',
            name: 'Untracked / shared loads',
            kWh: untrackedKWh,
            share: gridToday > 0 ? untrackedKWh / gridToday : 0,
          },
        ]
      : tracked;
  }, [overview.totals.importTodayKWh, topDeviceTotals]);

  const visibleWidgetSet = useMemo(() => new Set(visibleWidgets), [visibleWidgets]);

  const selectedNode = useMemo<EnergyDashboardNode | null>(
    () => dashboard.nodes.find((node) => node.id === selectedNodeId) ?? dashboard.nodes[0] ?? null,
    [dashboard.nodes, selectedNodeId]
  );

  return {
    dashboard,
    energySourceDiagnostics: sourceDiagnostics,
    hasEnergyStatisticsLoaded,
    overview,
    range,
    setRange,
    selectedNode,
    setSelectedNodeId,
    visibleWidgetSet,
    toggleWidgetVisibility,
    isConnected,
    isConfigured,
    currentLoadStatisticId,
    heatingConsumers,
    bathroomToiletConsumers,
    bathroomToiletTodayKWh,
    bathroomToiletPowerW,
    topDeviceTotals,
    gridAllocation,
    recentLoadTrend,
    periodTotals,
    todayTotalUsageKWh,
    batteryDevices,
  };
}
