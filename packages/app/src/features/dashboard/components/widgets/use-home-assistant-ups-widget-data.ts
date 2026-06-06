import { useHomeAssistant, useI18n } from '@navet/app/hooks';
import {
  toPlatformEntityRegistryEntry,
  toPlatformEntitySnapshot,
} from '@navet/app/hooks/use-provider-entity';
import type { HomeAssistantStore } from '@navet/app/stores/home-assistant-store';
import { homeAssistantSelectors } from '@navet/app/stores/selectors';
import { useMemo } from 'react';
import { buildUpsDeviceOptions } from './ups-widget-data';

function selectEmptyEntities() {
  return null;
}

function selectUpsEntities(state: HomeAssistantStore) {
  const entities = homeAssistantSelectors.entities(state);
  if (!entities) {
    return null;
  }

  return Object.fromEntries(
    Object.entries(entities).filter(([entityId]) => entityId.startsWith('sensor.'))
  );
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
  const entities = useHomeAssistant(enabled ? selectUpsEntities : selectEmptyEntities);
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
  const classificationHints = useMemo(
    () =>
      entities
        ? Object.fromEntries(
            Object.entries(entities).map(([entityId, entity]) => [
              entityId,
              {
                deviceClass:
                  typeof entity.attributes?.device_class === 'string'
                    ? entity.attributes.device_class
                    : undefined,
              },
            ])
          )
        : {},
    [entities]
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
        classificationHints,
        formatOptions,
      }),
    [
      classificationHints,
      formatOptions,
      platformAreas,
      platformDeviceRegistry,
      platformEntities,
      platformEntityRegistry,
    ]
  );

  return {
    devices,
    entities: platformEntities,
    formatOptions,
  };
}
