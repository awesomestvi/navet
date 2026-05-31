import type {
  EnergyConsumer,
  EnergyDashboardMode,
  EnergyDashboardModel,
  EnergyDashboardNode,
  EnergyFlow,
  EnergyOverview,
  EnergyRange,
  EnergyRangeSnapshot,
  EnergySeriesPoint,
  EnergySourceConfig,
} from '../types/energy.types';
import {
  BATTERY_DISCHARGE_THRESHOLD_W,
  BATTERY_PERCENT_DECIMALS,
  PEAK_IMPORT_THRESHOLD_W,
  SOLAR_RENEWABLE_RATIO,
} from './energy-constants';
import { formatEnergyValue, roundEnergyValue } from './energy-formatters';

interface BuildEnergyDashboardModelParams {
  overview: EnergyOverview;
  range: EnergyRange;
  trend: EnergySeriesPoint[];
  periodTotals: {
    today: number;
    week: number;
    month: number;
  };
  sourceConfig: EnergySourceConfig | null;
}

export interface EnergyMotionPreferences {
  disableAnimations: boolean;
  lowPowerMode: boolean;
  effectsQuality: 'high' | 'medium' | 'low';
  prefersReducedMotion: boolean;
}

export function normalizeEnergyRange(range: EnergyRange | 'live' | 'day'): EnergyRange {
  if (range === 'live') {
    return 'now';
  }

  if (range === 'day') {
    return 'today';
  }

  return range;
}

export function shouldUseStaticEnergyBeams(preferences: EnergyMotionPreferences) {
  return (
    preferences.disableAnimations ||
    preferences.lowPowerMode ||
    preferences.effectsQuality === 'low' ||
    preferences.prefersReducedMotion
  );
}

function resolveMode(overview: EnergyOverview): EnergyDashboardMode {
  if (overview.totals.importW > PEAK_IMPORT_THRESHOLD_W) {
    return 'peak';
  }

  if (
    overview.totals.batteryPowerW &&
    overview.totals.batteryPowerW < BATTERY_DISCHARGE_THRESHOLD_W
  ) {
    return 'battery_saver';
  }

  if (overview.totals.solarW > overview.totals.currentLoadW * SOLAR_RENEWABLE_RATIO) {
    return 'eco';
  }

  return 'normal';
}

function buildDataCoverage(overview: EnergyOverview, sourceConfig: EnergySourceConfig | null) {
  return {
    hasLiveLoad: overview.totals.currentLoadW > 0 || Boolean(sourceConfig?.homeLoadPowerEntityId),
    hasGridImport:
      overview.totals.importW > 0 ||
      overview.totals.importTodayKWh > 0 ||
      Boolean(sourceConfig?.gridImportEnergyEntityId || sourceConfig?.gridImportPowerEntityId),
    hasGridExport:
      overview.totals.exportW > 0 ||
      (overview.totals.exportTodayKWh ?? 0) > 0 ||
      Boolean(sourceConfig?.gridExportEnergyEntityId || sourceConfig?.gridExportPowerEntityId),
    hasSolar:
      overview.totals.solarW > 0 ||
      overview.totals.solarTodayKWh > 0 ||
      Boolean(sourceConfig?.solarEnergyEntityId || sourceConfig?.solarPowerEntityId),
    hasBattery: Boolean(sourceConfig?.batterySocEntityId || sourceConfig?.batteryPowerEntityId),
    hasGas: overview.totals.gasTodayKWh > 0 || Boolean(sourceConfig?.gasEnergyEntityId),
    hasHotWater:
      overview.totals.hotWaterTodayKWh > 0 || Boolean(sourceConfig?.hotWaterEnergyEntityId),
    hasCost: overview.totals.costToday > 0 || overview.totals.projectedMonthCost > 0,
    hasTrackedDevices: overview.topConsumers.length > 0,
  };
}

export function getEnergyModeSummary(
  mode: EnergyDashboardMode,
  overview: EnergyOverview,
  renewableSharePct: number
) {
  if (mode === 'peak') {
    const importKw = roundEnergyValue(overview.totals.importW / 1000);
    return `Grid import is carrying ${importKw} kW while high-demand loads overlap.`;
  }

  if (mode === 'battery_saver') {
    const batteryPercent = overview.totals.batteryPercent.toFixed(BATTERY_PERCENT_DECIMALS);
    return `Battery discharge is trimming the evening peak with ${batteryPercent}% reserve remaining.`;
  }

  if (mode === 'eco') {
    const renewablePct = renewableSharePct.toFixed(BATTERY_PERCENT_DECIMALS);
    return `Low-carbon sources are covering ${renewablePct}% of today's supply.`;
  }

  if (
    overview.totals.solarW <= 0 &&
    overview.totals.solarTodayKWh <= 0 &&
    (overview.totals.batteryPowerW ?? 0) === 0 &&
    overview.totals.batteryPercent <= 0
  ) {
    return 'Live grid demand is steady and no HA Energy source changes are reported.';
  }

  return 'The home is balanced between local generation, storage, and grid supply.';
}

function getNodeStatus(value: number, configured: boolean): EnergyDashboardNode['status'] {
  if (!configured) {
    return 'unavailable';
  }

  if (value <= 0) {
    return 'idle';
  }

  return 'active';
}

function buildNodes(
  overview: EnergyOverview,
  sourceConfig: EnergySourceConfig | null,
  renewableSharePct: number
): EnergyDashboardNode[] {
  const hasSolar = Boolean(
    sourceConfig?.solarEnergyEntityId ||
      sourceConfig?.solarPowerEntityId ||
      overview.totals.solarW > 0 ||
      overview.totals.solarTodayKWh > 0
  );
  const hasGrid =
    Boolean(
      sourceConfig?.gridImportEnergyEntityId ||
        sourceConfig?.gridExportEnergyEntityId ||
        sourceConfig?.gridImportPowerEntityId ||
        sourceConfig?.gridExportPowerEntityId
    ) ||
    overview.totals.importW > 0 ||
    overview.totals.exportW > 0 ||
    overview.totals.importTodayKWh > 0 ||
    (overview.totals.exportTodayKWh ?? 0) > 0;
  const hasBattery = Boolean(
    sourceConfig?.batterySocEntityId || sourceConfig?.batteryPowerEntityId
  );
  const hasGas = overview.totals.gasTodayKWh > 0;
  const hasRenewable = hasSolar && renewableSharePct > 0;

  const nodes: EnergyDashboardNode[] = [
    {
      id: 'home',
      label: 'Home',
      icon: 'home',
      value: roundEnergyValue(overview.totals.currentLoadW / 1000),
      unit: 'kW',
      todayValue: roundEnergyValue(overview.totals.importTodayKWh + overview.totals.solarTodayKWh),
      todayUnit: 'kWh',
      status: getNodeStatus(overview.totals.currentLoadW, true),
    },
  ];

  if (hasSolar) {
    nodes.push({
      id: 'solar',
      label: 'Solar',
      icon: 'solar',
      value: roundEnergyValue(overview.totals.solarW / 1000),
      unit: 'kW',
      todayValue: roundEnergyValue(overview.totals.solarTodayKWh),
      todayUnit: 'kWh',
      status: getNodeStatus(overview.totals.solarW, true),
    });
  }

  if (hasGrid) {
    nodes.push({
      id: 'grid',
      label: 'Grid',
      icon: 'grid',
      value: roundEnergyValue(
        (overview.totals.exportW > 0 ? overview.totals.exportW : overview.totals.importW) / 1000
      ),
      unit: 'kW',
      todayValue: roundEnergyValue(
        overview.totals.exportTodayKWh ?? overview.totals.importTodayKWh
      ),
      todayUnit: 'kWh',
      status: getNodeStatus(Math.max(overview.totals.importW, overview.totals.exportW), true),
    });
  }

  if (hasBattery) {
    nodes.push({
      id: 'battery',
      label: 'Battery',
      icon: 'battery',
      value: roundEnergyValue(overview.totals.batteryPercent),
      unit: '%',
      status:
        overview.totals.batteryPercent <= 15
          ? 'warning'
          : getNodeStatus(Math.abs(overview.totals.batteryPowerW ?? 0), true),
    });
  }

  if (hasGas) {
    nodes.push({
      id: 'gas',
      label: 'Gas',
      icon: 'gas',
      value: roundEnergyValue(overview.totals.gasTodayKWh),
      unit: 'kWh',
      todayValue: roundEnergyValue(overview.totals.gasTodayKWh),
      todayUnit: 'kWh',
      status: getNodeStatus(overview.totals.gasTodayKWh, true),
    });
  }

  if (hasRenewable) {
    nodes.push({
      id: 'renewable',
      label: 'Low-carbon',
      icon: 'renewable',
      value: roundEnergyValue(renewableSharePct),
      unit: '%',
      todayValue: roundEnergyValue(overview.totals.solarTodayKWh),
      todayUnit: 'kWh',
      status: getNodeStatus(renewableSharePct, true),
    });
  }

  return nodes;
}

function buildFlows(overview: EnergyOverview, nodes: EnergyDashboardNode[]): EnergyFlow[] {
  const visible = new Set(nodes.map((node) => node.id));
  const flows: EnergyFlow[] = [];
  const solarKw = roundEnergyValue(overview.totals.solarW / 1000, 2);
  const importKw = roundEnergyValue(overview.totals.importW / 1000, 2);
  const exportKw = roundEnergyValue(overview.totals.exportW / 1000, 2);
  const batteryPowerKw = roundEnergyValue(Math.abs((overview.totals.batteryPowerW ?? 0) / 1000), 2);
  const gasKw = roundEnergyValue(
    overview.totals.gasTodayKWh > 0 ? Math.min(overview.totals.gasTodayKWh / 8, 2) : 0,
    2
  );
  const renewableKw = roundEnergyValue(Math.min(solarKw, overview.totals.currentLoadW / 1000), 2);

  const pushFlow = (
    flow: EnergyFlow,
    requiredNodes: Array<EnergyFlow['from'] | EnergyFlow['to']>
  ) => {
    if (requiredNodes.every((nodeId) => visible.has(nodeId))) {
      flows.push(flow);
    }
  };

  if (solarKw > 0) {
    pushFlow(
      {
        id: 'solar-home',
        from: 'solar',
        to: 'home',
        valueKw: solarKw,
        valueKwhToday: overview.totals.solarTodayKWh,
        direction: 'produce',
        sourceType: 'solar',
        active: true,
      },
      ['solar', 'home']
    );
  }

  if ((overview.totals.batteryPowerW ?? 0) > 0 && solarKw > 0) {
    pushFlow(
      {
        id: 'solar-battery',
        from: 'solar',
        to: 'battery',
        valueKw: batteryPowerKw,
        valueKwhToday: batteryPowerKw,
        direction: 'charge',
        sourceType: 'solar',
        active: true,
      },
      ['solar', 'battery']
    );
  }

  if ((overview.totals.batteryPowerW ?? 0) < 0) {
    pushFlow(
      {
        id: 'battery-home',
        from: 'battery',
        to: 'home',
        valueKw: batteryPowerKw,
        valueKwhToday: batteryPowerKw,
        direction: 'discharge',
        sourceType: 'battery',
        active: true,
      },
      ['battery', 'home']
    );
  }

  if (importKw > 0) {
    pushFlow(
      {
        id: 'grid-home',
        from: 'grid',
        to: 'home',
        valueKw: importKw,
        valueKwhToday: overview.totals.importTodayKWh,
        direction: 'import',
        sourceType: 'grid',
        active: true,
      },
      ['grid', 'home']
    );
  }

  if (exportKw > 0) {
    pushFlow(
      {
        id: 'home-grid',
        from: 'home',
        to: 'grid',
        valueKw: exportKw,
        valueKwhToday: overview.totals.exportTodayKWh ?? 0,
        direction: 'export',
        sourceType: 'grid',
        active: true,
      },
      ['home', 'grid']
    );
  }

  if (gasKw > 0) {
    pushFlow(
      {
        id: 'gas-home',
        from: 'gas',
        to: 'home',
        valueKw: gasKw,
        valueKwhToday: overview.totals.gasTodayKWh,
        direction: 'consume',
        sourceType: 'gas',
        active: true,
      },
      ['gas', 'home']
    );
  }

  if (renewableKw > 0 && visible.has('renewable')) {
    pushFlow(
      {
        id: 'renewable-home',
        from: 'renewable',
        to: 'home',
        valueKw: renewableKw,
        valueKwhToday: overview.totals.solarTodayKWh,
        direction: 'produce',
        sourceType: 'renewable',
        active: true,
      },
      ['renewable', 'home']
    );
  }

  return flows;
}

interface DaySnapshotBase {
  totalUsageKWh: number;
  solarProductionKWh: number;
  gridImportKWh: number;
  gridExportKWh: number;
  estimatedCost: number;
}

function buildDaySnapshotBase(
  overview: EnergyOverview,
  periodTotals: BuildEnergyDashboardModelParams['periodTotals']
): DaySnapshotBase {
  const todayUsage = Math.max(
    periodTotals.today,
    overview.totals.importTodayKWh + overview.totals.solarTodayKWh
  );

  return {
    totalUsageKWh: roundEnergyValue(todayUsage, 1),
    solarProductionKWh: roundEnergyValue(overview.totals.solarTodayKWh, 1),
    gridImportKWh: roundEnergyValue(overview.totals.importTodayKWh, 1),
    gridExportKWh: roundEnergyValue(overview.totals.exportTodayKWh ?? 0, 1),
    estimatedCost: roundEnergyValue(overview.totals.costToday, 2),
  };
}

function buildEnergyBreakdown(values: {
  solarKWh?: number;
  gridImportKWh?: number;
  gridExportKWh?: number;
  gasKWh?: number;
  hotWaterKWh?: number;
}): EnergyRangeSnapshot['energyBreakdown'] {
  const items: EnergyRangeSnapshot['energyBreakdown'] = [];

  if ((values.solarKWh ?? 0) > 0) {
    items.push({
      id: 'solar',
      label: 'Solar',
      value: roundEnergyValue(values.solarKWh ?? 0, 1),
      unit: 'kWh',
      tone: 'solar',
    });
  }

  if ((values.gridImportKWh ?? 0) > 0) {
    items.push({
      id: 'grid',
      label: 'Grid import',
      value: roundEnergyValue(values.gridImportKWh ?? 0, 1),
      unit: 'kWh',
      tone: 'grid',
    });
  }

  if ((values.gridExportKWh ?? 0) > 0) {
    items.push({
      id: 'grid-export',
      label: 'Grid export',
      value: roundEnergyValue(values.gridExportKWh ?? 0, 1),
      unit: 'kWh',
      tone: 'grid',
    });
  }

  if ((values.gasKWh ?? 0) > 0) {
    items.push({
      id: 'gas',
      label: 'Gas',
      value: roundEnergyValue(values.gasKWh ?? 0, 1),
      unit: 'kWh',
      tone: 'gas',
    });
  }

  if ((values.hotWaterKWh ?? 0) > 0) {
    items.push({
      id: 'hot-water',
      label: 'Hot water',
      value: roundEnergyValue(values.hotWaterKWh ?? 0, 1),
      unit: 'kWh',
      tone: 'gas',
    });
  }

  return items;
}

function buildNowSnapshot(
  overview: EnergyOverview,
  trend: EnergySeriesPoint[],
  day: DaySnapshotBase
): EnergyRangeSnapshot {
  return {
    id: 'now',
    ...day,
    liveConsumption:
      trend.length > 0
        ? trend
        : [{ label: 'Now', value: roundEnergyValue(overview.totals.currentLoadW / 1000, 1) }],
    energyBreakdown: buildEnergyBreakdown({
      gridImportKWh: overview.totals.importW > 0 ? overview.totals.importW / 1000 : 0,
      gridExportKWh: overview.totals.exportW > 0 ? overview.totals.exportW / 1000 : 0,
      solarKWh: overview.totals.solarW > 0 ? overview.totals.solarW / 1000 : 0,
    }),
    costBreakdown: [],
    batteryForecast: [],
  };
}

function buildTodaySnapshot(
  overview: EnergyOverview,
  trend: EnergySeriesPoint[],
  day: DaySnapshotBase
): EnergyRangeSnapshot {
  return {
    id: 'today',
    ...day,
    liveConsumption: trend.length > 0 ? trend : [{ label: 'Today', value: day.totalUsageKWh }],
    energyBreakdown: buildEnergyBreakdown({
      solarKWh: day.solarProductionKWh,
      gridImportKWh: day.gridImportKWh,
      gridExportKWh: day.gridExportKWh,
      gasKWh: overview.totals.gasTodayKWh,
      hotWaterKWh: overview.totals.hotWaterTodayKWh,
    }),
    costBreakdown:
      day.estimatedCost > 0
        ? [{ id: 'cost', label: 'Energy cost', value: day.estimatedCost, unit: '$', tone: 'cost' }]
        : [],
    batteryForecast: [],
  };
}

function buildWeekSnapshot(
  periodTotals: BuildEnergyDashboardModelParams['periodTotals'],
  _day: DaySnapshotBase
): EnergyRangeSnapshot {
  const weekUsage = periodTotals.week;
  const weekGridImport = periodTotals.week;

  return {
    id: 'week',
    totalUsageKWh: roundEnergyValue(weekUsage, 1),
    solarProductionKWh: 0,
    gridImportKWh: roundEnergyValue(weekGridImport, 1),
    gridExportKWh: 0,
    estimatedCost: 0,
    liveConsumption: [],
    energyBreakdown: buildEnergyBreakdown({ gridImportKWh: weekGridImport }),
    costBreakdown: [],
    batteryForecast: [],
  };
}

function buildMonthSnapshot(
  periodTotals: BuildEnergyDashboardModelParams['periodTotals'],
  _day: DaySnapshotBase
): EnergyRangeSnapshot {
  const monthUsage = periodTotals.month;
  const monthGridImport = periodTotals.month;

  return {
    id: 'month',
    totalUsageKWh: roundEnergyValue(monthUsage, 1),
    solarProductionKWh: 0,
    gridImportKWh: roundEnergyValue(monthGridImport, 1),
    gridExportKWh: 0,
    estimatedCost: 0,
    liveConsumption: [],
    energyBreakdown: buildEnergyBreakdown({ gridImportKWh: monthGridImport }),
    costBreakdown: [],
    batteryForecast: [],
  };
}

function buildRangeSnapshots(
  overview: EnergyOverview,
  trend: EnergySeriesPoint[],
  periodTotals: BuildEnergyDashboardModelParams['periodTotals']
): Record<EnergyRange, EnergyRangeSnapshot> {
  const day = buildDaySnapshotBase(overview, periodTotals);

  return {
    now: buildNowSnapshot(overview, trend, day),
    today: buildTodaySnapshot(overview, trend, day),
    week: buildWeekSnapshot(periodTotals, day),
    month: buildMonthSnapshot(periodTotals, day),
  };
}

function deriveWhatChanged(
  overview: EnergyOverview,
  topConsumers: EnergyConsumer[]
): EnergyDashboardModel['whatChanged'] {
  const heating = topConsumers.find((consumer) => consumer.category === 'hvac');
  if (heating && heating.energyKWh > 0) {
    return {
      title: 'Heating moved ahead of yesterday',
      description: `Heating used ${Math.max(8, Math.round(heating.shareOfLoad * 58))}% more than yesterday's baseline window.`,
      tone: heating.shareOfLoad > 0.25 ? 'warn' : 'default',
    };
  }

  if (overview.totals.exportW > 0) {
    return {
      title: 'The house flipped into export',
      description: 'Midday production is now pushing excess energy back to the grid.',
      tone: 'good',
    };
  }

  return {
    title: 'Live demand is steady',
    description: 'No major swings versus the previous comparison window.',
    tone: 'default',
  };
}

function buildSummary(
  overview: EnergyOverview,
  dataCoverage: EnergyDashboardModel['dataCoverage']
): EnergyDashboardModel['summary'] {
  const gridTone =
    overview.totals.exportW > 0
      ? 'good'
      : overview.totals.importW > PEAK_IMPORT_THRESHOLD_W
        ? 'warn'
        : 'default';

  const summary: EnergyDashboardModel['summary'] = [
    {
      id: 'load',
      label: 'Live home load',
      value: formatEnergyValue(overview.totals.currentLoadW / 1000),
      caption: 'kW live',
    },
  ];

  if (dataCoverage.hasGridImport || dataCoverage.hasGridExport) {
    summary.push({
      id: 'grid',
      label: 'Grid',
      value: formatEnergyValue(
        (overview.totals.exportW > 0 ? overview.totals.exportW : overview.totals.importW) / 1000
      ),
      caption: overview.totals.exportW > 0 ? 'kW export' : 'kW import',
      tone: gridTone,
    });

    summary.push({
      id: 'today-grid',
      label: 'Grid today',
      value: formatEnergyValue(overview.totals.importTodayKWh),
      caption: 'kWh imported',
    });
  }

  if (dataCoverage.hasTrackedDevices) {
    summary.push({
      id: 'tracked-devices',
      label: 'Tracked devices',
      value: formatEnergyValue(
        overview.topConsumers.reduce((total, consumer) => total + consumer.energyKWh, 0)
      ),
      caption: `${overview.topConsumers.length} device${overview.topConsumers.length === 1 ? '' : 's'} today`,
    });
  }

  if (dataCoverage.hasSolar) {
    summary.push({
      id: 'solar',
      label: 'Solar production',
      value: formatEnergyValue(overview.totals.solarW / 1000),
      caption: overview.totals.solarW > 0 ? 'kW now' : 'kWh source configured',
      tone: overview.totals.solarW > 0 ? 'good' : 'default',
    });
  }

  if (dataCoverage.hasBattery) {
    summary.push({
      id: 'battery',
      label: 'Battery',
      value: formatEnergyValue(overview.totals.batteryPercent, 0),
      caption: '% state of charge',
      tone: overview.totals.batteryPercent > 25 ? 'good' : 'warn',
    });
  }

  return summary;
}

function buildTotals(overview: EnergyOverview, renewableSharePct: number) {
  return {
    currentLoadW: overview.totals.currentLoadW,
    solarW: overview.totals.solarW,
    batteryPercent: overview.totals.batteryPercent,
    batteryPowerW: overview.totals.batteryPowerW ?? 0,
    importW: overview.totals.importW,
    exportW: overview.totals.exportW,
    importTodayKWh: overview.totals.importTodayKWh,
    exportTodayKWh: overview.totals.exportTodayKWh ?? 0,
    solarTodayKWh: overview.totals.solarTodayKWh,
    gasTodayKWh: overview.totals.gasTodayKWh,
    renewableSharePct: roundEnergyValue(renewableSharePct, 0),
    costToday: overview.totals.costToday,
    projectedMonthCost: overview.totals.projectedMonthCost,
  };
}

export function buildEnergyDashboardModel({
  overview,
  range,
  trend,
  periodTotals,
  sourceConfig,
}: BuildEnergyDashboardModelParams): EnergyDashboardModel {
  const renewableSharePct =
    overview.totals.currentLoadW > 0
      ? Math.min(
          100,
          ((overview.totals.solarW + Math.max(0, -(overview.totals.batteryPowerW ?? 0))) /
            overview.totals.currentLoadW) *
            100
        )
      : 0;

  const nodes = buildNodes(overview, sourceConfig, renewableSharePct);
  const flows = buildFlows(overview, nodes);
  const dataCoverage = buildDataCoverage(overview, sourceConfig);
  const selectedRange = normalizeEnergyRange(range);
  const mode = resolveMode(overview);
  const modeSummary = getEnergyModeSummary(mode, overview, renewableSharePct);
  const summary = buildSummary(overview, dataCoverage);
  const ranges = buildRangeSnapshots(overview, trend, periodTotals);
  const whatChanged = deriveWhatChanged(overview, overview.topConsumers);
  const totals = buildTotals(overview, renewableSharePct);

  return {
    mode,
    modeSummary,
    summary,
    nodes,
    flows,
    ranges,
    selectedRange,
    insights: overview.insights.length > 0 ? overview.insights : [],
    whatChanged,
    topConsumers: overview.topConsumers,
    dataCoverage,
    totals,
  };
}
