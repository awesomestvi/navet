import type {
  EnergyConsumer,
  EnergyDashboardModel,
  EnergyDashboardScenario,
  EnergyFlowDatum,
  EnergyInsight,
  EnergyNode,
  EnergyOverview,
  EnergyRange,
  EnergyRangeSnapshot,
  EnergySourceDiagnostic,
  EnergyStat,
} from '../types/energy.types';

function cloneRangeSnapshot(snapshot: EnergyRangeSnapshot): EnergyRangeSnapshot {
  return {
    ...snapshot,
    liveConsumption: snapshot.liveConsumption.map((point) => ({ ...point })),
    energyBreakdown: snapshot.energyBreakdown.map((item) => ({ ...item })),
    costBreakdown: snapshot.costBreakdown.map((item) => ({ ...item })),
    batteryForecast: snapshot.batteryForecast.map((point) => ({ ...point })),
  };
}

function cloneDashboard(dashboard: EnergyDashboardModel): EnergyDashboardModel {
  return {
    ...dashboard,
    summary: dashboard.summary.map((item) => ({ ...item })),
    nodes: dashboard.nodes.map((node) => ({ ...node })),
    flows: dashboard.flows.map((flow) => ({ ...flow })),
    ranges: {
      now: cloneRangeSnapshot(dashboard.ranges.now),
      today: cloneRangeSnapshot(dashboard.ranges.today),
      week: cloneRangeSnapshot(dashboard.ranges.week),
      month: cloneRangeSnapshot(dashboard.ranges.month),
    },
    insights: dashboard.insights.map((insight) => ({
      ...insight,
      affectedNodeIds: [...insight.affectedNodeIds],
    })),
    topConsumers: dashboard.topConsumers.map((consumer) => ({ ...consumer })),
    whatChanged: { ...dashboard.whatChanged },
    totals: { ...dashboard.totals },
  };
}

const consumers: EnergyConsumer[] = [
  {
    id: 'hvac',
    name: 'Heating loop',
    category: 'hvac',
    powerEntityId: 'sensor.hvac_power',
    powerW: 3600,
    energyKWh: 18.9,
    shareOfLoad: 0.31,
    costToday: 4.88,
    status: 'active',
    room: 'Whole house',
  },
  {
    id: 'water-heater',
    name: 'Water heater',
    category: 'water_heater',
    powerEntityId: 'sensor.water_heater_power',
    powerW: 2100,
    energyKWh: 9.7,
    shareOfLoad: 0.18,
    costToday: 2.74,
    status: 'active',
    room: 'Utility',
  },
  {
    id: 'ev',
    name: 'EV charger',
    category: 'ev_charger',
    powerEntityId: 'sensor.ev_power',
    powerW: 1800,
    energyKWh: 8.4,
    shareOfLoad: 0.15,
    costToday: 2.08,
    status: 'idle',
    room: 'Garage',
  },
  {
    id: 'kitchen',
    name: 'Kitchen strip',
    category: 'other',
    powerEntityId: 'sensor.kitchen_power',
    powerW: 920,
    energyKWh: 4.6,
    shareOfLoad: 0.08,
    costToday: 1.12,
    status: 'active',
    room: 'Kitchen',
  },
  {
    id: 'floor-heating',
    name: 'Floor heating',
    category: 'floor_heating',
    powerEntityId: 'sensor.floor_heating_power',
    powerW: 780,
    energyKWh: 4.1,
    shareOfLoad: 0.07,
    costToday: 0.98,
    status: 'active',
    room: 'Bathroom',
  },
  {
    id: 'laundry',
    name: 'Laundry room',
    category: 'dryer',
    powerEntityId: 'sensor.laundry_power',
    powerW: 540,
    energyKWh: 2.7,
    costToday: 0.64,
    shareOfLoad: 0.05,
    status: 'idle',
    room: 'Laundry',
  },
];

const nodes: EnergyNode[] = [
  {
    id: 'solar-array',
    name: 'Solar array',
    kind: 'source',
    resourceType: 'solar',
    entityIds: ['sensor.solar_production_power'],
    system: 'roof',
  },
  {
    id: 'battery-pack',
    name: 'Battery storage',
    kind: 'storage',
    resourceType: 'battery',
    entityIds: ['sensor.battery_soc', 'sensor.battery_power'],
    system: 'garage',
  },
  {
    id: 'grid-meter',
    name: 'Grid meter',
    kind: 'meter',
    resourceType: 'electricity',
    entityIds: ['sensor.grid_import_power', 'sensor.grid_export_power'],
    system: 'service',
  },
  ...consumers.map((consumer) => ({
    id: consumer.id,
    name: consumer.name,
    kind: 'consumer' as const,
    resourceType: consumer.category === 'hvac' ? ('heating' as const) : ('electricity' as const),
    category: consumer.category,
    entityIds: [consumer.id],
    room: consumer.room,
  })),
];

const defaultInsights: EnergyInsight[] = [
  {
    id: 'heating-up',
    severity: 'warning',
    title: 'Heating ran hotter this morning',
    description: 'Heating used 18% more than yesterday between 06:00 and 09:00.',
    affectedNodeIds: ['home'],
  },
  {
    id: 'solar-cover',
    severity: 'info',
    title: 'Solar covered most of the lunch peak',
    description: 'PV covered 72% of household demand during the midday spike.',
    affectedNodeIds: ['solar', 'home'],
  },
];

const nowRange: EnergyRangeSnapshot = {
  id: 'now',
  totalUsageKWh: 22.6,
  solarProductionKWh: 31.8,
  gridImportKWh: 8.2,
  gridExportKWh: 3.9,
  estimatedCost: 10.84,
  liveConsumption: [
    { label: '-45m', value: 4.8 },
    { label: '-30m', value: 5.2 },
    { label: '-15m', value: 5.6 },
    { label: 'Now', value: 5.1 },
  ],
  energyBreakdown: [
    { id: 'solar', label: 'Solar', value: 3.4, unit: 'kWh', tone: 'solar' },
    { id: 'battery', label: 'Battery', value: 0.8, unit: 'kWh', tone: 'battery' },
    { id: 'grid', label: 'Grid', value: 0.9, unit: 'kWh', tone: 'grid' },
    { id: 'gas', label: 'Gas', value: 0.5, unit: 'kWh', tone: 'gas' },
  ],
  costBreakdown: [
    { id: 'heating', label: 'Heating', value: 1.84, unit: '$', tone: 'load' },
    { id: 'water', label: 'Hot water', value: 0.92, unit: '$', tone: 'cost' },
    { id: 'ev', label: 'EV', value: 0.68, unit: '$', tone: 'cost' },
    { id: 'other', label: 'Other', value: 0.44, unit: '$', tone: 'cost' },
  ],
  batteryForecast: [
    { label: '1h', value: 70 },
    { label: '3h', value: 61 },
    { label: '6h', value: 54 },
  ],
};

const todayRange: EnergyRangeSnapshot = {
  id: 'today',
  totalUsageKWh: 22.6,
  solarProductionKWh: 31.8,
  gridImportKWh: 8.2,
  gridExportKWh: 3.9,
  estimatedCost: 10.84,
  liveConsumption: [
    { label: '00', value: 1.8 },
    { label: '04', value: 1.5 },
    { label: '08', value: 3.6 },
    { label: '12', value: 5.7 },
    { label: '16', value: 5.1 },
    { label: '20', value: 4.2 },
  ],
  energyBreakdown: [
    { id: 'solar', label: 'Solar', value: 31.8, unit: 'kWh', tone: 'solar' },
    { id: 'grid', label: 'Grid import', value: 8.2, unit: 'kWh', tone: 'grid' },
    { id: 'battery', label: 'Battery', value: 5.4, unit: 'kWh', tone: 'battery' },
    { id: 'gas', label: 'Gas', value: 6.1, unit: 'kWh', tone: 'gas' },
  ],
  costBreakdown: [
    { id: 'heating', label: 'Heating', value: 4.88, unit: '$', tone: 'cost', alert: true },
    { id: 'water', label: 'Hot water', value: 2.74, unit: '$', tone: 'cost' },
    { id: 'ev', label: 'EV charging', value: 2.08, unit: '$', tone: 'cost' },
    { id: 'other', label: 'Other loads', value: 1.14, unit: '$', tone: 'cost' },
  ],
  batteryForecast: [
    { label: '22:00', value: 64 },
    { label: '02:00', value: 56 },
    { label: '06:00', value: 49 },
  ],
};

const weekRange: EnergyRangeSnapshot = {
  id: 'week',
  totalUsageKWh: 164.8,
  solarProductionKWh: 188.4,
  gridImportKWh: 54.1,
  gridExportKWh: 26.5,
  estimatedCost: 76.24,
  liveConsumption: [
    { label: 'Mon', value: 24.8 },
    { label: 'Tue', value: 22.1 },
    { label: 'Wed', value: 23.9 },
    { label: 'Thu', value: 21.6 },
    { label: 'Fri', value: 25.2 },
    { label: 'Sat', value: 23.4 },
    { label: 'Sun', value: 23.8 },
  ],
  energyBreakdown: [
    { id: 'solar', label: 'Solar', value: 188.4, unit: 'kWh', tone: 'solar' },
    { id: 'grid', label: 'Grid import', value: 54.1, unit: 'kWh', tone: 'grid' },
    { id: 'battery', label: 'Battery throughput', value: 32.4, unit: 'kWh', tone: 'battery' },
    { id: 'gas', label: 'Gas', value: 44.8, unit: 'kWh', tone: 'gas' },
  ],
  costBreakdown: [
    { id: 'heating', label: 'Heating', value: 29.8, unit: '$', tone: 'cost', alert: true },
    { id: 'water', label: 'Hot water', value: 14.6, unit: '$', tone: 'cost' },
    { id: 'ev', label: 'EV charging', value: 13.1, unit: '$', tone: 'cost' },
    { id: 'other', label: 'Other loads', value: 18.7, unit: '$', tone: 'cost' },
  ],
  batteryForecast: [
    { label: 'Mon', value: 72 },
    { label: 'Wed', value: 64 },
    { label: 'Fri', value: 59 },
    { label: 'Sun', value: 62 },
  ],
};

const monthRange: EnergyRangeSnapshot = {
  id: 'month',
  totalUsageKWh: 642.3,
  solarProductionKWh: 774.9,
  gridImportKWh: 214.6,
  gridExportKWh: 98.4,
  estimatedCost: 294.2,
  liveConsumption: [
    { label: 'W1', value: 151 },
    { label: 'W2', value: 158 },
    { label: 'W3', value: 164 },
    { label: 'W4', value: 169 },
  ],
  energyBreakdown: [
    { id: 'solar', label: 'Solar', value: 774.9, unit: 'kWh', tone: 'solar' },
    { id: 'grid', label: 'Grid import', value: 214.6, unit: 'kWh', tone: 'grid' },
    { id: 'battery', label: 'Battery throughput', value: 122.8, unit: 'kWh', tone: 'battery' },
    { id: 'gas', label: 'Gas', value: 186.2, unit: 'kWh', tone: 'gas' },
  ],
  costBreakdown: [
    { id: 'heating', label: 'Heating', value: 112.6, unit: '$', tone: 'cost', alert: true },
    { id: 'water', label: 'Hot water', value: 58.2, unit: '$', tone: 'cost' },
    { id: 'ev', label: 'EV charging', value: 41.1, unit: '$', tone: 'cost' },
    { id: 'other', label: 'Other loads', value: 82.3, unit: '$', tone: 'cost' },
  ],
  batteryForecast: [
    { label: 'Week 1', value: 69 },
    { label: 'Week 2', value: 66 },
    { label: 'Week 3', value: 63 },
    { label: 'Week 4', value: 67 },
  ],
};

const defaultDashboard: EnergyDashboardModel = {
  mode: 'eco',
  modeSummary: 'Solar is covering most of the home and battery discharge is modest.',
  summary: [
    {
      id: 'load',
      label: 'Home consumption',
      value: '5.1',
      caption: 'kW live',
    },
    {
      id: 'solar',
      label: 'Solar production',
      value: '4.2',
      caption: 'kW now',
      tone: 'good',
    },
    {
      id: 'grid',
      label: 'Grid',
      value: '0.6',
      caption: 'kW import',
    },
    {
      id: 'battery',
      label: 'Battery',
      value: '78',
      caption: '% at 0.3 kW discharge',
      tone: 'good',
    },
    {
      id: 'gas',
      label: 'Gas usage',
      value: '6.1',
      caption: 'kWh today',
    },
    {
      id: 'renewable',
      label: 'Low-carbon share',
      value: '81',
      caption: '% today',
      tone: 'good',
    },
  ],
  nodes: [
    {
      id: 'home',
      label: 'Home',
      icon: 'home',
      value: 5.1,
      unit: 'kW',
      todayValue: 22.6,
      todayUnit: 'kWh',
      status: 'active',
    },
    {
      id: 'solar',
      label: 'Solar',
      icon: 'solar',
      value: 4.2,
      unit: 'kW',
      todayValue: 31.8,
      todayUnit: 'kWh',
      status: 'active',
    },
    {
      id: 'grid',
      label: 'Grid',
      icon: 'grid',
      value: 0.6,
      unit: 'kW',
      todayValue: 8.2,
      todayUnit: 'kWh',
      status: 'active',
    },
    {
      id: 'battery',
      label: 'Battery',
      icon: 'battery',
      value: 78,
      unit: '%',
      status: 'active',
    },
    {
      id: 'gas',
      label: 'Gas',
      icon: 'gas',
      value: 0.9,
      unit: 'kW',
      todayValue: 6.1,
      todayUnit: 'kWh',
      status: 'idle',
    },
    {
      id: 'renewable',
      label: 'Renewable',
      icon: 'renewable',
      value: 81,
      unit: '%',
      todayValue: 31.8,
      todayUnit: 'kWh',
      status: 'active',
    },
  ],
  flows: [
    {
      id: 'solar-home',
      from: 'solar',
      to: 'home',
      valueKw: 4.2,
      valueKwhToday: 31.8,
      direction: 'produce',
      sourceType: 'solar',
      active: true,
    },
    {
      id: 'solar-battery',
      from: 'solar',
      to: 'battery',
      valueKw: 0.4,
      valueKwhToday: 2.8,
      direction: 'charge',
      sourceType: 'solar',
      active: true,
    },
    {
      id: 'battery-home',
      from: 'battery',
      to: 'home',
      valueKw: 0.3,
      valueKwhToday: 5.4,
      direction: 'discharge',
      sourceType: 'battery',
      active: true,
    },
    {
      id: 'grid-home',
      from: 'grid',
      to: 'home',
      valueKw: 0.6,
      valueKwhToday: 8.2,
      direction: 'import',
      sourceType: 'grid',
      active: true,
    },
    {
      id: 'gas-home',
      from: 'gas',
      to: 'home',
      valueKw: 0.9,
      valueKwhToday: 6.1,
      direction: 'consume',
      sourceType: 'gas',
      active: true,
    },
    {
      id: 'renewable-home',
      from: 'renewable',
      to: 'home',
      valueKw: 4.1,
      valueKwhToday: 25.7,
      direction: 'produce',
      sourceType: 'renewable',
      active: true,
    },
  ],
  ranges: {
    now: nowRange,
    today: todayRange,
    week: weekRange,
    month: monthRange,
  },
  selectedRange: 'today',
  insights: defaultInsights,
  whatChanged: {
    title: 'Heating stepped up before sunrise',
    description:
      'Heating used 18% more than yesterday while solar started 40 minutes later due to cloud cover.',
    tone: 'warn',
  },
  topConsumers: consumers,
  dataCoverage: {
    hasLiveLoad: true,
    hasGridImport: true,
    hasGridExport: true,
    hasSolar: true,
    hasBattery: true,
    hasGas: true,
    hasHotWater: true,
    hasCost: true,
    hasTrackedDevices: true,
  },
  totals: {
    currentLoadW: 5100,
    solarW: 4200,
    batteryPercent: 78,
    batteryPowerW: -300,
    importW: 600,
    exportW: 0,
    importTodayKWh: 8.2,
    exportTodayKWh: 3.9,
    solarTodayKWh: 31.8,
    gasTodayKWh: 6.1,
    renewableSharePct: 81,
    costToday: 10.84,
    projectedMonthCost: 294.2,
  },
};

function makeScenario(
  id: string,
  label: string,
  update: (dashboard: EnergyDashboardModel) => EnergyDashboardModel
): EnergyDashboardScenario {
  return { id, label, dashboard: update(cloneDashboard(defaultDashboard)) };
}

function findDashboardNode(
  dashboard: EnergyDashboardModel,
  nodeId: EnergyDashboardModel['nodes'][number]['id']
) {
  return dashboard.nodes.find((node) => node.id === nodeId);
}

function findDashboardFlow(dashboard: EnergyDashboardModel, flowId: string) {
  return dashboard.flows.find((flow) => flow.id === flowId);
}

export const energyDashboardScenarios: EnergyDashboardScenario[] = [
  makeScenario('default', 'Default', (dashboard) => dashboard),
  makeScenario('solar-producing', 'Solar producing', (dashboard) => {
    dashboard.mode = 'eco';
    dashboard.summary[1] = { ...dashboard.summary[1], value: '5.4', caption: 'kW now' };
    const solarNode = findDashboardNode(dashboard, 'solar');
    if (solarNode) {
      solarNode.value = 5.4;
    }
    const solarHomeFlow = findDashboardFlow(dashboard, 'solar-home');
    if (solarHomeFlow) {
      solarHomeFlow.valueKw = 4.9;
    }
    const solarBatteryFlow = findDashboardFlow(dashboard, 'solar-battery');
    if (solarBatteryFlow) {
      solarBatteryFlow.valueKw = 0.8;
    }
    dashboard.totals.solarW = 5400;
    return dashboard;
  }),
  makeScenario('grid-importing', 'Grid importing', (dashboard) => {
    dashboard.mode = 'peak';
    dashboard.modeSummary =
      'The home is pulling heavily from the grid while heating and hot water overlap.';
    const gridNode = findDashboardNode(dashboard, 'grid');
    if (gridNode) {
      gridNode.value = 2.8;
    }
    dashboard.flows = dashboard.flows.filter((flow) => flow.id !== 'home-grid');
    const gridHomeFlow = findDashboardFlow(dashboard, 'grid-home');
    if (gridHomeFlow) {
      gridHomeFlow.valueKw = 2.8;
    }
    dashboard.summary[2] = {
      ...dashboard.summary[2],
      value: '2.8',
      caption: 'kW import',
      tone: 'warn',
    };
    dashboard.totals.importW = 2800;
    dashboard.whatChanged = {
      title: 'Import spiked with the breakfast heat cycle',
      description: 'Grid import is 41% higher than the same time yesterday.',
      tone: 'warn',
    };
    return dashboard;
  }),
  makeScenario('battery-charging', 'Battery charging', (dashboard) => {
    dashboard.mode = 'normal';
    dashboard.summary[3] = {
      ...dashboard.summary[3],
      value: '78',
      caption: '% at 1.2 kW charge',
      tone: 'good',
    };
    dashboard.flows = dashboard.flows.filter((flow) => flow.id !== 'battery-home');
    const solarBatteryFlow = findDashboardFlow(dashboard, 'solar-battery');
    if (solarBatteryFlow) {
      solarBatteryFlow.valueKw = 1.2;
    }
    dashboard.totals.batteryPowerW = 1200;
    return dashboard;
  }),
  makeScenario('battery-discharging', 'Battery discharging', (dashboard) => {
    dashboard.mode = 'battery_saver';
    dashboard.modeSummary = 'Battery is stretching the evening peak and trimming grid draw.';
    dashboard.summary[3] = {
      ...dashboard.summary[3],
      value: '61',
      caption: '% at 1.7 kW discharge',
      tone: 'good',
    };
    const batteryNode = findDashboardNode(dashboard, 'battery');
    if (batteryNode) {
      batteryNode.value = 61;
    }
    const batteryHomeFlow = findDashboardFlow(dashboard, 'battery-home');
    if (batteryHomeFlow) {
      batteryHomeFlow.valueKw = 1.7;
    }
    const gridHomeFlow = findDashboardFlow(dashboard, 'grid-home');
    if (gridHomeFlow) {
      gridHomeFlow.valueKw = 0.2;
    }
    dashboard.totals.batteryPercent = 61;
    dashboard.totals.batteryPowerW = -1700;
    return dashboard;
  }),
  makeScenario('exporting-grid', 'Exporting to grid', (dashboard) => {
    dashboard.mode = 'eco';
    dashboard.summary[2] = {
      ...dashboard.summary[2],
      value: '2.6',
      caption: 'kW export',
      tone: 'good',
    };
    const gridNode = findDashboardNode(dashboard, 'grid');
    if (gridNode) {
      gridNode.value = 2.6;
    }
    dashboard.flows = dashboard.flows.filter((flow) => flow.id !== 'grid-home');
    dashboard.flows.push({
      id: 'home-grid',
      from: 'home',
      to: 'grid',
      valueKw: 2.6,
      valueKwhToday: 12.2,
      direction: 'export',
      sourceType: 'grid',
      active: true,
    });
    dashboard.totals.importW = 0;
    dashboard.totals.exportW = 2600;
    dashboard.totals.exportTodayKWh = 12.2;
    return dashboard;
  }),
  makeScenario('inactive', 'No solar / inactive', (dashboard) => {
    dashboard.mode = 'normal';
    dashboard.modeSummary = 'The home is coasting on grid supply with solar offline.';
    dashboard.nodes = dashboard.nodes.filter((node) => node.id !== 'renewable');
    const solarNode = dashboard.nodes.find((node) => node.id === 'solar');
    if (solarNode) {
      solarNode.value = 0;
      solarNode.status = 'idle';
      solarNode.todayValue = 0;
    }
    dashboard.flows = dashboard.flows.filter(
      (flow) =>
        flow.id !== 'solar-home' && flow.id !== 'solar-battery' && flow.id !== 'renewable-home'
    );
    dashboard.summary[1] = { ...dashboard.summary[1], value: '0.0', caption: 'kW offline' };
    dashboard.summary = dashboard.summary.filter((item) => item.id !== 'renewable');
    dashboard.totals.solarW = 0;
    dashboard.totals.solarTodayKWh = 0;
    return dashboard;
  }),
];

export function getEnergyDashboardScenario(id: string): EnergyDashboardScenario {
  return (
    energyDashboardScenarios.find((scenario) => scenario.id === id) ?? energyDashboardScenarios[0]
  );
}

export function getMockEnergyDashboard(
  range: EnergyRange | 'live' | 'day' = 'today',
  scenarioId = 'default'
): EnergyDashboardModel {
  const dashboard = cloneDashboard(getEnergyDashboardScenario(scenarioId).dashboard);
  dashboard.selectedRange = range === 'live' ? 'now' : range === 'day' ? 'today' : range;
  return dashboard;
}

export function getMockEnergySourceDiagnostics(
  dashboard: EnergyDashboardModel
): EnergySourceDiagnostic[] {
  const diagnostics: EnergySourceDiagnostic[] = [];

  if (dashboard.dataCoverage.hasGridImport) {
    diagnostics.push({
      id: 'grid-import',
      label: 'Grid import',
      entityId: 'sensor.grid_import_energy',
      liveEntityId: 'sensor.grid_import_power',
      status:
        dashboard.totals.importW > 0 || dashboard.totals.importTodayKWh > 0
          ? 'configured_numeric'
          : 'configured_idle',
      currentPowerW: dashboard.totals.importW,
      todayKWh: dashboard.totals.importTodayKWh,
    });
  }

  if (dashboard.dataCoverage.hasGridExport) {
    diagnostics.push({
      id: 'grid-export',
      label: 'Grid export',
      entityId: 'sensor.grid_export_energy',
      liveEntityId: 'sensor.grid_export_power',
      status:
        dashboard.totals.exportW > 0 || dashboard.totals.exportTodayKWh > 0
          ? 'configured_numeric'
          : 'configured_idle',
      currentPowerW: dashboard.totals.exportW,
      todayKWh: dashboard.totals.exportTodayKWh,
    });
  }

  if (dashboard.dataCoverage.hasSolar) {
    diagnostics.push({
      id: 'solar',
      label: 'Solar production',
      entityId: 'sensor.solar_energy',
      liveEntityId: 'sensor.solar_power',
      status:
        dashboard.totals.solarW > 0 || dashboard.totals.solarTodayKWh > 0
          ? 'configured_numeric'
          : 'configured_idle',
      currentPowerW: dashboard.totals.solarW,
      todayKWh: dashboard.totals.solarTodayKWh,
    });
  }

  if (dashboard.dataCoverage.hasGas) {
    diagnostics.push({
      id: 'gas',
      label: 'Gas',
      entityId: 'sensor.gas_energy',
      status: dashboard.totals.gasTodayKWh > 0 ? 'configured_numeric' : 'configured_idle',
      todayKWh: dashboard.totals.gasTodayKWh,
    });
  }

  return diagnostics;
}

export function getMockEnergyOverview(range: EnergyRange | 'live' | 'day'): EnergyOverview {
  const dashboard = getMockEnergyDashboard(range);
  const normalizedRange = range === 'live' ? 'now' : range === 'day' ? 'today' : range;
  const flow: EnergyFlowDatum[] = dashboard.flows
    .filter((item) => item.active)
    .map((item) => ({
      id: item.id,
      label: `${dashboard.nodes.find((node) => node.id === item.from)?.label ?? item.from} → ${dashboard.nodes.find((node) => node.id === item.to)?.label ?? item.to}`,
      value: item.valueKw,
      direction: item.to === 'home' ? (item.from === 'battery' ? 'storage' : 'source') : 'sink',
      tone:
        item.sourceType === 'solar'
          ? 'solar'
          : item.sourceType === 'battery'
            ? 'battery'
            : item.sourceType === 'grid'
              ? 'grid'
              : item.sourceType === 'gas'
                ? 'heating'
                : 'load',
    }));

  const liveStats: EnergyStat[] = dashboard.summary.map((metric) => ({
    label: metric.label,
    value: `${metric.value}${metric.caption ? ` ${metric.caption}` : ''}`.trim(),
    tone: metric.tone,
  }));

  return {
    liveStats,
    flow,
    trend: dashboard.ranges[normalizedRange].liveConsumption,
    topConsumers: dashboard.topConsumers,
    insights: dashboard.insights,
    totals: {
      currentLoadW: dashboard.totals.currentLoadW,
      solarW: dashboard.totals.solarW,
      batteryPercent: dashboard.totals.batteryPercent,
      batteryPowerW: dashboard.totals.batteryPowerW,
      importW: dashboard.totals.importW,
      exportW: dashboard.totals.exportW,
      importTodayKWh: dashboard.totals.importTodayKWh,
      exportTodayKWh: dashboard.totals.exportTodayKWh,
      solarTodayKWh: dashboard.totals.solarTodayKWh,
      gasTodayKWh: dashboard.totals.gasTodayKWh,
      hotWaterTodayKWh: dashboard.topConsumers
        .filter((consumer) => consumer.category === 'water_heater')
        .reduce((sum, consumer) => sum + consumer.energyKWh, 0),
      costToday: dashboard.totals.costToday,
      projectedMonthCost: dashboard.totals.projectedMonthCost,
    },
    nodes,
  };
}
