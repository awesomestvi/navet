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

function round(value: number, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function formatMetricValue(value: number, digits = 1) {
  return round(value, digits).toFixed(digits);
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
  if (overview.totals.importW > 1500) {
    return 'peak';
  }

  if (overview.totals.batteryPowerW && overview.totals.batteryPowerW < -1200) {
    return 'battery_saver';
  }

  if (overview.totals.solarW > overview.totals.currentLoadW * 0.7) {
    return 'eco';
  }

  return 'normal';
}

export function getEnergyModeSummary(
  mode: EnergyDashboardMode,
  overview: EnergyOverview,
  renewableSharePct: number
) {
  if (mode === 'peak') {
    return `Grid import is carrying ${Math.round((overview.totals.importW / 1000) * 10) / 10} kW while high-demand loads overlap.`;
  }

  if (mode === 'battery_saver') {
    return `Battery discharge is trimming the evening peak with ${overview.totals.batteryPercent.toFixed(0)}% reserve remaining.`;
  }

  if (mode === 'eco') {
    return `Low-carbon sources are covering ${renewableSharePct.toFixed(0)}% of today's supply.`;
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
  const hasSolar = Boolean(sourceConfig?.solarPowerEntityId || overview.totals.solarW > 0);
  const hasGrid =
    Boolean(sourceConfig?.gridImportPowerEntityId || sourceConfig?.gridExportPowerEntityId) ||
    overview.totals.importW > 0 ||
    overview.totals.exportW > 0;
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
      value: round(overview.totals.currentLoadW / 1000),
      unit: 'kW',
      todayValue: round(overview.totals.importTodayKWh + overview.totals.solarTodayKWh),
      todayUnit: 'kWh',
      status: getNodeStatus(overview.totals.currentLoadW, true),
    },
  ];

  if (hasSolar) {
    nodes.push({
      id: 'solar',
      label: 'Solar',
      icon: 'solar',
      value: round(overview.totals.solarW / 1000),
      unit: 'kW',
      todayValue: round(overview.totals.solarTodayKWh),
      todayUnit: 'kWh',
      status: getNodeStatus(overview.totals.solarW, true),
    });
  }

  if (hasGrid) {
    nodes.push({
      id: 'grid',
      label: 'Grid',
      icon: 'grid',
      value: round(
        (overview.totals.exportW > 0 ? overview.totals.exportW : overview.totals.importW) / 1000
      ),
      unit: 'kW',
      todayValue: round(overview.totals.exportTodayKWh ?? overview.totals.importTodayKWh),
      todayUnit: 'kWh',
      status: getNodeStatus(Math.max(overview.totals.importW, overview.totals.exportW), true),
    });
  }

  if (hasBattery) {
    nodes.push({
      id: 'battery',
      label: 'Battery',
      icon: 'battery',
      value: round(overview.totals.batteryPercent),
      unit: '%',
      todayValue: round(Math.abs((overview.totals.batteryPowerW ?? 0) / 1000), 1),
      todayUnit: 'kWh',
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
      value: round(overview.totals.gasTodayKWh),
      unit: 'kWh',
      todayValue: round(overview.totals.gasTodayKWh),
      todayUnit: 'kWh',
      status: getNodeStatus(overview.totals.gasTodayKWh, true),
    });
  }

  if (hasRenewable) {
    nodes.push({
      id: 'renewable',
      label: 'Low-carbon',
      icon: 'renewable',
      value: round(renewableSharePct),
      unit: '%',
      todayValue: round(overview.totals.solarTodayKWh),
      todayUnit: 'kWh',
      status: getNodeStatus(renewableSharePct, true),
    });
  }

  return nodes;
}

function buildFlows(overview: EnergyOverview, nodes: EnergyDashboardNode[]): EnergyFlow[] {
  const visible = new Set(nodes.map((node) => node.id));
  const flows: EnergyFlow[] = [];
  const solarKw = round(overview.totals.solarW / 1000, 2);
  const importKw = round(overview.totals.importW / 1000, 2);
  const exportKw = round(overview.totals.exportW / 1000, 2);
  const batteryPowerKw = round(Math.abs((overview.totals.batteryPowerW ?? 0) / 1000), 2);
  const gasKw = round(
    overview.totals.gasTodayKWh > 0 ? Math.min(overview.totals.gasTodayKWh / 8, 2) : 0,
    2
  );
  const renewableKw = round(Math.min(solarKw, overview.totals.currentLoadW / 1000), 2);

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

function buildRangeSnapshots(
  overview: EnergyOverview,
  trend: EnergySeriesPoint[],
  periodTotals: BuildEnergyDashboardModelParams['periodTotals']
): Record<EnergyRange, EnergyRangeSnapshot> {
  const todayUsage = Math.max(
    periodTotals.today,
    overview.totals.importTodayKWh + overview.totals.solarTodayKWh
  );
  const day = {
    totalUsageKWh: round(todayUsage, 1),
    solarProductionKWh: round(overview.totals.solarTodayKWh, 1),
    gridImportKWh: round(overview.totals.importTodayKWh, 1),
    gridExportKWh: round(overview.totals.exportTodayKWh ?? 0, 1),
    estimatedCost: round(overview.totals.costToday || todayUsage * 0.34, 2),
  };

  return {
    now: {
      id: 'now',
      ...day,
      liveConsumption:
        trend.length > 0
          ? trend
          : [{ label: 'Now', value: round(overview.totals.currentLoadW / 1000, 1) }],
      energyBreakdown: [
        {
          id: 'solar',
          label: 'Solar',
          value: round(overview.totals.solarW / 1000, 1),
          unit: 'kWh',
          tone: 'solar',
        },
        {
          id: 'battery',
          label: 'Battery',
          value: round(Math.abs((overview.totals.batteryPowerW ?? 0) / 1000), 1),
          unit: 'kWh',
          tone: 'battery',
        },
        {
          id: 'grid',
          label: 'Grid',
          value: round(Math.max(overview.totals.importW, overview.totals.exportW) / 1000, 1),
          unit: 'kWh',
          tone: 'grid',
        },
      ],
      costBreakdown: [
        {
          id: 'heating',
          label: 'Heating',
          value: round(overview.totals.hotWaterTodayKWh * 0.12, 2),
          unit: '$',
          tone: 'cost',
        },
        {
          id: 'live',
          label: 'Live load',
          value: round((overview.totals.currentLoadW / 1000) * 0.18, 2),
          unit: '$',
          tone: 'cost',
        },
      ],
      batteryForecast: [
        { label: '1h', value: Math.max(0, round(overview.totals.batteryPercent - 6)) },
        { label: '3h', value: Math.max(0, round(overview.totals.batteryPercent - 12)) },
        { label: '6h', value: Math.max(0, round(overview.totals.batteryPercent - 18)) },
      ],
    },
    today: {
      id: 'today',
      ...day,
      liveConsumption: trend.length > 0 ? trend : [{ label: 'Today', value: day.totalUsageKWh }],
      energyBreakdown: [
        { id: 'solar', label: 'Solar', value: day.solarProductionKWh, unit: 'kWh', tone: 'solar' },
        { id: 'grid', label: 'Grid import', value: day.gridImportKWh, unit: 'kWh', tone: 'grid' },
        {
          id: 'gas',
          label: 'Gas',
          value: round(overview.totals.gasTodayKWh, 1),
          unit: 'kWh',
          tone: 'gas',
        },
        {
          id: 'battery',
          label: 'Battery',
          value: round(Math.abs((overview.totals.batteryPowerW ?? 0) / 1000) * 4, 1),
          unit: 'kWh',
          tone: 'battery',
        },
      ],
      costBreakdown: [
        { id: 'cost', label: 'Energy cost', value: day.estimatedCost, unit: '$', tone: 'cost' },
        {
          id: 'hot-water',
          label: 'Hot water',
          value: round(overview.totals.hotWaterTodayKWh * 0.18, 2),
          unit: '$',
          tone: 'cost',
        },
      ],
      batteryForecast: [
        { label: '22:00', value: Math.max(0, round(overview.totals.batteryPercent - 8)) },
        { label: '02:00', value: Math.max(0, round(overview.totals.batteryPercent - 16)) },
        { label: '06:00', value: Math.max(0, round(overview.totals.batteryPercent - 24)) },
      ],
    },
    week: {
      id: 'week',
      totalUsageKWh: round(periodTotals.week || day.totalUsageKWh * 7, 1),
      solarProductionKWh: round(day.solarProductionKWh * 6.5, 1),
      gridImportKWh: round(day.gridImportKWh * 6.7, 1),
      gridExportKWh: round(day.gridExportKWh * 6.2, 1),
      estimatedCost: round(day.estimatedCost * 6.8, 2),
      liveConsumption: [
        { label: 'Mon', value: round(day.totalUsageKWh * 0.94, 1) },
        { label: 'Tue', value: round(day.totalUsageKWh * 0.9, 1) },
        { label: 'Wed', value: round(day.totalUsageKWh * 1.03, 1) },
        { label: 'Thu', value: round(day.totalUsageKWh * 0.96, 1) },
        { label: 'Fri', value: round(day.totalUsageKWh * 1.08, 1) },
        { label: 'Sat', value: round(day.totalUsageKWh * 1.01, 1) },
        { label: 'Sun', value: round(day.totalUsageKWh * 0.98, 1) },
      ],
      energyBreakdown: [
        {
          id: 'solar',
          label: 'Solar',
          value: round(day.solarProductionKWh * 6.5, 1),
          unit: 'kWh',
          tone: 'solar',
        },
        {
          id: 'grid',
          label: 'Grid import',
          value: round(day.gridImportKWh * 6.7, 1),
          unit: 'kWh',
          tone: 'grid',
        },
        {
          id: 'battery',
          label: 'Battery',
          value: round(Math.abs((overview.totals.batteryPowerW ?? 0) / 1000) * 26, 1),
          unit: 'kWh',
          tone: 'battery',
        },
      ],
      costBreakdown: [
        {
          id: 'cost',
          label: 'Energy cost',
          value: round(day.estimatedCost * 6.8, 2),
          unit: '$',
          tone: 'cost',
        },
        {
          id: 'heating',
          label: 'Heating',
          value: round(day.estimatedCost * 2.2, 2),
          unit: '$',
          tone: 'cost',
          alert: true,
        },
      ],
      batteryForecast: [
        { label: 'Mon', value: round(overview.totals.batteryPercent, 0) },
        { label: 'Wed', value: Math.max(0, round(overview.totals.batteryPercent - 8, 0)) },
        { label: 'Fri', value: Math.max(0, round(overview.totals.batteryPercent - 5, 0)) },
        { label: 'Sun', value: Math.max(0, round(overview.totals.batteryPercent - 10, 0)) },
      ],
    },
    month: {
      id: 'month',
      totalUsageKWh: round(periodTotals.month || day.totalUsageKWh * 28, 1),
      solarProductionKWh: round(day.solarProductionKWh * 27, 1),
      gridImportKWh: round(day.gridImportKWh * 26, 1),
      gridExportKWh: round(day.gridExportKWh * 22, 1),
      estimatedCost: round(day.estimatedCost * 27, 2),
      liveConsumption: [
        { label: 'W1', value: round(day.totalUsageKWh * 6.7, 1) },
        { label: 'W2', value: round(day.totalUsageKWh * 7.0, 1) },
        { label: 'W3', value: round(day.totalUsageKWh * 6.8, 1) },
        { label: 'W4', value: round(day.totalUsageKWh * 7.2, 1) },
      ],
      energyBreakdown: [
        {
          id: 'solar',
          label: 'Solar',
          value: round(day.solarProductionKWh * 27, 1),
          unit: 'kWh',
          tone: 'solar',
        },
        {
          id: 'grid',
          label: 'Grid import',
          value: round(day.gridImportKWh * 26, 1),
          unit: 'kWh',
          tone: 'grid',
        },
        {
          id: 'battery',
          label: 'Battery',
          value: round(Math.abs((overview.totals.batteryPowerW ?? 0) / 1000) * 108, 1),
          unit: 'kWh',
          tone: 'battery',
        },
      ],
      costBreakdown: [
        {
          id: 'cost',
          label: 'Energy cost',
          value: round(day.estimatedCost * 27, 2),
          unit: '$',
          tone: 'cost',
        },
        {
          id: 'heating',
          label: 'Heating',
          value: round(day.estimatedCost * 8.7, 2),
          unit: '$',
          tone: 'cost',
          alert: true,
        },
      ],
      batteryForecast: [
        { label: 'W1', value: round(overview.totals.batteryPercent, 0) },
        { label: 'W2', value: Math.max(0, round(overview.totals.batteryPercent - 6, 0)) },
        { label: 'W3', value: Math.max(0, round(overview.totals.batteryPercent - 3, 0)) },
        { label: 'W4', value: Math.max(0, round(overview.totals.batteryPercent - 8, 0)) },
      ],
    },
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
  const selectedRange = normalizeEnergyRange(range);
  const mode = resolveMode(overview);
  const modeSummary = getEnergyModeSummary(mode, overview, renewableSharePct);
  const summary = [
    {
      id: 'load',
      label: 'Home consumption',
      value: formatMetricValue(overview.totals.currentLoadW / 1000),
      caption: 'kW live',
    },
    {
      id: 'solar',
      label: 'Solar production',
      value: formatMetricValue(overview.totals.solarW / 1000),
      caption: overview.totals.solarW > 0 ? 'kW now' : 'kW idle',
      tone: overview.totals.solarW > 0 ? 'good' : 'default',
    },
    {
      id: 'grid',
      label: 'Grid',
      value: formatMetricValue(
        (overview.totals.exportW > 0 ? overview.totals.exportW : overview.totals.importW) / 1000
      ),
      caption: overview.totals.exportW > 0 ? 'kW export' : 'kW import',
      tone:
        overview.totals.exportW > 0 ? 'good' : overview.totals.importW > 1500 ? 'warn' : 'default',
    },
    {
      id: 'battery',
      label: 'Battery',
      value: formatMetricValue(overview.totals.batteryPercent, 0),
      caption:
        overview.totals.batteryPowerW && overview.totals.batteryPowerW > 0
          ? `% at ${formatMetricValue(overview.totals.batteryPowerW / 1000)} kW charge`
          : overview.totals.batteryPowerW && overview.totals.batteryPowerW < 0
            ? `% at ${formatMetricValue(Math.abs(overview.totals.batteryPowerW) / 1000)} kW discharge`
            : '% steady',
      tone: overview.totals.batteryPercent > 25 ? 'good' : 'warn',
    },
    ...(overview.totals.gasTodayKWh > 0
      ? [
          {
            id: 'gas',
            label: 'Gas usage',
            value: formatMetricValue(overview.totals.gasTodayKWh),
            caption: 'kWh today',
          },
        ]
      : []),
    ...(renewableSharePct > 0
      ? [
          {
            id: 'renewable',
            label: 'Low-carbon share',
            value: formatMetricValue(renewableSharePct, 0),
            caption: '% today',
            tone: 'good',
          },
        ]
      : []),
  ] as EnergyDashboardModel['summary'];

  return {
    mode,
    modeSummary,
    summary,
    nodes,
    flows,
    ranges: buildRangeSnapshots(overview, trend, periodTotals),
    selectedRange,
    insights: overview.insights.length > 0 ? overview.insights : [],
    whatChanged: deriveWhatChanged(overview, overview.topConsumers),
    topConsumers: overview.topConsumers,
    totals: {
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
      renewableSharePct: round(renewableSharePct, 0),
      costToday:
        overview.totals.costToday ||
        round((overview.totals.importTodayKWh + overview.totals.gasTodayKWh) * 0.34, 2),
      projectedMonthCost:
        overview.totals.projectedMonthCost ||
        round((overview.totals.importTodayKWh + overview.totals.gasTodayKWh) * 9.4, 2),
    },
  };
}
