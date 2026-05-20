import { useMemo } from 'react';
import { shallow } from 'zustand/shallow';
import { useI18n } from '../i18n';
import { homeAssistantSelectors } from '../stores/selectors';
import type {
  CameraDevice,
  ClimateDevice,
  CoverDevice,
  HelperDevice,
  LightDevice,
  LockDevice,
  MediaDevice,
  PersonDevice,
  SceneDevice,
  SwitchDevice,
  VacuumDevice,
} from '../types/device.types';
import { haEntityStructureEqual } from '../utils/ha-entity-structure-equal';
import {
  mapCameraDevice,
  mapClimateDevice,
  mapCoverDevice,
  mapLightDevice,
  mapLockDevice,
  mapMediaDevice,
  mapPersonDevice,
  mapSceneDevice,
  mapSwitchDevice,
  mapVacuumDevice,
} from './ha-device-mappers';
import { getName, resolveEntityRoom } from './ha-entity-utils';
import { useCalendarDevices } from './use-calendar-devices';
import {
  buildDeviceIndexes,
  createEmptyDeviceCollection,
  createRegistryMaps,
  getDomain,
  getEntityCategory,
  mapHelperDevice,
  shouldSkipSwitchDevice,
  shouldSuppressForVacuumDevice,
  shouldSuppressHelperCard,
} from './use-ha-devices.helpers';
import { useHomeAssistant } from './use-home-assistant';
import { useWeatherDevices } from './use-weather-devices';

export { useCalendarDevices, useWeatherDevices };

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
  const { t } = useI18n();
  const calendars = useCalendarDevices();
  const weather = useWeatherDevices();

  const baseDevices = useMemo(() => {
    if (!entities) {
      return createEmptyDeviceCollection();
    }

    const lights: LightDevice[] = [];
    const switches: SwitchDevice[] = [];
    const helpers: HelperDevice[] = [];
    const climate: ClimateDevice[] = [];
    const media: MediaDevice[] = [];
    const persons: PersonDevice[] = [];
    const covers: CoverDevice[] = [];
    const locks: LockDevice[] = [];
    const scenes: SceneDevice[] = [];
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
          lights.push(mapLightDevice(entityId, entity, name, room));
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
            switches.push(mapped);
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

          helpers.push(helperDevice);
          break;
        }

        case 'climate':
        case 'water_heater':
          climate.push(mapClimateDevice(entityId, entity, name, room));
          break;

        case 'media_player':
          media.push(mapMediaDevice(entityId, entity, name, room, t));
          break;

        case 'person':
          persons.push(mapPersonDevice(entityId, entity, name, room, t));
          break;

        case 'cover':
          covers.push(mapCoverDevice(entityId, entity, name, room));
          break;

        case 'lock':
          locks.push(mapLockDevice(entityId, entity, name, room));
          break;

        case 'scene':
          scenes.push(mapSceneDevice(entityId, entity, name, room));
          break;

        case 'camera':
          if (shouldSuppressForVacuumDevice(entityId, entityRegistryMap, indexes)) {
            break;
          }

          cameras.push(mapCameraDevice(entityId, entity, name, room));
          break;

        case 'vacuum':
          vacuums.push(mapVacuumDevice(entityId, entity, name, room));
          break;

        case 'calendar':
        case 'weather':
          break;
      }
    }

    return {
      lights,
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
      sensors: [],
      vacuums,
      calendars: [],
      cameras,
      'grouped-sensors': [],
    };
  }, [areaMap, deviceRegistryMap, entities, entityRegistryMap, t]);

  return useMemo(
    () => ({
      ...baseDevices,
      calendars,
      weather,
    }),
    [baseDevices, calendars, weather]
  );
};
