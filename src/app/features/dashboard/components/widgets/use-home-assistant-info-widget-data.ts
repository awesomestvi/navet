import { useMemo } from 'react';
import {
  buildAvailableSensorOptions,
  resolveSensorReadings,
  type SensorReading,
} from '@/app/features/sensors';
import { useHomeAssistant, useI18n, useIntegrationStore } from '@/app/hooks';
import {
  toPlatformEntityRegistryEntry,
  toPlatformEntitySnapshot,
} from '@/app/hooks/use-provider-entity';
import { homeAssistantSelectors, integrationSelectors } from '@/app/stores/selectors';
import { isLegacyHomeAssistantEntityId } from '@/app/utils/provider-entity-id';
import { parseProviderScopedId } from '@/app/utils/provider-ids';

function selectEmptyEntities() {
  return null;
}

function selectEmptyAreas() {
  return [];
}

function selectEmptyDeviceRegistry() {
  return [];
}

function selectEmptyEntityRegistry() {
  return [];
}

export interface HomeAssistantInfoWidgetDataOptions {
  includeBinarySensors?: boolean;
  use24HourTime: boolean;
  enabled?: boolean;
}

export interface HomeAssistantInfoWidgetDataResult {
  availableSensors: ReturnType<typeof buildAvailableSensorOptions>;
  currentSensors: SensorReading[];
}

function isHomeAssistantSensorEntityId(entityId: string): boolean {
  const scopedId = parseProviderScopedId(entityId);
  if (scopedId) {
    return scopedId.providerId === 'home_assistant';
  }

  return isLegacyHomeAssistantEntityId(entityId);
}

export function useHomeAssistantInfoWidgetData(
  sensorEntityIds: string[],
  options: HomeAssistantInfoWidgetDataOptions
): HomeAssistantInfoWidgetDataResult {
  const { locale } = useI18n();
  const currentProviderId = useIntegrationStore(integrationSelectors.currentProviderId);
  const enabled = options.enabled ?? true;
  const isHomeAssistantProvider =
    enabled &&
    (currentProviderId === 'home_assistant' ||
      sensorEntityIds.some((entityId) => isHomeAssistantSensorEntityId(entityId)));
  const entities = useHomeAssistant(
    isHomeAssistantProvider ? homeAssistantSelectors.entities : selectEmptyEntities
  );
  const areas = useHomeAssistant(
    isHomeAssistantProvider ? homeAssistantSelectors.areas : selectEmptyAreas
  );
  const deviceRegistry = useHomeAssistant(
    isHomeAssistantProvider ? homeAssistantSelectors.deviceRegistry : selectEmptyDeviceRegistry
  );
  const entityRegistry = useHomeAssistant(
    isHomeAssistantProvider ? homeAssistantSelectors.entityRegistry : selectEmptyEntityRegistry
  );
  const formatOptions = useMemo(
    () => ({ locale, use24HourTime: options.use24HourTime }),
    [locale, options.use24HourTime]
  );
  const platformEntities = useMemo(
    () =>
      entities
        ? Object.fromEntries(
            Object.entries(entities).map(([entityId, entity]) => [
              entityId,
              toPlatformEntitySnapshot(entityId, entity),
            ])
          )
        : null,
    [entities]
  );
  const platformAreas = useMemo(
    () => areas.map((area) => ({ areaId: area.area_id, name: area.name })),
    [areas]
  );
  const platformDeviceRegistry = useMemo(
    () => deviceRegistry.map((device) => ({ deviceId: device.id, areaId: device.area_id })),
    [deviceRegistry]
  );
  const platformEntityRegistry = useMemo(
    () => entityRegistry.map(toPlatformEntityRegistryEntry),
    [entityRegistry]
  );

  const availableSensors = useMemo(
    () =>
      buildAvailableSensorOptions({
        entities: platformEntities,
        areas: platformAreas,
        deviceRegistry: platformDeviceRegistry,
        entityRegistry: platformEntityRegistry,
        formatOptions,
        includeBinarySensors: options.includeBinarySensors,
      }),
    [
      formatOptions,
      options.includeBinarySensors,
      platformAreas,
      platformDeviceRegistry,
      platformEntities,
      platformEntityRegistry,
    ]
  );

  const currentSensors = useMemo(
    () =>
      resolveSensorReadings({
        entities: platformEntities,
        sensorEntityIds,
        formatOptions,
      }),
    [formatOptions, platformEntities, sensorEntityIds]
  );

  return {
    availableSensors,
    currentSensors,
  };
}
