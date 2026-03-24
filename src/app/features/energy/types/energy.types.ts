export type EnergyRange = 'live' | 'day' | 'week' | 'month';

export type EnergyResourceType =
  | 'electricity'
  | 'solar'
  | 'battery'
  | 'grid_import'
  | 'grid_export'
  | 'gas'
  | 'hot_water'
  | 'heating';

export type EnergyConsumerCategory =
  | 'ev_charger'
  | 'water_heater'
  | 'toilet_heater'
  | 'bathroom_heater'
  | 'floor_heating'
  | 'hvac'
  | 'washer'
  | 'dryer'
  | 'dishwasher'
  | 'other';

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

export interface EnergyInsight {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  affectedNodeIds: string[];
}

// ─── User-facing source configuration ──────────────────────────────────────

export interface EnergyDeviceSource {
  /** kWh statistics entity — also used as the device's stable id */
  entityId: string;
  name: string;
  category: EnergyConsumerCategory;
  /** Live W sensor (optional — consumers widget shows 0 W if absent) */
  powerEntityId?: string;
}

export interface EnergySourceConfig {
  // Live power (W) — drives status cards, flow diagram, and storage gauges.
  // Convention for batteryPowerEntityId: positive = charging, negative = discharging.
  solarPowerEntityId?: string;
  batterySocEntityId?: string;
  batteryPowerEntityId?: string;
  gridImportPowerEntityId?: string;
  gridExportPowerEntityId?: string;
  /** Optional — derived as solar + import − export when absent */
  homeLoadPowerEntityId?: string;

  // Cumulative energy (kWh statistics) — used by the trend chart.
  solarEnergyEntityId?: string;
  gridImportEnergyEntityId?: string;
  gridExportEnergyEntityId?: string;

  /** Individual appliance monitors */
  devices: EnergyDeviceSource[];
}

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
    importW: number;
    exportW: number;
    importTodayKWh: number;
    solarTodayKWh: number;
    gasTodayKWh: number;
    hotWaterTodayKWh: number;
    costToday: number;
    projectedMonthCost: number;
  };
  nodes: EnergyNode[];
}
