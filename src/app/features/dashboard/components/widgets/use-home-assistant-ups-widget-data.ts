import { useMemo } from 'react';
import { useHomeAssistant, useI18n } from '@/app/hooks';
import {
  toPlatformEntityRegistryEntry,
  toPlatformEntitySnapshot,
} from '@/app/hooks/use-provider-entity';
import { homeAssistantSelectors } from '@/app/stores/selectors';
import { buildUpsDeviceOptions } from './ups-widget-data';

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

export function useHomeAssistantUpsWidgetData(options: { use24HourTime: boolean }, enabled = true) {
  const { locale } = useI18n();
  const entities = useHomeAssistant(
    enabled ? homeAssistantSelectors.entities : selectEmptyEntities
  );
  const areas = useHomeAssistant(enabled ? homeAssistantSelectors.areas : selectEmptyAreas);
  const deviceRegistry = useHomeAssistant(
    enabled ? homeAssistantSelectors.deviceRegistry : selectEmptyDeviceRegistry
  );
  const entityRegistry = useHomeAssistant(
    enabled ? homeAssistantSelectors.entityRegistry : selectEmptyEntityRegistry
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
    () =>
      deviceRegistry.map((device) => ({
        deviceId: device.id,
        areaId: device.area_id,
        name: device.name_by_user ?? device.name,
      })),
    [deviceRegistry]
  );
  const platformEntityRegistry = useMemo(
    () => entityRegistry.map(toPlatformEntityRegistryEntry),
    [entityRegistry]
  );

  const devices = useMemo(
    () =>
      buildUpsDeviceOptions({
        entities: platformEntities,
        areas: platformAreas,
        deviceRegistry: platformDeviceRegistry,
        entityRegistry: platformEntityRegistry,
        formatOptions,
      }),
    [formatOptions, platformAreas, platformDeviceRegistry, platformEntities, platformEntityRegistry]
  );

  return {
    devices,
    entities: platformEntities,
    formatOptions,
  };
}
