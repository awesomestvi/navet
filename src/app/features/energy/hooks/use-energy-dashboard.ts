import { useMemo, useState } from 'react';
import { useHomeAssistant } from '@/app/hooks';
import {
  haBatterySensorRowsEqual,
  selectBatterySensorRowsFromHa,
} from '@/app/hooks/ha-battery-sensor-rows';
import { homeAssistantSelectors } from '@/app/stores/selectors';
import { HEATING_CATEGORIES } from '../data/energy-constants';
import { useEnergyDashboardStore } from '../stores/energy-dashboard-store';
import type { EnergySeriesPoint, EnergySourceConfig } from '../types/energy.types';
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

export function useEnergyDashboard() {
  const range = useEnergyDashboardStore((state) => state.range);
  const setRange = useEnergyDashboardStore((state) => state.setRange);
  const selectedNodeId = useEnergyDashboardStore((state) => state.selectedNodeId);
  const setSelectedNodeId = useEnergyDashboardStore((state) => state.setSelectedNodeId);
  const visibleWidgets = useEnergyDashboardStore((state) => state.visibleWidgets);
  const toggleWidgetVisibility = useEnergyDashboardStore((state) => state.toggleWidgetVisibility);
  const sourceConfig = useEnergyDashboardStore((state) => state.sourceConfig);
  const setSourceConfig = useEnergyDashboardStore((state) => state.setSourceConfig);
  const clearSourceConfig = useEnergyDashboardStore((state) => state.clearSourceConfig);
  const isConnected = useHomeAssistant(homeAssistantSelectors.connected);
  const batteryDevices = useHomeAssistant(selectBatterySensorRowsFromHa, haBatterySensorRowsEqual);

  const [showSetup, setShowSetup] = useState(false);

  const { overview, isConfigured, currentLoadStatisticId } = useEnergyHaData(range);
  const recentLoadTrend = useEnergyLoadHistory(
    currentLoadStatisticId,
    overview.totals.currentLoadW
  );
  const periodTotals = useEnergyStatisticsPeriods(sourceConfig?.gridImportEnergyEntityId);
  const todayTotalUsageKWh = useMemo(
    () => getTodayUsageFromLoadTrend(recentLoadTrend, periodTotals.today),
    [recentLoadTrend, periodTotals.today]
  );

  const selectedNode = useMemo(
    () => overview.nodes.find((node) => node.id === selectedNodeId) ?? overview.nodes[0] ?? null,
    [overview.nodes, selectedNodeId]
  );

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

  function handleSaveConfig(config: EnergySourceConfig) {
    setSourceConfig(config);
    setShowSetup(false);
  }

  return {
    overview,
    range,
    setRange,
    selectedNode,
    setSelectedNodeId,
    visibleWidgetSet,
    toggleWidgetVisibility,
    isConnected,
    isConfigured,
    sourceConfig,
    currentLoadStatisticId,
    showSetup,
    openSetup: () => setShowSetup(true),
    closeSetup: () => setShowSetup(false),
    handleSaveConfig,
    clearSourceConfig,
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
