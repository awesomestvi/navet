import { useCallback, useEffect, useMemo, useState } from 'react';
import { shallow } from 'zustand/shallow';
import { useHomeAssistant } from '@/app/hooks';
import { homeAssistantHistoryFeatureService } from '@/app/services/home-assistant-history-feature.service';
import type { HomeAssistantStore } from '@/app/stores/home-assistant-store';
import { homeAssistantSelectors } from '@/app/stores/selectors';
import { haEntityStructureEqual } from '@/app/utils/ha-entity-structure-equal';
import { HEATING_CATEGORIES } from '../data/energy-constants';
import { getMockEnergyOverview } from '../data/mock-energy-dashboard';
import {
  augmentConfigWithLivePowerEntities,
  getEnergyPrefs,
  mapPrefsToConfig,
} from '../services/energy-ha-service';
import type {
  EnergyConsumer,
  EnergyDeviceSource,
  EnergyFlowDatum,
  EnergyOverview,
  EnergyRange,
  EnergySourceConfig,
  EnergySourceDiagnostic,
  EnergyStat,
} from '../types/energy.types';
import { useEnergyStatisticsToday } from './use-energy-statistics-today';

export type EnergyEntityMap = Record<
  string,
  {
    entity_id?: string;
    state: string;
    attributes?: Record<string, unknown>;
  }
>;

function parseW(state: string | undefined): number {
  const n = parseFloat(state ?? '');
  return Number.isFinite(n) ? n : 0;
}

function parsePct(state: string | undefined): number {
  const n = parseFloat(state ?? '');
  return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0;
}

function parseNumberState(state: string | undefined): number | null {
  const n = Number.parseFloat(state ?? '');
  return Number.isFinite(n) ? n : null;
}

function getEntityFriendlyName(entities: EnergyEntityMap | null | undefined, entityId?: string) {
  const friendlyName = entities?.[entityId ?? '']?.attributes?.friendly_name;
  return typeof friendlyName === 'string' && friendlyName.trim().length > 0
    ? friendlyName.trim()
    : undefined;
}

function buildLiveStats(
  config: EnergySourceConfig,
  homeLoadW: number,
  solarW: number,
  batterySoc: number,
  gridImportW: number,
  gridExportW: number
): EnergyStat[] {
  return [
    { label: 'Home Load', value: `${(homeLoadW / 1000).toFixed(1)} kW`, tone: 'default' },
    ...(config.solarPowerEntityId
      ? [
          {
            label: 'Solar',
            value: `${(solarW / 1000).toFixed(1)} kW`,
            tone: (solarW > 0 ? 'good' : 'default') as EnergyStat['tone'],
          },
        ]
      : []),
    ...(config.batterySocEntityId
      ? [
          {
            label: 'Battery',
            value: `${batterySoc.toFixed(0)}%`,
            tone: (batterySoc > 30
              ? 'good'
              : batterySoc > 10
                ? 'warn'
                : 'critical') as EnergyStat['tone'],
          },
        ]
      : []),
    ...(config.gridImportPowerEntityId || config.gridExportPowerEntityId
      ? [
          {
            label: 'Grid',
            value:
              gridImportW > 0
                ? `${(gridImportW / 1000).toFixed(1)} kW import`
                : `${(gridExportW / 1000).toFixed(1)} kW export`,
            tone: (gridImportW > 0 ? 'warn' : 'good') as EnergyStat['tone'],
          },
        ]
      : []),
  ];
}

function hasEnergySourceConfig(config: EnergySourceConfig | null): config is EnergySourceConfig {
  return Boolean(
    config &&
      (config.solarEnergyEntityId ||
        config.gridImportEnergyEntityId ||
        config.gridExportEnergyEntityId ||
        config.gasEnergyEntityId ||
        config.hotWaterEnergyEntityId ||
        config.devices.length > 0)
  );
}

function buildFlow(
  solarW: number,
  batteryDischargeW: number,
  batteryChargeW: number,
  gridImportW: number,
  gridExportW: number,
  homeLoadW: number
): EnergyFlowDatum[] {
  const flow: EnergyFlowDatum[] = [];
  if (solarW > 0)
    flow.push({
      id: 'solar',
      label: 'Solar',
      value: +(solarW / 1000).toFixed(2),
      direction: 'source',
      tone: 'solar',
    });
  if (batteryDischargeW > 0)
    flow.push({
      id: 'battery',
      label: 'Battery Discharge',
      value: +(batteryDischargeW / 1000).toFixed(2),
      direction: 'storage',
      tone: 'battery',
    });
  if (batteryChargeW > 0)
    flow.push({
      id: 'battery-charge',
      label: 'Battery Charging',
      value: +(batteryChargeW / 1000).toFixed(2),
      direction: 'sink',
      tone: 'battery',
    });
  if (gridImportW > 0)
    flow.push({
      id: 'grid',
      label: 'Grid Import',
      value: +(gridImportW / 1000).toFixed(2),
      direction: 'source',
      tone: 'grid',
    });
  if (gridExportW > 0)
    flow.push({
      id: 'grid-export',
      label: 'Grid Export',
      value: +(gridExportW / 1000).toFixed(2),
      direction: 'source',
      tone: 'grid',
    });
  if (homeLoadW > 0)
    flow.push({
      id: 'home',
      label: 'Home Load',
      value: +(homeLoadW / 1000).toFixed(2),
      direction: 'sink',
      tone: 'load',
    });
  return flow;
}

function buildConsumers(
  devices: EnergyDeviceSource[],
  entities: EnergyEntityMap | null | undefined,
  todayKWh: Record<string, number>,
  homeLoadW: number
): EnergyConsumer[] {
  return devices
    .filter((device) => {
      const energyValue = parseNumberState(entities?.[device.entityId]?.state);
      const powerValue = parseNumberState(entities?.[device.powerEntityId ?? '']?.state);
      const statisticsEnergyKWh = todayKWh[device.entityId];
      return energyValue !== null || powerValue !== null || (statisticsEnergyKWh ?? 0) > 0;
    })
    .map((device) => {
      const powerW = parseW(entities?.[device.powerEntityId ?? '']?.state);
      // Device totals are "today" values, so only use daily statistics here.
      // Falling back to the raw entity state is often a lifetime cumulative kWh
      // total, which is misleading in this widget.
      const statisticsEnergyKWh = todayKWh[device.entityId];
      const energyKWh =
        typeof statisticsEnergyKWh === 'number' && statisticsEnergyKWh > 0
          ? statisticsEnergyKWh
          : 0;
      return {
        id: device.entityId,
        name:
          getEntityFriendlyName(entities, device.powerEntityId) ??
          getEntityFriendlyName(entities, device.entityId) ??
          device.name,
        category: device.category,
        powerEntityId: device.powerEntityId,
        powerW,
        energyKWh,
        shareOfLoad: homeLoadW > 0 ? powerW / homeLoadW : 0,
        costToday: 0,
        status: (powerW > 10 ? 'active' : 'idle') as EnergyConsumer['status'],
      };
    })
    .sort((a, b) => b.energyKWh - a.energyKWh || b.powerW - a.powerW);
}

function getSourceDiagnosticStatus(
  entities: EnergyEntityMap | null | undefined,
  entityId?: string,
  liveEntityId?: string,
  todayKWh?: number
): EnergySourceDiagnostic['status'] {
  if (!entityId && !liveEntityId) {
    return 'not_configured';
  }

  const energyValue = parseNumberState(entities?.[entityId ?? '']?.state);
  const liveValue = parseNumberState(entities?.[liveEntityId ?? '']?.state);
  const entityState = entityId ? entities?.[entityId]?.state : undefined;
  const liveState = liveEntityId ? entities?.[liveEntityId]?.state : undefined;
  const hasUnavailableEntity =
    (entityId && entityState !== undefined && energyValue === null) ||
    (liveEntityId && liveState !== undefined && liveValue === null);

  if (hasUnavailableEntity && energyValue === null && liveValue === null) {
    return 'configured_unavailable';
  }

  const hasNumericValue = energyValue !== null || liveValue !== null || (todayKWh ?? 0) > 0;

  if (!hasNumericValue) {
    return 'configured_unavailable';
  }

  const hasNonZeroValue =
    (energyValue ?? 0) > 0 || (liveValue ?? 0) > 0 || (todayKWh !== undefined && todayKWh > 0);

  return hasNonZeroValue ? 'configured_numeric' : 'configured_idle';
}

function getConfiguredDevicePowerW(
  devices: EnergyDeviceSource[],
  entities: EnergyEntityMap | null | undefined
): number {
  return devices.reduce((total, device) => {
    if (!device.powerEntityId) {
      return total;
    }

    return total + Math.max(0, parseW(entities?.[device.powerEntityId]?.state));
  }, 0);
}

function parseEnergyKWh(entity: EnergyEntityMap[string] | undefined): number | null {
  const value = parseNumberState(entity?.state);
  if (value === null) {
    return null;
  }

  const unit = String(
    entity?.attributes?.unit_of_measurement ?? entity?.attributes?.native_unit_of_measurement ?? ''
  ).toLowerCase();

  if (unit === 'wh') {
    return value / 1000;
  }

  if (unit === 'mwh') {
    return value * 1000;
  }

  return value;
}

function isLikelyDailyEnergyEntity(entity: EnergyEntityMap[string] | undefined, entityId: string) {
  const attributes = entity?.attributes ?? {};
  const label = `${entityId} ${String(attributes.friendly_name ?? '')}`.toLowerCase();

  return (
    label.includes('today') ||
    label.includes('daily') ||
    label.includes('current_day') ||
    label.includes('this_day') ||
    typeof attributes.last_reset === 'string'
  );
}

export function resolveTodayEnergyKWh(
  entities: EnergyEntityMap | null | undefined,
  entityId: string | undefined,
  statisticsKWh: number | undefined
): number {
  const statisticsValue =
    typeof statisticsKWh === 'number' && Number.isFinite(statisticsKWh) && statisticsKWh > 0
      ? statisticsKWh
      : 0;

  if (!entityId) {
    return statisticsValue;
  }

  const entity = entities?.[entityId];
  const stateValue = parseEnergyKWh(entity);
  if (stateValue === null || stateValue < 0) {
    return statisticsValue;
  }

  if (isLikelyDailyEnergyEntity(entity, entityId)) {
    return Math.max(statisticsValue, stateValue);
  }

  const aheadOfRecorderBy = stateValue - statisticsValue;
  const looksLikeCurrentDayTotal =
    statisticsValue > 0 &&
    stateValue <= 200 &&
    aheadOfRecorderBy > 0 &&
    aheadOfRecorderBy <= Math.max(2, statisticsValue * 0.25);

  return looksLikeCurrentDayTotal ? stateValue : statisticsValue;
}

function createEmptyOverview(): EnergyOverview {
  return {
    liveStats: [],
    flow: [],
    trend: [],
    topConsumers: [],
    insights: [],
    totals: {
      currentLoadW: 0,
      solarW: 0,
      batteryPercent: 0,
      importW: 0,
      exportW: 0,
      importTodayKWh: 0,
      solarTodayKWh: 0,
      gasTodayKWh: 0,
      hotWaterTodayKWh: 0,
      costToday: 0,
      projectedMonthCost: 0,
    },
    nodes: [],
  };
}

type HaWsErrorLike = {
  code?: unknown;
  message?: unknown;
};

export function isMissingEnergyPrefsError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const { code, message } = error as HaWsErrorLike;
  return code === 'not_found' && message === 'No prefs';
}

/**
 * Reads live HA entity states for each configured source and builds an
 * EnergyOverview. When no energy sources are configured yet, it returns an
 * empty overview so the section can render a proper empty state.
 *
 * Trend data uses mock values for configured dashboards — a follow-up will
 * replace this with recorder/statistics_during_period once the setup flow is
 * validated.
 */
export function useEnergyHaData(range: EnergyRange): {
  energySourceDiagnostics: EnergySourceDiagnostic[];
  hasEnergyStatisticsLoaded: boolean;
  overview: EnergyOverview;
  isConfigured: boolean;
  currentLoadStatisticId?: string;
  haSourceConfig: EnergySourceConfig | null;
} {
  const connection = useHomeAssistant(homeAssistantSelectors.connection);
  const entityStructure = useHomeAssistant(homeAssistantSelectors.entities, haEntityStructureEqual);
  const entityRegistry = useHomeAssistant(homeAssistantSelectors.entityRegistry, shallow);
  const [haSourceConfig, setHaSourceConfig] = useState<EnergySourceConfig | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchEnergyPrefs() {
      const activeMessageClient =
        connection ?? homeAssistantHistoryFeatureService.getMessageClient();
      if (!activeMessageClient) {
        setHaSourceConfig(null);
        return;
      }

      try {
        const prefs = await getEnergyPrefs(activeMessageClient);
        if (!cancelled) {
          setHaSourceConfig(mapPrefsToConfig(prefs));
        }
      } catch (error) {
        if (!isMissingEnergyPrefsError(error)) {
          console.error('[EnergyHaData] Failed to fetch Home Assistant energy prefs:', error);
        }
        if (!cancelled) {
          setHaSourceConfig(null);
        }
      }
    }

    void fetchEnergyPrefs();

    return () => {
      cancelled = true;
    };
  }, [connection]);

  const isConfigured = hasEnergySourceConfig(haSourceConfig);
  const runtimeSourceConfig = useMemo(
    () =>
      haSourceConfig && entityStructure
        ? augmentConfigWithLivePowerEntities(haSourceConfig, entityStructure, entityRegistry)
        : haSourceConfig,
    [entityRegistry, entityStructure, haSourceConfig]
  );

  // Build the list of entity IDs that are directly named in the config. This
  // drives a narrow subscription so we only re-render when a relevant entity
  // changes instead of on every HA entity update.
  const configEntityIds = useMemo(() => {
    if (!runtimeSourceConfig) return [] as string[];
    return [
      runtimeSourceConfig.solarPowerEntityId,
      runtimeSourceConfig.batterySocEntityId,
      runtimeSourceConfig.batteryPowerEntityId,
      runtimeSourceConfig.gridImportPowerEntityId,
      runtimeSourceConfig.gridExportPowerEntityId,
      runtimeSourceConfig.homeLoadPowerEntityId,
      runtimeSourceConfig.gridImportEnergyEntityId,
      runtimeSourceConfig.gridExportEnergyEntityId,
      runtimeSourceConfig.solarEnergyEntityId,
      runtimeSourceConfig.gasEnergyEntityId,
      runtimeSourceConfig.hotWaterEnergyEntityId,
      ...runtimeSourceConfig.devices.flatMap((d) => [d.entityId, d.powerEntityId].filter(Boolean)),
    ].filter((id): id is string => Boolean(id));
  }, [runtimeSourceConfig]);

  const configEntitySelector = useCallback(
    (state: HomeAssistantStore) => {
      const entities = state.entities;
      if (!entities || !configEntityIds.length) return null as EnergyEntityMap | null;
      const result: EnergyEntityMap = {};
      for (const id of configEntityIds) {
        const entity = entities[id];
        if (entity) result[id] = entity;
      }
      return result;
    },
    [configEntityIds]
  );

  // Subscribe only to the configured entity IDs. shallow equality prevents
  // re-renders when the same entity references are returned.
  const configEntities = useHomeAssistant(configEntitySelector, shallow);

  const energyStatisticIds = useMemo(() => {
    if (!haSourceConfig) {
      return [];
    }

    return [
      haSourceConfig.gridImportEnergyEntityId,
      haSourceConfig.gridExportEnergyEntityId,
      haSourceConfig.solarEnergyEntityId,
      haSourceConfig.gasEnergyEntityId,
      haSourceConfig.hotWaterEnergyEntityId,
      ...haSourceConfig.devices.map((device) => device.entityId),
    ].filter((id): id is string => Boolean(id));
  }, [haSourceConfig]);

  const todayStatistics = useEnergyStatisticsToday(energyStatisticIds);
  const todayKWh = todayStatistics.values;
  const energySourceDiagnostics = useMemo<EnergySourceDiagnostic[]>(() => {
    if (!haSourceConfig) {
      return [];
    }

    const config = runtimeSourceConfig ?? haSourceConfig;
    const entries: EnergySourceDiagnostic[] = [];
    const addEntry = (
      id: string,
      label: string,
      entityId: string | undefined,
      liveEntityId?: string
    ) => {
      if (!entityId && !liveEntityId) {
        return;
      }

      entries.push({
        id,
        label:
          getEntityFriendlyName(configEntities, liveEntityId) ??
          getEntityFriendlyName(configEntities, entityId) ??
          label,
        entityId,
        liveEntityId,
        status: getSourceDiagnosticStatus(
          configEntities,
          entityId,
          liveEntityId,
          entityId ? todayKWh[entityId] : undefined
        ),
        currentPowerW: liveEntityId
          ? (parseNumberState(configEntities?.[liveEntityId]?.state) ?? 0)
          : undefined,
        todayKWh: entityId ? (todayKWh[entityId] ?? 0) : undefined,
      });
    };

    addEntry(
      'grid-import',
      'Grid import',
      haSourceConfig.gridImportEnergyEntityId,
      config.gridImportPowerEntityId
    );
    addEntry(
      'grid-export',
      'Grid export',
      haSourceConfig.gridExportEnergyEntityId,
      config.gridExportPowerEntityId
    );
    addEntry(
      'solar',
      'Solar production',
      haSourceConfig.solarEnergyEntityId,
      config.solarPowerEntityId
    );
    addEntry('gas', 'Gas', haSourceConfig.gasEnergyEntityId);
    addEntry('hot-water', 'Hot water', haSourceConfig.hotWaterEnergyEntityId);

    for (const device of haSourceConfig.devices) {
      const runtimeDevice = config.devices.find(
        (candidate) => candidate.entityId === device.entityId
      );
      addEntry(
        `device:${device.entityId}`,
        device.name,
        device.entityId,
        runtimeDevice?.powerEntityId
      );
    }

    return entries;
  }, [configEntities, haSourceConfig, runtimeSourceConfig, todayKWh]);

  const { overview, currentLoadStatisticId } = useMemo(() => {
    if (!isConfigured || !runtimeSourceConfig) {
      return { overview: createEmptyOverview(), currentLoadStatisticId: undefined };
    }

    const config = runtimeSourceConfig;
    const entities = configEntities;
    const solarW = parseW(entities?.[config.solarPowerEntityId ?? '']?.state);
    const batterySoc = parsePct(entities?.[config.batterySocEntityId ?? '']?.state);
    const batteryPowerRaw = parseW(entities?.[config.batteryPowerEntityId ?? '']?.state);
    const gridImportW = parseW(entities?.[config.gridImportPowerEntityId ?? '']?.state);
    const gridExportW = parseW(entities?.[config.gridExportPowerEntityId ?? '']?.state);
    // batteryPowerRaw sign convention: positive = charging, negative = discharging
    const batteryDischargeW = batteryPowerRaw < 0 ? Math.abs(batteryPowerRaw) : 0;
    const batteryChargeW = batteryPowerRaw > 0 ? batteryPowerRaw : 0;
    const monitoredDevicePowerW = getConfiguredDevicePowerW(config.devices, entities);
    const derivedHomeLoadW = Math.max(
      0,
      solarW + gridImportW + batteryDischargeW - gridExportW - batteryChargeW
    );
    const configuredHomeLoadW = config.homeLoadPowerEntityId
      ? parseW(entities?.[config.homeLoadPowerEntityId]?.state)
      : 0;
    const homeLoadW = Math.max(configuredHomeLoadW, derivedHomeLoadW, monitoredDevicePowerW);
    const currentLoadStatisticId = config.homeLoadPowerEntityId;

    return {
      overview: {
        liveStats: buildLiveStats(config, homeLoadW, solarW, batterySoc, gridImportW, gridExportW),
        flow: buildFlow(
          solarW,
          batteryDischargeW,
          batteryChargeW,
          gridImportW,
          gridExportW,
          homeLoadW
        ),
        trend: getMockEnergyOverview(range).trend, // replaced by statistics in follow-up
        topConsumers: buildConsumers(config.devices, entities, todayKWh, homeLoadW),
        insights: [],
        totals: {
          currentLoadW: homeLoadW,
          solarW,
          batteryPercent: batterySoc,
          importW: gridImportW,
          exportW: gridExportW,
          importTodayKWh: resolveTodayEnergyKWh(
            entities,
            config.gridImportEnergyEntityId,
            config.gridImportEnergyEntityId ? todayKWh[config.gridImportEnergyEntityId] : undefined
          ),
          exportTodayKWh: resolveTodayEnergyKWh(
            entities,
            config.gridExportEnergyEntityId,
            config.gridExportEnergyEntityId ? todayKWh[config.gridExportEnergyEntityId] : undefined
          ),
          solarTodayKWh: resolveTodayEnergyKWh(
            entities,
            config.solarEnergyEntityId,
            config.solarEnergyEntityId ? todayKWh[config.solarEnergyEntityId] : undefined
          ),
          gasTodayKWh: resolveTodayEnergyKWh(
            entities,
            config.gasEnergyEntityId,
            config.gasEnergyEntityId ? todayKWh[config.gasEnergyEntityId] : undefined
          ),
          hotWaterTodayKWh: resolveTodayEnergyKWh(
            entities,
            config.hotWaterEnergyEntityId,
            config.hotWaterEnergyEntityId ? todayKWh[config.hotWaterEnergyEntityId] : undefined
          ),
          costToday: 0,
          projectedMonthCost: 0,
        },
        nodes: config.devices.map((device) => ({
          id: device.entityId,
          name: device.name,
          kind: 'consumer' as const,
          resourceType: HEATING_CATEGORIES.has(device.category)
            ? ('heating' as const)
            : ('electricity' as const),
          category: device.category,
          entityIds: [device.entityId, ...(device.powerEntityId ? [device.powerEntityId] : [])],
        })),
      },
      currentLoadStatisticId,
    };
  }, [runtimeSourceConfig, configEntities, isConfigured, range, todayKWh]);

  return {
    energySourceDiagnostics,
    hasEnergyStatisticsLoaded: todayStatistics.hasLoaded,
    overview,
    isConfigured,
    currentLoadStatisticId,
    haSourceConfig,
  };
}
