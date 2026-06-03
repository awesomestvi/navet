import { buildInfoDisplayModel } from '@navet/app/features/sensors/components/info-display-model';
import { inferSensorIcon } from '@navet/app/features/sensors/components/sensor-group-settings/sensor-options';
import type { AvailableSensor } from '@navet/app/features/sensors/components/sensor-group-settings/types';
import type { SensorReading } from '@navet/app/features/sensors/components/sensors';
import { useIntegrationStore } from '@navet/app/hooks';
import { useProviderSensorCollection } from '@navet/app/hooks/use-devices';
import { integrationSelectors } from '@navet/app/stores/selectors';
import type { SensorDevice } from '@navet/app/types/device.types';
import type { IntegrationProviderId } from '@navet/app/types/provider';
import { parseProviderScopedId } from '@navet/app/utils/provider-ids';
import { useMemo } from 'react';

export interface ProviderInfoWidgetDataOptions {
  includeBinarySensors?: boolean;
  use24HourTime: boolean;
}

export interface ProviderInfoWidgetDataResult {
  availableSensors: AvailableSensor[];
  currentSensors: SensorReading[];
}

function getSelectableSensorId(device: SensorDevice): string {
  return device.canonicalId ?? device.id;
}

function getSensorCategory(deviceClass: string | undefined): AvailableSensor['category'] {
  switch (deviceClass) {
    case 'energy':
    case 'power':
      return 'energy';
    case 'temperature':
    case 'humidity':
      return 'climate';
    case 'carbon_dioxide':
    case 'illuminance':
    case 'pressure':
    case 'pm1':
    case 'pm10':
    case 'pm25':
    case 'volatile_organic_compounds':
    case 'wind_speed':
      return 'environmental';
    default:
      return 'other';
  }
}

function formatEntityType(device: SensorDevice): string | undefined {
  if (device.deviceClass && device.deviceClass.trim().length > 0) {
    return device.deviceClass.replace(/_/g, ' ');
  }

  return device.status === 'active' || device.status === 'clear' ? 'binary sensor' : 'sensor';
}

function toAvailableSensor(device: SensorDevice): AvailableSensor {
  const id = getSelectableSensorId(device);
  const iconEntityId = device.nativeId ?? id ?? '';

  return {
    id,
    label: device.name,
    value: device.value,
    unit: device.unit,
    icon: inferSensorIcon(device.deviceClass, device.unit ?? '', iconEntityId),
    category: getSensorCategory(device.deviceClass),
    room: device.room,
  };
}

function toSensorReading(
  device: SensorDevice,
  options: ProviderInfoWidgetDataOptions
): SensorReading {
  const id = getSelectableSensorId(device);
  const iconEntityId = device.nativeId ?? id ?? '';
  const resolvedEntityType = formatEntityType(device);
  const displayModel = buildInfoDisplayModel(
    {
      ...device,
      id,
      icon: inferSensorIcon(device.deviceClass, device.unit ?? '', iconEntityId),
      ...(resolvedEntityType ? { entityType: resolvedEntityType } : {}),
      status: device.status ?? 'measurement',
    },
    {
      use24HourTime: options.use24HourTime,
    }
  );

  return {
    id,
    label: device.name,
    value: displayModel.value,
    unit: displayModel.unit,
    icon: displayModel.icon,
    ...(resolvedEntityType ? { entityType: resolvedEntityType } : {}),
  };
}

function resolveProviderIdForSensorSelection(
  sensorEntityIds: string[],
  currentProviderId: IntegrationProviderId
): IntegrationProviderId {
  for (const entityId of sensorEntityIds) {
    const parsed = parseProviderScopedId(entityId);
    if (parsed) {
      return parsed.providerId;
    }
  }

  return currentProviderId;
}

function buildSensorLookup(
  devices: SensorDevice[],
  providerId: IntegrationProviderId
): Map<string, SensorDevice> {
  const lookup = new Map<string, SensorDevice>();

  for (const device of devices) {
    if (device.providerId !== providerId) {
      continue;
    }

    lookup.set(device.canonicalId ?? device.id, device);
    lookup.set(getSelectableSensorId(device), device);

    if (device.nativeId) {
      lookup.set(device.nativeId, device);
    }
  }

  return lookup;
}

export function useProviderInfoWidgetData(
  sensorEntityIds: string[],
  options: ProviderInfoWidgetDataOptions
): ProviderInfoWidgetDataResult {
  const currentProviderId = useIntegrationStore(integrationSelectors.currentProviderId);
  const providerId = useMemo(
    () => resolveProviderIdForSensorSelection(sensorEntityIds, currentProviderId),
    [currentProviderId, sensorEntityIds]
  );
  const sensors = useProviderSensorCollection(providerId);

  return useMemo(() => {
    const lookup = buildSensorLookup(sensors, providerId);

    const availableSensors = sensors
      .map(toAvailableSensor)
      .sort(
        (left, right) =>
          (left.room ?? '').localeCompare(right.room ?? '') ||
          left.label.localeCompare(right.label) ||
          left.id.localeCompare(right.id)
      );

    const currentSensors = sensorEntityIds.flatMap((entityId) => {
      const device = lookup.get(entityId);
      if (!device) {
        return [];
      }

      return [toSensorReading(device, options)];
    });

    return { availableSensors, currentSensors };
  }, [options, providerId, sensorEntityIds, sensors]);
}
