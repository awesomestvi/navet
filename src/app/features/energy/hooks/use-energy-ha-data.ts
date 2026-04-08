import { useCallback, useDeferredValue, useMemo } from 'react';
import { shallow } from 'zustand/shallow';
import { useHomeAssistant } from '@/app/hooks';
import type { HomeAssistantStore } from '@/app/stores/home-assistant-store';
import { homeAssistantSelectors } from '@/app/stores/selectors';
import { HEATING_CATEGORIES } from '../data/energy-constants';
import { getMockEnergyOverview } from '../data/mock-energy-dashboard';
import { useEnergyDashboardStore } from '../stores/energy-dashboard-store';
import type {
  EnergyConsumer,
  EnergyDeviceSource,
  EnergyFlowDatum,
  EnergyOverview,
  EnergyRange,
  EnergySourceConfig,
  EnergyStat,
} from '../types/energy.types';
import { useEnergyStatisticsToday } from './use-energy-statistics-today';

type EntityMap = Record<
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
  entities: EntityMap | null | undefined,
  todayKWh: Record<string, number>,
  homeLoadW: number
): EnergyConsumer[] {
  return devices
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
        name: device.name,
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

function getConfiguredDevicePowerW(
  devices: EnergyDeviceSource[],
  entities: EntityMap | null | undefined
): number {
  return devices.reduce((total, device) => {
    if (!device.powerEntityId) {
      return total;
    }

    return total + Math.max(0, parseW(entities?.[device.powerEntityId]?.state));
  }, 0);
}

function getInferredHomeLoadPowerSensor(entities: EntityMap | null | undefined): {
  entityId?: string;
  watts: number;
} {
  if (!entities) {
    return { entityId: undefined, watts: 0 };
  }

  const candidates = Object.entries(entities)
    .filter(([entityId, entity]) => {
      if (!entityId.startsWith('sensor.')) {
        return false;
      }

      const unit = String(
        entity.attributes?.unit_of_measurement ??
          entity.attributes?.native_unit_of_measurement ??
          ''
      ).toUpperCase();
      const deviceClass = String(entity.attributes?.device_class ?? '').toLowerCase();
      return deviceClass === 'power' && unit === 'W';
    })
    .map(([entityId, entity]) => {
      const friendlyName = String(entity.attributes?.friendly_name ?? '').toLowerCase();
      const haystack = `${entityId} ${friendlyName}`.toLowerCase();

      let score = 0;
      if (haystack.includes('instantaneous_demand') || haystack.includes('instantaneous demand')) {
        score += 100;
      }
      if (
        haystack.includes('home load') ||
        haystack.includes('home_load') ||
        haystack.includes('house power') ||
        haystack.includes('active power') ||
        haystack.includes('total power') ||
        haystack.includes('main power') ||
        haystack.includes('demand')
      ) {
        score += 30;
      }
      if (
        haystack.includes('solar') ||
        haystack.includes('battery') ||
        haystack.includes('grid import') ||
        haystack.includes('grid export') ||
        haystack.includes('grid_') ||
        haystack.includes('pv') ||
        haystack.includes('charger')
      ) {
        score -= 40;
      }

      return {
        entityId,
        score,
        watts: parseW(entity.state),
      };
    })
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => right.score - left.score);

  return {
    entityId: candidates[0]?.entityId,
    watts: candidates[0]?.watts ?? 0,
  };
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
  overview: EnergyOverview;
  isConfigured: boolean;
  currentLoadStatisticId?: string;
} {
  const sourceConfig = useEnergyDashboardStore((s) => s.sourceConfig);

  // Build the list of entity IDs that are directly named in the config. This
  // drives a narrow subscription so we only re-render when a relevant entity
  // changes instead of on every HA entity update.
  const configEntityIds = useMemo(() => {
    if (!sourceConfig) return [] as string[];
    return [
      sourceConfig.solarPowerEntityId,
      sourceConfig.batterySocEntityId,
      sourceConfig.batteryPowerEntityId,
      sourceConfig.gridImportPowerEntityId,
      sourceConfig.gridExportPowerEntityId,
      sourceConfig.homeLoadPowerEntityId,
      sourceConfig.gridImportEnergyEntityId,
      sourceConfig.solarEnergyEntityId,
      ...sourceConfig.devices.flatMap((d) => [d.entityId, d.powerEntityId].filter(Boolean)),
    ].filter((id): id is string => Boolean(id));
  }, [sourceConfig]);

  const configEntitySelector = useCallback(
    (state: HomeAssistantStore) => {
      const entities = state.entities;
      if (!entities || !configEntityIds.length) return null as EntityMap | null;
      const result: EntityMap = {};
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

  // Full entity scan needed only to infer a home-load sensor when none is
  // explicitly configured. Deferred so it does not block urgent renders.
  const allEntitiesDeferred = useDeferredValue(useHomeAssistant(homeAssistantSelectors.entities));
  const needsInference = sourceConfig !== null && !sourceConfig.homeLoadPowerEntityId;
  const inferredHomeLoad = useMemo(
    () =>
      needsInference
        ? getInferredHomeLoadPowerSensor(allEntitiesDeferred)
        : { entityId: undefined as string | undefined, watts: 0 },
    [needsInference, allEntitiesDeferred]
  );

  const todayKWh = useEnergyStatisticsToday(sourceConfig);

  const { overview, currentLoadStatisticId } = useMemo(() => {
    if (!sourceConfig) {
      return { overview: createEmptyOverview(), currentLoadStatisticId: undefined };
    }

    const entities = configEntities;
    const solarW = parseW(entities?.[sourceConfig.solarPowerEntityId ?? '']?.state);
    const batterySoc = parsePct(entities?.[sourceConfig.batterySocEntityId ?? '']?.state);
    const batteryPowerRaw = parseW(entities?.[sourceConfig.batteryPowerEntityId ?? '']?.state);
    const gridImportW = parseW(entities?.[sourceConfig.gridImportPowerEntityId ?? '']?.state);
    const gridExportW = parseW(entities?.[sourceConfig.gridExportPowerEntityId ?? '']?.state);
    // batteryPowerRaw sign convention: positive = charging, negative = discharging
    const batteryDischargeW = batteryPowerRaw < 0 ? Math.abs(batteryPowerRaw) : 0;
    const batteryChargeW = batteryPowerRaw > 0 ? batteryPowerRaw : 0;
    const monitoredDevicePowerW = getConfiguredDevicePowerW(sourceConfig.devices, entities);
    const derivedHomeLoadW = Math.max(
      0,
      solarW + gridImportW + batteryDischargeW - gridExportW - batteryChargeW
    );
    const configuredHomeLoadW = sourceConfig.homeLoadPowerEntityId
      ? parseW(entities?.[sourceConfig.homeLoadPowerEntityId]?.state)
      : 0;
    const homeLoadW = Math.max(
      configuredHomeLoadW,
      inferredHomeLoad.watts,
      derivedHomeLoadW,
      monitoredDevicePowerW
    );
    const currentLoadStatisticId =
      configuredHomeLoadW > 0
        ? sourceConfig.homeLoadPowerEntityId
        : inferredHomeLoad.watts > 0
          ? inferredHomeLoad.entityId
          : sourceConfig.homeLoadPowerEntityId;

    return {
      overview: {
        liveStats: buildLiveStats(
          sourceConfig,
          homeLoadW,
          solarW,
          batterySoc,
          gridImportW,
          gridExportW
        ),
        flow: buildFlow(
          solarW,
          batteryDischargeW,
          batteryChargeW,
          gridImportW,
          gridExportW,
          homeLoadW
        ),
        trend: getMockEnergyOverview(range).trend, // replaced by statistics in follow-up
        topConsumers: buildConsumers(sourceConfig.devices, entities, todayKWh, homeLoadW),
        insights: [],
        totals: {
          currentLoadW: homeLoadW,
          solarW,
          batteryPercent: batterySoc,
          importW: gridImportW,
          exportW: gridExportW,
          importTodayKWh: sourceConfig.gridImportEnergyEntityId
            ? (todayKWh[sourceConfig.gridImportEnergyEntityId] ?? 0)
            : 0,
          solarTodayKWh: sourceConfig.solarEnergyEntityId
            ? (todayKWh[sourceConfig.solarEnergyEntityId] ?? 0)
            : 0,
          gasTodayKWh: 0,
          hotWaterTodayKWh: 0,
          costToday: 0,
          projectedMonthCost: 0,
        },
        nodes: sourceConfig.devices.map((device) => ({
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
  }, [sourceConfig, configEntities, inferredHomeLoad, range, todayKWh]);

  return {
    overview,
    isConfigured: sourceConfig !== null,
    currentLoadStatisticId,
  };
}
