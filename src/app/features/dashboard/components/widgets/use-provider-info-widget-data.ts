import { useMemo } from 'react';
import { type AvailableSensor, inferSensorIcon, type SensorReading } from '@/app/features/sensors';
import { useIntegrationStore } from '@/app/hooks';
import { useProviderSensorCollection } from '@/app/hooks/use-devices';
import { integrationSelectors } from '@/app/stores/selectors';
import type { SensorDevice } from '@/app/types/device.types';
import type { IntegrationProviderId } from '@/app/types/provider';
import { parseProviderScopedId } from '@/app/utils/provider-ids';

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

function toSensorReading(device: SensorDevice): SensorReading {
  const id = getSelectableSensorId(device);
  const iconEntityId = device.nativeId ?? id ?? '';

  return {
    id,
    label: device.name,
    value: device.value,
    unit: device.unit,
    icon: inferSensorIcon(device.deviceClass, device.unit ?? '', iconEntityId),
    ...(formatEntityType(device) ? { entityType: formatEntityType(device) } : {}),
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
  _options: ProviderInfoWidgetDataOptions
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

      return [toSensorReading(device)];
    });

    return { availableSensors, currentSensors };
  }, [providerId, sensorEntityIds, sensors]);
}
