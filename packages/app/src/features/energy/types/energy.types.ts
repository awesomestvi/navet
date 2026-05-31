export type EnergyRange = 'now' | 'today' | 'week' | 'month';
export type LegacyEnergyRange = 'live' | 'day';

export type EnergyNodeId = 'home' | 'solar' | 'grid' | 'battery' | 'gas' | 'renewable';
export type EnergyDashboardMode = 'eco' | 'normal' | 'peak' | 'battery_saver';
export type EnergyNodeIcon = 'home' | 'solar' | 'grid' | 'battery' | 'gas' | 'renewable';
export type EnergyNodeUnit = 'kW' | 'kWh' | '%' | '$';
export type EnergyNodeStatus = 'active' | 'idle' | 'warning' | 'error' | 'unavailable';
export type EnergyFlowDirection =
  | 'import'
  | 'export'
  | 'charge'
  | 'discharge'
  | 'consume'
  | 'produce';
export type EnergyFlowSourceType = 'solar' | 'grid' | 'battery' | 'gas' | 'renewable' | 'home';

export type EnergyResourceType =
  | 'electricity'
  | 'solar'
  | 'battery'
  | 'grid_import'
  | 'grid_export'
  | 'gas'
  | 'hot_water'
  | 'heating';

export type {
  EnergyConsumerCategory,
  EnergyDeviceSource,
  EnergySourceConfig,
} from '@navet/core/energy-types';

import type { EnergyConsumerCategory } from '@navet/core/energy-types';

export type EnergyWidgetId =
  | 'status'
  | 'flow'
  | 'consumers'
  | 'cost'
  | 'trend'
  | 'battery'
  | 'storage'
  | 'heating'
  | 'insights';

export interface EnergyFlow {
  id: string;
  from: EnergyNodeId;
  to: EnergyNodeId;
  valueKw: number;
  valueKwhToday?: number;
  direction: EnergyFlowDirection;
  sourceType: EnergyFlowSourceType;
  active: boolean;
}

export interface EnergyDashboardNode {
  id: EnergyNodeId;
  label: string;
  icon: EnergyNodeIcon;
  value: number;
  unit: EnergyNodeUnit;
  todayValue?: number;
  todayUnit?: EnergyNodeUnit;
  status?: EnergyNodeStatus;
}

export interface EnergySummaryMetric {
  id: string;
  label: string;
  value: string;
  caption?: string;
  tone?: 'default' | 'good' | 'warn' | 'critical';
}

export interface EnergyBreakdownDatum {
  id: string;
  label: string;
  value: number;
  unit: 'kWh' | '$';
  tone: EnergyFlowSourceType | 'cost' | 'load';
  alert?: boolean;
}

export interface EnergyForecastPoint {
  label: string;
  value: number;
}

export interface EnergyRangeSnapshot {
  id: EnergyRange;
  totalUsageKWh: number;
  solarProductionKWh: number;
  gridImportKWh: number;
  gridExportKWh: number;
  estimatedCost: number;
  liveConsumption: EnergySeriesPoint[];
  energyBreakdown: EnergyBreakdownDatum[];
  costBreakdown: EnergyBreakdownDatum[];
  batteryForecast: EnergyForecastPoint[];
}

export interface EnergyWhatChanged {
  title: string;
  description: string;
  tone: 'default' | 'good' | 'warn';
}

export interface EnergyNode {
  id: string;
  name: string;
  kind: 'source' | 'storage' | 'consumer' | 'meter' | 'derived';
  resourceType: EnergyResourceType;
  category?: EnergyConsumerCategory;
  entityIds: string[];
  room?: string;
  system?: string;
}

export interface EnergyStat {
  label: string;
  value: string;
  tone?: 'default' | 'good' | 'warn' | 'critical';
}

export interface EnergySeriesPoint {
  label: string;
  value: number;
  secondaryValue?: number;
  timestampMs?: number;
  endTimestampMs?: number;
  minValue?: number;
  maxValue?: number;
}

export interface EnergyFlowDatum {
  id: string;
  label: string;
  value: number;
  direction: 'source' | 'storage' | 'sink';
  tone: 'solar' | 'battery' | 'grid' | 'heating' | 'load';
}

export interface EnergyConsumer {
  id: string;
  name: string;
  category: EnergyConsumerCategory;
  powerEntityId?: string;
  powerW: number;
  energyKWh: number;
  shareOfLoad: number;
  costToday: number;
  status: 'active' | 'idle' | 'standby';
  room?: string;
}

export type EnergySourceDiagnosticStatus =
  | 'configured_numeric'
  | 'configured_idle'
  | 'configured_unavailable'
  | 'not_configured';

export interface EnergySourceDiagnostic {
  id: string;
  label: string;
  entityId?: string;
  liveEntityId?: string;
  status: EnergySourceDiagnosticStatus;
  currentPowerW?: number;
  todayKWh?: number;
}

export interface EnergyInsight {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  affectedNodeIds: string[];
}

export interface EnergyDashboardModel {
  mode: EnergyDashboardMode;
  modeSummary: string;
  summary: EnergySummaryMetric[];
  nodes: EnergyDashboardNode[];
  flows: EnergyFlow[];
  ranges: Record<EnergyRange, EnergyRangeSnapshot>;
  selectedRange: EnergyRange;
  insights: EnergyInsight[];
  whatChanged: EnergyWhatChanged;
  topConsumers: EnergyConsumer[];
  dataCoverage: {
    hasLiveLoad: boolean;
    hasGridImport: boolean;
    hasGridExport: boolean;
    hasSolar: boolean;
    hasBattery: boolean;
    hasGas: boolean;
    hasHotWater: boolean;
    hasCost: boolean;
    hasTrackedDevices: boolean;
  };
  totals: {
    currentLoadW: number;
    solarW: number;
    batteryPercent: number;
    batteryPowerW: number;
    importW: number;
    exportW: number;
    importTodayKWh: number;
    exportTodayKWh: number;
    solarTodayKWh: number;
    gasTodayKWh: number;
    renewableSharePct: number;
    costToday: number;
    projectedMonthCost: number;
  };
}

// ─── User-facing source configuration ──────────────────────────────────────

// ─── Overview model ─────────────────────────────────────────────────────────

export interface EnergyOverview {
  liveStats: EnergyStat[];
  flow: EnergyFlowDatum[];
  trend: EnergySeriesPoint[];
  topConsumers: EnergyConsumer[];
  insights: EnergyInsight[];
  totals: {
    currentLoadW: number;
    solarW: number;
    batteryPercent: number;
    batteryPowerW?: number;
    importW: number;
    exportW: number;
    importTodayKWh: number;
    exportTodayKWh?: number;
    solarTodayKWh: number;
    gasTodayKWh: number;
    hotWaterTodayKWh: number;
    costToday: number;
    projectedMonthCost: number;
  };
  nodes: EnergyNode[];
}

export interface EnergyDashboardScenario {
  id: string;
  label: string;
  dashboard: EnergyDashboardModel;
}
