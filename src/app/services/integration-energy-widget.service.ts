import type { NavetEntity } from '@navet/core/types';
import { mapNavetEntitiesToDeviceCollection } from '@/app/core/navet-device-collections';
import type {
  UpsDeviceOption,
  UpsMetricKind,
  UpsMetricOption,
} from '@/app/features/dashboard/components/widgets/ups-widget-data';
import type { PlatformEntitySnapshotMap } from '@/app/platform/provider-feature-models';
import type { SensorDevice } from '@/app/types/device.types';
import type { IntegrationProviderId } from '@/app/types/provider';
import { createProviderScopedId } from '@/app/utils/provider-ids';

export interface ProviderUpsWidgetDataResult {
  devices: UpsDeviceOption[];
  entities: PlatformEntitySnapshotMap | null;
  formatOptions: { locale: string; use24HourTime: boolean };
}

const UPS_METRIC_PRIORITY: Record<UpsMetricKind, number> = {
  battery: 0,
  load: 1,
  status: 2,
  'input-voltage': 3,
  'output-voltage': 4,
  runtime: 5,
};

function classifyHomeyUpsMetric(device: SensorDevice): UpsMetricKind | null {
  const searchText = `${device.nativeId ?? ''} ${device.name}`.toLowerCase();
  const unit = (device.unit ?? '').toLowerCase();
  const deviceClass = device.deviceClass?.toLowerCase();

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

function compareHomeyUpsMetrics(left: UpsMetricOption, right: UpsMetricOption) {
  return (
    UPS_METRIC_PRIORITY[left.kind] - UPS_METRIC_PRIORITY[right.kind] ||
    left.label.localeCompare(right.label) ||
    left.entityId.localeCompare(right.entityId)
  );
}

function toHomeyUpsMetric(device: SensorDevice, kind: UpsMetricKind): UpsMetricOption {
  return {
    entityId: device.canonicalId ?? device.id,
    label: device.name,
    value: device.value,
    unit: device.unit,
    kind,
  };
}

function toHomeyUpsEntityMap(sensors: SensorDevice[]): PlatformEntitySnapshotMap {
  return Object.fromEntries(
    sensors.map((device) => [
      device.canonicalId ?? device.id,
      {
        entityId: device.canonicalId ?? device.id,
        state: device.value,
        attributes: {
          friendly_name: device.name,
          unit_of_measurement: device.unit,
          device_class: device.deviceClass,
          room: device.room,
          source_device_id: device.sourceDeviceId,
        },
      },
    ])
  );
}

function resolveHomeyUpsSourceDeviceId(device: SensorDevice): string {
  if (device.sourceDeviceId) {
    return device.sourceDeviceId;
  }

  if (device.nativeId?.includes('#')) {
    return device.nativeId.split('#', 1)[0] ?? device.nativeId;
  }

  return device.nativeId ?? device.id;
}

function buildHomeyUpsDeviceOptions(
  sensors: SensorDevice[],
  providerEntitiesByCanonicalId: Record<string, NavetEntity>
): UpsDeviceOption[] {
  const sensorsBySourceDevice = new Map<string, SensorDevice[]>();

  for (const device of sensors) {
    const sourceDeviceId = resolveHomeyUpsSourceDeviceId(device);
    const nextSensors = sensorsBySourceDevice.get(sourceDeviceId) ?? [];
    nextSensors.push(device);
    sensorsBySourceDevice.set(sourceDeviceId, nextSensors);
  }

  return Array.from(sensorsBySourceDevice.entries())
    .flatMap(([sourceDeviceId, sourceSensors]) => {
      const metrics = sourceSensors
        .flatMap((device) => {
          const kind = classifyHomeyUpsMetric(device);
          return kind ? [toHomeyUpsMetric(device, kind)] : [];
        })
        .sort(compareHomeyUpsMetrics);

      if (metrics.length === 0) {
        return [];
      }

      const sourceDevice = Object.values(providerEntitiesByCanonicalId).find(
        (entity) =>
          entity.providerId === 'homey' &&
          entity.externalId === sourceDeviceId &&
          entity.type !== 'sensor' &&
          entity.type !== 'binary_sensor'
      );
      const statusOptions = metrics.filter((metric) => metric.kind === 'status');

      return [
        {
          deviceId: createProviderScopedId('homey', sourceDeviceId),
          name: sourceDevice?.name ?? sourceSensors[0]?.room ?? sourceDeviceId,
          room: sourceDevice?.room ?? sourceSensors[0]?.room ?? '',
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

export function resolveProviderUpsWidgetData({
  currentProviderId,
  providerEntitiesByCanonicalId,
  homeAssistantData,
}: {
  currentProviderId: IntegrationProviderId;
  providerEntitiesByCanonicalId: Record<string, NavetEntity>;
  homeAssistantData: ProviderUpsWidgetDataResult;
}): ProviderUpsWidgetDataResult {
  if (currentProviderId === 'home_assistant') {
    return homeAssistantData;
  }

  const sensors = mapNavetEntitiesToDeviceCollection(
    Object.values(providerEntitiesByCanonicalId).filter(
      (entity): entity is NavetEntity => entity.providerId === 'homey'
    )
  ).sensors;

  return {
    devices: buildHomeyUpsDeviceOptions(sensors, providerEntitiesByCanonicalId),
    entities: toHomeyUpsEntityMap(sensors),
    formatOptions: homeAssistantData.formatOptions,
  };
}
