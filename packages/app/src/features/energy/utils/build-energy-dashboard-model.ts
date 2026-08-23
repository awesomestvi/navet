import { defaultTranslate, type TranslateFn } from '@navet/app/i18n';
import type {
  EnergyConsumer,
  EnergyDashboardMode,
  EnergyDashboardModel,
  EnergyDashboardNode,
  EnergyExplanation,
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
  renewableSharePct: number,
  t: TranslateFn = defaultTranslate
) {
  if (mode === 'peak') {
    const importKw = roundEnergyValue(overview.totals.importW / 1000);
    return t('energy.model.mode.peak', { import: importKw });
  }

  if (mode === 'battery_saver') {
    const batteryPercent = overview.totals.batteryPercent.toFixed(BATTERY_PERCENT_DECIMALS);
    return t('energy.model.mode.batterySaver', { percent: batteryPercent });
  }

  if (mode === 'eco') {
    const renewablePct = renewableSharePct.toFixed(BATTERY_PERCENT_DECIMALS);
    return t('energy.model.mode.eco', { percent: renewablePct });
  }

  if (
    overview.totals.solarW <= 0 &&
    overview.totals.solarTodayKWh <= 0 &&
    (overview.totals.batteryPowerW ?? 0) === 0 &&
    overview.totals.batteryPercent <= 0
  ) {
    return t('energy.model.mode.gridSteady');
  }

  return t('energy.model.mode.balanced');
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
  renewableSharePct: number,
  t: TranslateFn
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
      label: t('energy.model.home'),
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
      label: t('energy.model.solar'),
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
      label: t('energy.model.grid'),
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
      label: t('energy.model.battery'),
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
      label: t('energy.model.gas'),
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
      label: t('energy.model.lowCarbon'),
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

function buildEnergyBreakdown(
  values: {
    solarKWh?: number;
    gridImportKWh?: number;
    gridExportKWh?: number;
    gasKWh?: number;
    hotWaterKWh?: number;
  },
  t: TranslateFn
): EnergyRangeSnapshot['energyBreakdown'] {
  const items: EnergyRangeSnapshot['energyBreakdown'] = [];

  if ((values.solarKWh ?? 0) > 0) {
    items.push({
      id: 'solar',
      label: t('energy.model.solar'),
      value: roundEnergyValue(values.solarKWh ?? 0, 1),
      unit: 'kWh',
      tone: 'solar',
    });
  }

  if ((values.gridImportKWh ?? 0) > 0) {
    items.push({
      id: 'grid',
      label: t('energy.model.gridImport'),
      value: roundEnergyValue(values.gridImportKWh ?? 0, 1),
      unit: 'kWh',
      tone: 'grid',
    });
  }

  if ((values.gridExportKWh ?? 0) > 0) {
    items.push({
      id: 'grid-export',
      label: t('energy.model.gridExport'),
      value: roundEnergyValue(values.gridExportKWh ?? 0, 1),
      unit: 'kWh',
      tone: 'grid',
    });
  }

  if ((values.gasKWh ?? 0) > 0) {
    items.push({
      id: 'gas',
      label: t('energy.model.gas'),
      value: roundEnergyValue(values.gasKWh ?? 0, 1),
      unit: 'kWh',
      tone: 'gas',
    });
  }

  if ((values.hotWaterKWh ?? 0) > 0) {
    items.push({
      id: 'hot-water',
      label: t('energy.model.hotWater'),
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
  day: DaySnapshotBase,
  t: TranslateFn
): EnergyRangeSnapshot {
  return {
    id: 'now',
    ...day,
    liveConsumption:
      trend.length > 0
        ? trend
        : [
            {
              label: t('energy.model.now'),
              value: roundEnergyValue(overview.totals.currentLoadW, 1),
            },
          ],
    energyBreakdown: buildEnergyBreakdown(
      {
        gridImportKWh: overview.totals.importW > 0 ? overview.totals.importW / 1000 : 0,
        gridExportKWh: overview.totals.exportW > 0 ? overview.totals.exportW / 1000 : 0,
        solarKWh: overview.totals.solarW > 0 ? overview.totals.solarW / 1000 : 0,
      },
      t
    ),
    costBreakdown: [],
    batteryForecast: [],
  };
}

function buildTodaySnapshot(
  overview: EnergyOverview,
  trend: EnergySeriesPoint[],
  day: DaySnapshotBase,
  t: TranslateFn
): EnergyRangeSnapshot {
  return {
    id: 'today',
    ...day,
    liveConsumption:
      trend.length > 0 ? trend : [{ label: t('energy.model.today'), value: day.totalUsageKWh }],
    energyBreakdown: buildEnergyBreakdown(
      {
        solarKWh: day.solarProductionKWh,
        gridImportKWh: day.gridImportKWh,
        gridExportKWh: day.gridExportKWh,
        gasKWh: overview.totals.gasTodayKWh,
        hotWaterKWh: overview.totals.hotWaterTodayKWh,
      },
      t
    ),
    costBreakdown:
      day.estimatedCost > 0
        ? [
            {
              id: 'cost',
              label: t('energy.model.energyCost'),
              value: day.estimatedCost,
              unit: '$',
              tone: 'cost',
            },
          ]
        : [],
    batteryForecast: [],
  };
}

function buildWeekSnapshot(
  periodTotals: BuildEnergyDashboardModelParams['periodTotals'],
  _day: DaySnapshotBase,
  t: TranslateFn
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
    energyBreakdown: buildEnergyBreakdown({ gridImportKWh: weekGridImport }, t),
    costBreakdown: [],
    batteryForecast: [],
  };
}

function buildMonthSnapshot(
  periodTotals: BuildEnergyDashboardModelParams['periodTotals'],
  _day: DaySnapshotBase,
  t: TranslateFn
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
    energyBreakdown: buildEnergyBreakdown({ gridImportKWh: monthGridImport }, t),
    costBreakdown: [],
    batteryForecast: [],
  };
}

function buildRangeSnapshots(
  overview: EnergyOverview,
  trend: EnergySeriesPoint[],
  selectedRange: EnergyRange,
  periodTotals: BuildEnergyDashboardModelParams['periodTotals'],
  t: TranslateFn
): Record<EnergyRange, EnergyRangeSnapshot> {
  const day = buildDaySnapshotBase(overview, periodTotals);
  const ranges = {
    now: buildNowSnapshot(overview, trend, day, t),
    today: buildTodaySnapshot(overview, trend, day, t),
    week: buildWeekSnapshot(periodTotals, day, t),
    month: buildMonthSnapshot(periodTotals, day, t),
  };

  if (selectedRange !== 'now') {
    ranges[selectedRange].liveConsumption = trend;
  }

  return ranges;
}

function deriveWhatChanged(
  overview: EnergyOverview,
  topConsumers: EnergyConsumer[],
  t: TranslateFn
): EnergyDashboardModel['whatChanged'] {
  const heating = topConsumers.find((consumer) => consumer.category === 'hvac');
  if (heating && heating.energyKWh > 0) {
    return {
      title: t('energy.model.changed.heatingTitle'),
      description: t('energy.model.changed.heatingDescription', {
        percent: Math.max(8, Math.round(heating.shareOfLoad * 58)),
      }),
      tone: heating.shareOfLoad > 0.25 ? 'warn' : 'default',
    };
  }

  if (overview.totals.exportW > 0) {
    return {
      title: t('energy.model.changed.exportTitle'),
      description: t('energy.model.changed.exportDescription'),
      tone: 'good',
    };
  }

  return {
    title: t('energy.model.changed.steadyTitle'),
    description: t('energy.model.changed.steadyDescription'),
    tone: 'default',
  };
}

function buildEnergyExplanations(
  overview: EnergyOverview,
  dataCoverage: EnergyDashboardModel['dataCoverage'],
  renewableSharePct: number,
  t: TranslateFn
): EnergyExplanation[] {
  const explanations: EnergyExplanation[] = [];
  const [topConsumer] = [...overview.topConsumers].sort(
    (left, right) => right.powerW - left.powerW || right.energyKWh - left.energyKWh
  );

  if (topConsumer && topConsumer.powerW > 0) {
    explanations.push({
      id: 'top-live-driver',
      title: t('energy.model.explanation.topTitle', { name: topConsumer.name }),
      description: t('energy.model.explanation.topDescription', {
        power: formatEnergyValue(topConsumer.powerW / 1000),
        share: formatEnergyValue(topConsumer.shareOfLoad * 100, 0),
      }),
      tone: topConsumer.shareOfLoad >= 0.3 ? 'warn' : 'default',
      affectedConsumerIds: [topConsumer.id],
    });
  }

  if (overview.totals.importW > PEAK_IMPORT_THRESHOLD_W) {
    explanations.push({
      id: 'grid-import-peak',
      title: t('energy.model.explanation.gridTitle'),
      description: t('energy.model.explanation.gridDescription', {
        import: formatEnergyValue(overview.totals.importW / 1000),
        load: formatEnergyValue(overview.totals.currentLoadW / 1000),
      }),
      tone: 'warn',
      affectedConsumerIds: topConsumer ? [topConsumer.id] : [],
    });
  }

  if (overview.totals.solarW > 0) {
    explanations.push({
      id: 'solar-offset',
      title: t('energy.model.explanation.solarTitle'),
      description: t('energy.model.explanation.solarDescription', {
        solar: formatEnergyValue(overview.totals.solarW / 1000),
        share: formatEnergyValue(renewableSharePct, 0),
      }),
      tone: 'good',
      affectedConsumerIds: [],
    });
  }

  if (!dataCoverage.hasTrackedDevices) {
    explanations.push({
      id: 'tracked-devices-missing',
      title: t('energy.model.explanation.untrackedTitle'),
      description: t('energy.model.explanation.untrackedDescription'),
      tone: 'default',
      affectedConsumerIds: [],
    });
  }

  return explanations.slice(0, 3);
}

function buildSummary(
  overview: EnergyOverview,
  dataCoverage: EnergyDashboardModel['dataCoverage'],
  t: TranslateFn
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
      label: t('energy.model.summary.liveHomeLoad'),
      value: formatEnergyValue(overview.totals.currentLoadW / 1000),
      caption: t('energy.model.caption.live'),
    },
  ];

  if (dataCoverage.hasGridImport || dataCoverage.hasGridExport) {
    summary.push({
      id: 'grid',
      label: t('energy.model.grid'),
      value: formatEnergyValue(
        (overview.totals.exportW > 0 ? overview.totals.exportW : overview.totals.importW) / 1000
      ),
      caption:
        overview.totals.exportW > 0
          ? t('energy.model.caption.export')
          : t('energy.model.caption.import'),
      tone: gridTone,
    });

    summary.push({
      id: 'today-grid',
      label: t('energy.model.summary.gridToday'),
      value: formatEnergyValue(overview.totals.importTodayKWh),
      caption: t('energy.model.caption.imported'),
    });
  }

  if (dataCoverage.hasTrackedDevices) {
    summary.push({
      id: 'tracked-devices',
      label: t('energy.model.summary.trackedDevices'),
      value: formatEnergyValue(
        overview.topConsumers.reduce((total, consumer) => total + consumer.energyKWh, 0)
      ),
      caption: t('energy.model.caption.devicesToday', { count: overview.topConsumers.length }),
    });
  }

  if (dataCoverage.hasSolar) {
    summary.push({
      id: 'solar',
      label: t('energy.model.summary.solarProduction'),
      value: formatEnergyValue(overview.totals.solarW / 1000),
      caption:
        overview.totals.solarW > 0
          ? t('energy.model.caption.now')
          : t('energy.model.caption.sourceConfigured'),
      tone: overview.totals.solarW > 0 ? 'good' : 'default',
    });
  }

  if (dataCoverage.hasBattery) {
    summary.push({
      id: 'battery',
      label: t('energy.model.battery'),
      value: formatEnergyValue(overview.totals.batteryPercent, 0),
      caption: t('energy.model.caption.stateOfCharge'),
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

export function buildEnergyDashboardModel(
  { overview, range, trend, periodTotals, sourceConfig }: BuildEnergyDashboardModelParams,
  t: TranslateFn = defaultTranslate
): EnergyDashboardModel {
  const renewableSharePct =
    overview.totals.currentLoadW > 0
      ? Math.min(
          100,
          ((overview.totals.solarW + Math.max(0, -(overview.totals.batteryPowerW ?? 0))) /
            overview.totals.currentLoadW) *
            100
        )
      : 0;

  const nodes = buildNodes(overview, sourceConfig, renewableSharePct, t);
  const flows = buildFlows(overview, nodes);
  const dataCoverage = buildDataCoverage(overview, sourceConfig);
  const selectedRange = normalizeEnergyRange(range);
  const mode = resolveMode(overview);
  const modeSummary = getEnergyModeSummary(mode, overview, renewableSharePct, t);
  const summary = buildSummary(overview, dataCoverage, t);
  const ranges = buildRangeSnapshots(overview, trend, selectedRange, periodTotals, t);
  const whatChanged = deriveWhatChanged(overview, overview.topConsumers, t);
  const explanations = buildEnergyExplanations(overview, dataCoverage, renewableSharePct, t);
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
    explanations,
    topConsumers: overview.topConsumers,
    dataCoverage,
    totals,
  };
}
