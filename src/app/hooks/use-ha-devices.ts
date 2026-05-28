import { useMemo } from 'react';
import { shallow } from 'zustand/shallow';
import {
  createRegistryMaps,
  getEntityCategory,
} from '@/app/infrastructure/home-assistant/home-assistant-registry-helpers';
import { useI18n } from '../i18n';
import { useSettingsStore } from '../stores';
import { homeAssistantSelectors } from '../stores/selectors';
import type {
  CameraDevice,
  ClimateDevice,
  CoverDevice,
  FanDevice,
  HelperDevice,
  LightDevice,
  LockDevice,
  MediaDevice,
  PersonDevice,
  SceneDevice,
  SensorDevice,
  SwitchDevice,
  VacuumDevice,
} from '../types/device.types';
import { haEntityStructureEqual } from '../utils/ha-entity-structure-equal';
import { createProviderScopedMetadata } from '../utils/provider-ids';
import {
  mapCameraDevice,
  mapClimateDevice,
  mapCoverDevice,
  mapFanDevice,
  mapLightDevice,
  mapLockDevice,
  mapMediaDevice,
  mapPersonDevice,
  mapSceneDevice,
  mapSensorDevice,
  mapSwitchDevice,
  mapVacuumDevice,
} from './device-mappers';
import { getName, resolveEntityRoom, resolveHomeAssistantTemperatureUnit } from './entity-utils';
import {
  buildDeviceIndexes,
  createEmptyDeviceCollection,
  getDomain,
  mapHelperDevice,
  shouldSkipSwitchDevice,
  shouldSuppressForVacuumDevice,
  shouldSuppressHelperCard,
} from './use-ha-devices.helpers';
import { useHomeAssistant } from './use-home-assistant';
import { useHomeAssistantCalendarDevices } from './use-home-assistant-calendar-devices';
import { useHomeAssistantWeatherDevices } from './use-home-assistant-weather-devices';

export { useHomeAssistantCalendarDevices, useHomeAssistantWeatherDevices };

function withProviderMetadata<T extends { id: string }>(device: T): T {
  const metadata = createProviderScopedMetadata('home_assistant', device.id);

  return {
    ...device,
    id: metadata.canonicalId,
    ...metadata,
  };
}

function useRegistryRoomResolver() {
  const areas = useHomeAssistant(homeAssistantSelectors.areas, shallow);
  const deviceRegistry = useHomeAssistant(homeAssistantSelectors.deviceRegistry, shallow);
  const entityRegistry = useHomeAssistant(homeAssistantSelectors.entityRegistry, shallow);

  return useMemo(
    () => createRegistryMaps(areas, deviceRegistry, entityRegistry),
    [areas, deviceRegistry, entityRegistry]
  );
}

/**
 * Maps raw Home Assistant entities to typed device collections.
 */
export const useHADevices = () => {
  const { areaMap, deviceRegistryMap, entityRegistryMap } = useRegistryRoomResolver();
  const entities = useHomeAssistant(homeAssistantSelectors.entities, haEntityStructureEqual);
  const homeAssistantTemperatureUnit = useHomeAssistant((state) =>
    resolveHomeAssistantTemperatureUnit(state.config)
  );
  const { locale, t } = useI18n();
  const use24HourTime = useSettingsStore((state) => state.use24HourTime);
  const calendars = useHomeAssistantCalendarDevices();
  const weather = useHomeAssistantWeatherDevices();

  const baseDevices = useMemo(() => {
    if (!entities) {
      return createEmptyDeviceCollection();
    }

    const lights: LightDevice[] = [];
    const fans: FanDevice[] = [];
    const switches: SwitchDevice[] = [];
    const helpers: HelperDevice[] = [];
    const climate: ClimateDevice[] = [];
    const media: MediaDevice[] = [];
    const persons: PersonDevice[] = [];
    const covers: CoverDevice[] = [];
    const locks: LockDevice[] = [];
    const scenes: SceneDevice[] = [];
    const sensors: SensorDevice[] = [];
    const vacuums: VacuumDevice[] = [];
    const cameras: CameraDevice[] = [];
    const indexes = buildDeviceIndexes(entities, entityRegistryMap);

    for (const [entityId, entity] of Object.entries(entities)) {
      const domain = getDomain(entityId);
      const entityEntry = entityRegistryMap.get(entityId);
      const name = getName(entity, entityEntry);
      const room = resolveEntityRoom(
        entityId,
        entity,
        areaMap,
        entityRegistryMap,
        deviceRegistryMap
      );

      switch (domain) {
        case 'light':
          lights.push(withProviderMetadata(mapLightDevice(entityId, entity, name, room)));
          break;

        case 'fan':
          fans.push(withProviderMetadata(mapFanDevice(entityId, entity, name, room)));
          break;

        case 'switch': {
          if (shouldSkipSwitchDevice(entityId, entityEntry, indexes)) {
            break;
          }

          const deviceMetrics = entityEntry?.device_id
            ? indexes.switchMetricsByDeviceId.get(entityEntry.device_id)
            : undefined;
          const mapped = mapSwitchDevice(
            entityId,
            entity,
            name,
            room,
            t,
            entityEntry,
            deviceMetrics
          );
          if (mapped) {
            switches.push(withProviderMetadata(mapped));
          }
          break;
        }

        case 'input_boolean':
        case 'script':
        case 'button':
        case 'input_button': {
          const entityEntry = entityRegistryMap.get(entityId);
          const helperDevice = mapHelperDevice(domain, entityId, entity, name, room, t);
          if (
            !helperDevice ||
            getEntityCategory(entityEntry) === 'config' ||
            getEntityCategory(entityEntry) === 'diagnostic' ||
            shouldSuppressHelperCard(entityId, entityRegistryMap, indexes)
          ) {
            break;
          }

          helpers.push(withProviderMetadata(helperDevice));
          break;
        }

        case 'climate':
        case 'water_heater':
          climate.push(
            withProviderMetadata(
              mapClimateDevice(entityId, entity, name, room, homeAssistantTemperatureUnit)
            )
          );
          break;

        case 'media_player':
          media.push(withProviderMetadata(mapMediaDevice(entityId, entity, name, room, t)));
          break;

        case 'person':
          persons.push(withProviderMetadata(mapPersonDevice(entityId, entity, name, room, t)));
          break;

        case 'cover':
          covers.push(withProviderMetadata(mapCoverDevice(entityId, entity, name, room)));
          break;

        case 'lock':
          locks.push(withProviderMetadata(mapLockDevice(entityId, entity, name, room)));
          break;

        case 'scene':
          scenes.push(withProviderMetadata(mapSceneDevice(entityId, entity, name, room)));
          break;

        case 'sensor':
        case 'binary_sensor': {
          const mapped = mapSensorDevice(entityId, entity, name, room, {
            locale,
            use24HourTime,
          });
          if (mapped) {
            sensors.push(withProviderMetadata(mapped));
          }
          break;
        }

        case 'camera':
          if (shouldSuppressForVacuumDevice(entityId, entityRegistryMap, indexes)) {
            break;
          }

          cameras.push(withProviderMetadata(mapCameraDevice(entityId, entity, name, room)));
          break;

        case 'vacuum':
          vacuums.push(withProviderMetadata(mapVacuumDevice(entityId, entity, name, room)));
          break;

        case 'calendar':
        case 'weather':
          break;
      }
    }

    return {
      lights,
      fans,
      hvac: [],
      climate,
      media,
      weather: [],
      switches,
      helpers,
      covers,
      locks,
      scenes,
      persons,
      sensors,
      vacuums,
      calendars: [],
      cameras,
      'grouped-sensors': [],
    };
  }, [
    areaMap,
    deviceRegistryMap,
    entities,
    entityRegistryMap,
    homeAssistantTemperatureUnit,
    locale,
    t,
    use24HourTime,
  ]);

  return useMemo(
    () => ({
      ...baseDevices,
      calendars,
      weather,
    }),
    [baseDevices, calendars, weather]
  );
};
