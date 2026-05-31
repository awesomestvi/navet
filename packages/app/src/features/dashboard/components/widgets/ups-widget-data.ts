import { formatSensorValue, getName, resolveEntityRoom } from '@navet/app/hooks/entity-utils';
import type {
  PlatformEntityRegistryEntry,
  PlatformEntitySnapshot,
  PlatformEntitySnapshotMap,
} from '@navet/app/platform/provider-feature-models';

export type UpsMetricKind =
  | 'battery'
  | 'load'
  | 'status'
  | 'input-voltage'
  | 'output-voltage'
  | 'runtime';

export type UpsStatusTone = 'green' | 'amber' | 'red' | 'neutral';

export interface UpsMetricOption {
  entityId: string;
  label: string;
  value: string;
  unit: string;
  kind: UpsMetricKind;
}

export interface UpsDeviceOption {
  deviceId: string;
  name: string;
  room: string;
  metrics: UpsMetricOption[];
  statusOptions: UpsMetricOption[];
  defaultMetricEntityIds: string[];
  defaultStatusEntityId?: string;
}

export interface UpsAreaReference {
  areaId: string;
  name: string;
}

export interface UpsDeviceReference {
  deviceId: string;
  areaId?: string | null;
  name?: string | null;
}

interface UpsRegistryContext {
  areas?: UpsAreaReference[];
  deviceRegistry?: UpsDeviceReference[];
  entityRegistry?: PlatformEntityRegistryEntry[];
}

interface BuildUpsDeviceOptionsParams extends UpsRegistryContext {
  entities: PlatformEntitySnapshotMap | null | undefined;
  classificationHints?: Record<
    string,
    {
      deviceClass?: string;
    }
  >;
  formatOptions?: Parameters<typeof formatSensorValue>[1];
}

interface ResolveUpsMetricReadingsParams {
  entities: PlatformEntitySnapshotMap | null | undefined;
  metricEntityIds: string[];
  availableMetrics: UpsMetricOption[];
  formatOptions?: Parameters<typeof formatSensorValue>[1];
}

const UPS_METRIC_PRIORITY: Record<UpsMetricKind, number> = {
  battery: 0,
  load: 1,
  status: 2,
  'input-voltage': 3,
  'output-voltage': 4,
  runtime: 5,
};

const UPS_STATUS_GREEN = ['charging', 'online', 'ol'];
const UPS_STATUS_AMBER = ['discharging', 'ob', 'on battery'];
const UPS_STATUS_RED = [
  'alarm',
  'boost',
  'error',
  'fault',
  'lb',
  'low battery',
  'offline',
  'overload',
  'replace battery',
  'trim',
];

function getEntityRegistryMap(entityRegistry: PlatformEntityRegistryEntry[] | undefined) {
  return new Map((entityRegistry ?? []).map((entry) => [entry.entityId, entry]));
}

function getDeviceRegistryMap(deviceRegistry: UpsDeviceReference[] | undefined) {
  return new Map((deviceRegistry ?? []).map((device) => [device.deviceId, device]));
}

function getAreaMap(areas: UpsAreaReference[] | undefined) {
  return new Map((areas ?? []).map((area) => [area.areaId, area.name]));
}

function buildSearchText(entityId: string, entity: PlatformEntitySnapshot) {
  const friendlyName =
    typeof entity.attributes?.friendly_name === 'string' ? entity.attributes.friendly_name : '';
  return `${entityId} ${friendlyName}`.toLowerCase();
}

function getEntityUnit(entity: PlatformEntitySnapshot) {
  return typeof entity.attributes?.unit_of_measurement === 'string'
    ? entity.attributes.unit_of_measurement.toLowerCase()
    : typeof entity.attributes?.native_unit_of_measurement === 'string'
      ? entity.attributes.native_unit_of_measurement.toLowerCase()
      : '';
}

function classifyUpsMetric(
  entityId: string,
  entity: PlatformEntitySnapshot,
  classificationHints: BuildUpsDeviceOptionsParams['classificationHints']
): UpsMetricKind | null {
  const searchText = buildSearchText(entityId, entity);
  const deviceClass = classificationHints?.[entityId]?.deviceClass?.toLowerCase();
  const unit = getEntityUnit(entity);

  if (searchText.includes('battery charge') || deviceClass === 'battery') {
    return 'battery';
  }

  if (
    (searchText.includes(' load') ||
      searchText.includes('_load') ||
      searchText.includes('input load')) &&
    unit.includes('%')
  ) {
    return 'load';
  }

  if (
    searchText.includes(' status') ||
    searchText.includes('_status') ||
    searchText.includes('status data') ||
    searchText.includes('charging status')
  ) {
    return 'status';
  }

  if (
    searchText.includes('input voltage') &&
    unit.includes('v') &&
    !searchText.includes('nominal')
  ) {
    return 'input-voltage';
  }

  if (
    searchText.includes('output voltage') &&
    unit.includes('v') &&
    !searchText.includes('nominal')
  ) {
    return 'output-voltage';
  }

  if (
    searchText.includes('runtime') ||
    searchText.includes('time left') ||
    searchText.includes('time_left') ||
    searchText.includes('remaining')
  ) {
    return 'runtime';
  }

  return null;
}

function buildMetricOption(
  entityId: string,
  entity: PlatformEntitySnapshot,
  entityEntry: PlatformEntityRegistryEntry | undefined,
  kind: UpsMetricKind,
  formatOptions?: Parameters<typeof formatSensorValue>[1]
): UpsMetricOption {
  const formatted = formatSensorValue(entity, formatOptions) ?? {
    value: String(entity.state),
    unit:
      typeof entity.attributes?.unit_of_measurement === 'string'
        ? entity.attributes.unit_of_measurement
        : '',
  };

  return {
    entityId,
    label: getName(entity, entityEntry),
    value: formatted.value,
    unit: formatted.unit,
    kind,
  };
}

function compareMetrics(left: UpsMetricOption, right: UpsMetricOption) {
  return (
    UPS_METRIC_PRIORITY[left.kind] - UPS_METRIC_PRIORITY[right.kind] ||
    compareMetricSpecificity(left, right) ||
    left.label.localeCompare(right.label) ||
    left.entityId.localeCompare(right.entityId)
  );
}

function compareMetricSpecificity(left: UpsMetricOption, right: UpsMetricOption) {
  if (left.kind !== right.kind) {
    return 0;
  }

  const leftSearch = left.entityId.toLowerCase();
  const rightSearch = right.entityId.toLowerCase();

  if (left.kind === 'status') {
    return scoreStatusSpecificity(rightSearch) - scoreStatusSpecificity(leftSearch);
  }

  if (left.kind === 'load') {
    return scoreLoadSpecificity(rightSearch) - scoreLoadSpecificity(leftSearch);
  }

  return 0;
}

function scoreStatusSpecificity(searchText: string) {
  if (searchText.includes('charging_status')) {
    return 0;
  }
  if (searchText.includes('status_data')) {
    return 1;
  }
  if (searchText.includes('_status')) {
    return 2;
  }
  return 0;
}

function scoreLoadSpecificity(searchText: string) {
  if (searchText.includes('input_load')) {
    return 0;
  }
  if (searchText.includes('_load')) {
    return 1;
  }
  return 0;
}

export function buildUpsDeviceOptions({
  entities,
  areas = [],
  deviceRegistry = [],
  entityRegistry = [],
  classificationHints,
  formatOptions,
}: BuildUpsDeviceOptionsParams): UpsDeviceOption[] {
  if (!entities) {
    return [];
  }

  const areaMap = getAreaMap(areas);
  const deviceRegistryMap = getDeviceRegistryMap(deviceRegistry);
  const entityRegistryMap = getEntityRegistryMap(entityRegistry);
  const sensorsByDeviceId = new Map<string, string[]>();

  for (const entry of entityRegistry) {
    if (!entry.deviceId || !entry.entityId.startsWith('sensor.')) {
      continue;
    }

    const entity = entities[entry.entityId];
    if (!entity) {
      continue;
    }

    const nextIds = sensorsByDeviceId.get(entry.deviceId) ?? [];
    nextIds.push(entry.entityId);
    sensorsByDeviceId.set(entry.deviceId, nextIds);
  }

  return Array.from(sensorsByDeviceId.entries())
    .flatMap(([deviceId, entityIds]) => {
      const metrics = entityIds
        .flatMap((entityId) => {
          const entity = entities[entityId];
          if (!entity) {
            return [];
          }

          const kind = classifyUpsMetric(entityId, entity, classificationHints);
          if (!kind) {
            return [];
          }

          return [
            buildMetricOption(
              entityId,
              entity,
              entityRegistryMap.get(entityId),
              kind,
              formatOptions
            ),
          ];
        })
        .sort(compareMetrics);

      if (metrics.length === 0) {
        return [];
      }

      const device = deviceRegistryMap.get(deviceId);
      const primaryEntityId = metrics[0]?.entityId;
      const primaryEntity = primaryEntityId ? entities[primaryEntityId] : undefined;
      const room =
        (device?.areaId ? areaMap.get(device.areaId) : undefined) ??
        (primaryEntityId && primaryEntity
          ? resolveEntityRoom(
              primaryEntityId,
              primaryEntity,
              areaMap,
              entityRegistryMap,
              deviceRegistryMap
            )
          : '') ??
        '';
      const statusOptions = metrics.filter((metric) => metric.kind === 'status');

      return [
        {
          deviceId,
          name: device?.name ?? metrics[0]?.label ?? deviceId,
          room,
          metrics,
          statusOptions,
          defaultMetricEntityIds: metrics
            .filter((metric) => metric.kind !== 'status')
            .slice(0, 5)
            .map((metric) => metric.entityId),
          defaultStatusEntityId: statusOptions[0]?.entityId,
        },
      ];
    })
    .sort(
      (left, right) =>
        left.room.localeCompare(right.room) ||
        left.name.localeCompare(right.name) ||
        left.deviceId.localeCompare(right.deviceId)
    );
}

export function resolveUpsMetricReadings({
  entities,
  metricEntityIds,
  availableMetrics,
  formatOptions,
}: ResolveUpsMetricReadingsParams): UpsMetricOption[] {
  return metricEntityIds.flatMap((entityId) => {
    const fallback = availableMetrics.find((metric) => metric.entityId === entityId);
    const entity = entities?.[entityId];

    if (!fallback) {
      return [];
    }

    if (!entity) {
      return [fallback];
    }

    const formatted = formatSensorValue(entity, formatOptions) ?? {
      value: String(entity.state),
      unit: fallback.unit,
    };

    return [
      {
        ...fallback,
        value: formatted.value,
        unit: formatted.unit,
      },
    ];
  });
}

export function getUpsStatusTone(status: string | undefined): UpsStatusTone {
  if (!status) {
    return 'neutral';
  }

  const normalized = status.trim().toLowerCase();
  if (!normalized || normalized === 'unknown' || normalized === 'unavailable') {
    return 'neutral';
  }

  if (UPS_STATUS_RED.some((token) => normalized.includes(token))) {
    return 'red';
  }

  if (UPS_STATUS_AMBER.some((token) => normalized.includes(token))) {
    return 'amber';
  }

  if (UPS_STATUS_GREEN.some((token) => normalized.includes(token))) {
    return 'green';
  }

  return 'neutral';
}
