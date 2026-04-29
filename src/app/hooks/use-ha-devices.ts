import type { Connection, HassEntity } from 'home-assistant-js-websocket';
import {
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { shallow } from 'zustand/shallow';
import { useI18n } from '../i18n';
import { homeAssistantSelectors, settingsSelectors } from '../stores/selectors';
import { useSettingsStore } from '../stores/settings-store';
import type {
  CalendarDevice,
  CameraDevice,
  ClimateDevice,
  CoverDevice,
  DeviceCollection,
  DeviceMetric,
  HelperDevice,
  LightDevice,
  LockDevice,
  MediaDevice,
  PersonDevice,
  SceneDevice,
  SwitchDevice,
  VacuumDevice,
  WeatherDevice,
} from '../types/device.types';
import { UNKNOWN_ROOM_LABEL } from '../utils/device-location';
import { haEntityStructureEqual } from '../utils/ha-entity-structure-equal';
import {
  mapCalendarSources,
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
  mapWeatherDevice,
} from './ha-device-mappers';
import {
  getMetricLabel,
  getName,
  helperLabelForDomain,
  inferMetricIcon,
  normalizeMetric,
  parseNumberish,
  resolveEntityRoom,
} from './ha-entity-utils';
import { useHomeAssistant } from './use-home-assistant';

type WeatherForecastEntry = Record<string, unknown>;

type WeatherForecastServicePayload = {
  response?: Record<
    string,
    {
      forecast?: WeatherForecastEntry[];
    }
  >;
};

type WeatherForecastServiceEnvelope = WeatherForecastServicePayload & {
  result?: WeatherForecastServicePayload;
};

type WeatherForecastType = 'daily' | 'hourly';

type WeatherForecastState = Record<
  string,
  {
    daily: WeatherForecastEntry[];
    hourly: WeatherForecastEntry[];
  }
>;

type CalendarServiceEvent = Record<string, unknown>;

type CalendarEventsServicePayload = {
  response?: Record<
    string,
    {
      events?: CalendarServiceEvent[];
    }
  >;
};

type CalendarEventsServiceEnvelope = CalendarEventsServicePayload & {
  result?: CalendarEventsServicePayload;
};

const WEATHER_REFRESH_MS = 15 * 60 * 1000;
const CALENDAR_REFRESH_MS = 5 * 60 * 1000;
async function fetchWeatherForecast(
  connection: Connection,
  entityId: string,
  type: WeatherForecastType
): Promise<WeatherForecastEntry[]> {
  const response = (await connection.sendMessagePromise({
    type: 'call_service',
    domain: 'weather',
    service: 'get_forecasts',
    target: { entity_id: entityId },
    service_data: { type },
    return_response: true,
  })) as WeatherForecastServiceEnvelope;

  const payload = response.response ?? response.result?.response;
  return payload?.[entityId]?.forecast ?? [];
}

async function fetchCalendarEvents(
  connection: Connection,
  entityId: string
): Promise<CalendarServiceEvent[]> {
  const now = new Date();
  const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const response = (await connection.sendMessagePromise({
    type: 'call_service',
    domain: 'calendar',
    service: 'get_events',
    target: { entity_id: entityId },
    service_data: {
      start_date_time: now.toISOString(),
      end_date_time: end.toISOString(),
    },
    return_response: true,
  })) as CalendarEventsServiceEnvelope;

  const payload = response.response ?? response.result?.response;
  return payload?.[entityId]?.events ?? [];
}

function getEntityObjectId(entityId: string): string {
  const separatorIndex = entityId.indexOf('.');
  return separatorIndex === -1 ? entityId : entityId.slice(separatorIndex + 1);
}

function getEntityCategory(
  entityEntry: { entity_category?: unknown } | undefined
): 'config' | 'diagnostic' | null {
  const raw = entityEntry?.entity_category;
  return typeof raw === 'string' ? (raw as 'config' | 'diagnostic') : null;
}

function getSwitchPrimarySortKey(
  entityId: string,
  entity: HassEntity,
  entityEntry?: { entity_category?: unknown }
): [number, number, string] {
  const entityCategory = getEntityCategory(entityEntry);
  const categoryPenalty =
    entityCategory === 'config' ? 100 : entityCategory === 'diagnostic' ? 200 : 0;
  const objectId = getEntityObjectId(entityId).toLowerCase();
  const friendlyName =
    typeof entity.attributes?.friendly_name === 'string'
      ? entity.attributes.friendly_name.toLowerCase()
      : '';
  const helperKeywordPenalty =
    /(boost|timer|speed|mode|humidity|light|delay|interval|preset|continuous|trickle|gateway|restart|reboot|update)/.test(
      `${objectId} ${friendlyName}`
    )
      ? 20
      : 0;

  return [categoryPenalty + helperKeywordPenalty, objectId.length, objectId];
}

function compareSortKeys(left: [number, number, string], right: [number, number, string]): number {
  if (left[0] !== right[0]) {
    return left[0] - right[0];
  }

  if (left[1] !== right[1]) {
    return left[1] - right[1];
  }

  return left[2].localeCompare(right[2]);
}

function createEmptyDeviceCollection(): DeviceCollection {
  return {
    lights: [],
    hvac: [],
    climate: [],
    media: [],
    weather: [],
    switches: [],
    helpers: [],
    covers: [],
    locks: [],
    scenes: [],
    persons: [],
    sensors: [],
    vacuums: [],
    calendars: [],
    cameras: [],
    'grouped-sensors': [],
  };
}

function useRegistryRoomResolver() {
  const areas = useHomeAssistant(homeAssistantSelectors.areas, shallow);
  const deviceRegistry = useHomeAssistant(homeAssistantSelectors.deviceRegistry, shallow);
  const entityRegistry = useHomeAssistant(homeAssistantSelectors.entityRegistry, shallow);

  const areaMap = useMemo(() => new Map(areas.map((area) => [area.area_id, area.name])), [areas]);
  const entityRegistryMap = useMemo(
    () => new Map(entityRegistry.map((registryEntry) => [registryEntry.entity_id, registryEntry])),
    [entityRegistry]
  );
  const deviceRegistryMap = useMemo(
    () => new Map(deviceRegistry.map((device) => [device.id, device])),
    [deviceRegistry]
  );

  return {
    areaMap,
    areas,
    deviceRegistry,
    deviceRegistryMap,
    entityRegistry,
    entityRegistryMap,
  };
}

export function useWeatherDevices(): WeatherDevice[] {
  const connection = useHomeAssistant(homeAssistantSelectors.connection);
  const config = useHomeAssistant(homeAssistantSelectors.config);
  const entities = useHomeAssistant(homeAssistantSelectors.entities, haEntityStructureEqual);
  const { areaMap, deviceRegistryMap, entityRegistryMap } = useRegistryRoomResolver();
  const { locale, t } = useI18n();
  const weatherForecastMode = useSettingsStore(settingsSelectors.weatherForecastMode);
  const use24HourTime = useSettingsStore(settingsSelectors.use24HourTime);

  const primaryWeatherEntityId = useMemo(() => {
    if (!entities) {
      return null;
    }

    return Object.keys(entities).find((entityId) => entityId.startsWith('weather.')) ?? null;
  }, [entities]);

  const liveWeatherEntity = useHomeAssistant(
    useCallback(
      (state) =>
        primaryWeatherEntityId ? (state.entities?.[primaryWeatherEntityId] ?? null) : null,
      [primaryWeatherEntityId]
    )
  );

  const [weatherForecasts, setWeatherForecasts] = useState<WeatherForecastState>({});
  const deferredWeatherForecasts = useDeferredValue(weatherForecasts);

  useEffect(() => {
    if (!connection || !primaryWeatherEntityId) {
      startTransition(() => {
        setWeatherForecasts({});
      });
      return;
    }

    const activeConnection = connection;
    const weatherEntityId = primaryWeatherEntityId;
    let cancelled = false;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleRefresh = () => {
      refreshTimer = setTimeout(() => {
        void refreshForecasts();
      }, WEATHER_REFRESH_MS);
    };

    async function refreshForecasts() {
      const [daily, hourly] = await Promise.all([
        fetchWeatherForecast(activeConnection, weatherEntityId, 'daily').catch(() => []),
        fetchWeatherForecast(activeConnection, weatherEntityId, 'hourly').catch(() => []),
      ]);
      if (cancelled) {
        return;
      }

      startTransition(() => {
        setWeatherForecasts({
          [weatherEntityId]: {
            daily,
            hourly,
          },
        });
      });

      if (!cancelled) {
        scheduleRefresh();
      }
    }

    void refreshForecasts();

    return () => {
      cancelled = true;
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
    };
  }, [connection, primaryWeatherEntityId]);

  return useMemo(() => {
    if (!entities || !primaryWeatherEntityId) {
      return [];
    }

    const weatherEntity = liveWeatherEntity ?? entities[primaryWeatherEntityId];
    if (!weatherEntity) {
      return [];
    }

    const room = resolveEntityRoom(
      primaryWeatherEntityId,
      weatherEntity,
      areaMap,
      entityRegistryMap,
      deviceRegistryMap
    );

    return [
      mapWeatherDevice(primaryWeatherEntityId, weatherEntity, getName(weatherEntity), room, {
        sunEntity: entities['sun.sun'],
        config,
        weatherForecastMode,
        storedForecasts: deferredWeatherForecasts[primaryWeatherEntityId],
        locale,
        t,
        use24HourTime,
      }),
    ];
  }, [
    areaMap,
    config,
    deferredWeatherForecasts,
    deviceRegistryMap,
    entities,
    entityRegistryMap,
    liveWeatherEntity,
    locale,
    primaryWeatherEntityId,
    t,
    weatherForecastMode,
    use24HourTime,
  ]);
}

export function useCalendarDevices(): CalendarDevice[] {
  const connection = useHomeAssistant(homeAssistantSelectors.connection);
  const entities = useHomeAssistant(homeAssistantSelectors.entities, haEntityStructureEqual);
  const { areaMap, deviceRegistryMap, entityRegistryMap } = useRegistryRoomResolver();
  const { locale, t } = useI18n();
  const use24HourTime = useSettingsStore(settingsSelectors.use24HourTime);

  const calendarEntityIds = useMemo(() => {
    if (!entities) {
      return [];
    }

    return Object.keys(entities)
      .filter((entityId) => entityId.startsWith('calendar.'))
      .sort((left, right) => left.localeCompare(right));
  }, [entities]);

  const liveCalendarEntities = useHomeAssistant(
    useCallback(
      (state) =>
        Object.fromEntries(
          calendarEntityIds.map((entityId) => [entityId, state.entities?.[entityId] ?? null])
        ),
      [calendarEntityIds]
    ),
    shallow
  );

  const [calendarEvents, setCalendarEvents] = useState<Record<string, CalendarServiceEvent[]>>({});
  const deferredCalendarEvents = useDeferredValue(calendarEvents);

  useEffect(() => {
    if (!connection || calendarEntityIds.length === 0) {
      startTransition(() => {
        setCalendarEvents({});
      });
      return;
    }

    const activeConnection = connection;
    let cancelled = false;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;

    const scheduleRefresh = () => {
      refreshTimer = setTimeout(() => {
        void refreshEvents();
      }, CALENDAR_REFRESH_MS);
    };

    async function refreshEvents() {
      const entries = await Promise.all(
        calendarEntityIds.map(async (entityId) => {
          const events = await fetchCalendarEvents(activeConnection, entityId).catch(() => []);
          return [entityId, events] as const;
        })
      );
      if (cancelled) {
        return;
      }

      startTransition(() => {
        setCalendarEvents(Object.fromEntries(entries));
      });

      if (!cancelled) {
        scheduleRefresh();
      }
    }

    void refreshEvents();

    return () => {
      cancelled = true;
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
    };
  }, [calendarEntityIds, connection]);

  return useMemo(() => {
    if (!entities || calendarEntityIds.length === 0) {
      return [];
    }

    const calendarSources: CalendarDevice['sources'] = [];
    for (const entityId of calendarEntityIds) {
      const entity = liveCalendarEntities[entityId] ?? entities[entityId];
      if (!entity) {
        continue;
      }

      const room = resolveEntityRoom(
        entityId,
        entity,
        areaMap,
        entityRegistryMap,
        deviceRegistryMap
      );
      calendarSources.push(
        ...mapCalendarSources(entityId, entity, getName(entity), room, {
          calendarEvents: deferredCalendarEvents,
          locale,
          t,
          use24HourTime,
        })
      );
    }

    if (calendarSources.length === 0) {
      return [];
    }

    const roomSet = new Set(calendarSources.map((source) => source.room).filter(Boolean));
    const fallbackEventColors = [
      'bg-blue-500',
      'bg-purple-500',
      'bg-green-500',
      'bg-orange-500',
      'bg-indigo-500',
    ] as const;
    const singleRoom = roomSet.size === 1 ? roomSet.values().next().value : null;
    const combinedEvents = calendarSources
      .flatMap((source, index) =>
        source.events.map((event) => ({
          ...event,
          color:
            event.color || fallbackEventColors[index % fallbackEventColors.length] || 'bg-blue-500',
        }))
      )
      .sort((left, right) => {
        const leftKey = left.sortKey ?? left.startTime;
        const rightKey = right.sortKey ?? right.startTime;
        return leftKey.localeCompare(rightKey);
      })
      .slice(0, 12);

    return [
      {
        id: 'calendar.navet_overview',
        name: t('calendar.defaultTitle'),
        room: singleRoom ?? UNKNOWN_ROOM_LABEL,
        size: 'medium',
        sourceIds: calendarSources.map((source) => source.id),
        sources: calendarSources,
        events: combinedEvents,
      },
    ];
  }, [
    areaMap,
    calendarEntityIds,
    deferredCalendarEvents,
    deviceRegistryMap,
    entities,
    entityRegistryMap,
    liveCalendarEntities,
    locale,
    t,
    use24HourTime,
  ]);
}

/**
 * Maps raw Home Assistant entities to typed device collections.
 */
export const useHADevices = (): DeviceCollection => {
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
    const switchMetricsByDeviceId = new Map<string, DeviceMetric[]>();
    const primarySwitchEntityIdByDeviceId = new Map<string, string>();
    const deviceIdsWithVacuumEntity = new Set<string>();
    const deviceIdsWithClimateEntity = new Set<string>();
    const deviceIdsWithPrimaryCards = new Set<string>();

    const getRoom = (entityId: string, entity: HassEntity) =>
      resolveEntityRoom(entityId, entity, areaMap, entityRegistryMap, deviceRegistryMap);
    const shouldSuppressForVacuumDevice = (entityId: string) => {
      const deviceId = entityRegistryMap.get(entityId)?.device_id;
      return deviceId ? deviceIdsWithVacuumEntity.has(deviceId) : false;
    };
    const shouldSuppressHelperCard = (entityId: string) => {
      if (shouldSuppressForVacuumDevice(entityId)) {
        return true;
      }

      const deviceId = entityRegistryMap.get(entityId)?.device_id;
      return deviceId ? deviceIdsWithPrimaryCards.has(deviceId) : false;
    };
    const entityEntries = Object.entries(entities);

    const getDomain = (entityId: string): string => {
      const separatorIndex = entityId.indexOf('.');
      return separatorIndex === -1 ? entityId : entityId.slice(0, separatorIndex);
    };

    for (const [entityId, entity] of entityEntries) {
      const domain = getDomain(entityId);
      if (domain === 'vacuum') {
        const deviceId = entityRegistryMap.get(entityId)?.device_id;
        if (deviceId) {
          deviceIdsWithVacuumEntity.add(deviceId);
        }

        continue;
      }

      if (domain === 'climate') {
        const deviceId = entityRegistryMap.get(entityId)?.device_id;
        if (deviceId) {
          deviceIdsWithClimateEntity.add(deviceId);
        }
      }

      if (domain === 'sensor') {
        const entityEntry = entityRegistryMap.get(entityId);
        const deviceId = entityEntry?.device_id;
        if (!deviceId) {
          continue;
        }

        const rawValue =
          parseNumberish(entity.state) ??
          parseNumberish(entity.attributes?.native_value) ??
          parseNumberish(entity.attributes?.value);
        if (rawValue === null) {
          continue;
        }

        const metricState = switchMetricsByDeviceId.get(deviceId) ?? [];
        const deviceClass =
          typeof entity.attributes?.device_class === 'string'
            ? entity.attributes.device_class.toLowerCase()
            : null;
        const unit =
          entity.attributes?.unit_of_measurement ?? entity.attributes?.native_unit_of_measurement;
        const friendlyName =
          typeof entity.attributes?.friendly_name === 'string'
            ? entity.attributes.friendly_name.toLowerCase()
            : '';
        const normalizedMetric = normalizeMetric(deviceClass, friendlyName, rawValue, unit);
        if (normalizedMetric) {
          const nextMetric = {
            ...normalizedMetric,
            icon: inferMetricIcon(
              deviceClass,
              `${entityId} ${friendlyName} ${entity.attributes?.friendly_name ?? ''}`,
              unit
            ),
            category: 'measurement' as const,
          };
          const existingIndex = metricState.findIndex(
            (metric) => metric.label === nextMetric.label
          );
          if (existingIndex === -1) {
            metricState.push(nextMetric);
          } else {
            metricState[existingIndex] = nextMetric;
          }
        }

        switchMetricsByDeviceId.set(deviceId, metricState);
        continue;
      }

      if (domain === 'number' || domain === 'input_number' || domain === 'select') {
        const entityEntry = entityRegistryMap.get(entityId);
        const deviceId = entityEntry?.device_id;
        const entityCategory = getEntityCategory(entityEntry);
        if (!deviceId || entityCategory !== 'config') {
          continue;
        }

        const metricState = switchMetricsByDeviceId.get(deviceId) ?? [];
        const label = getMetricLabel(entityId, entity);
        const unit =
          typeof entity.attributes?.unit_of_measurement === 'string'
            ? entity.attributes.unit_of_measurement
            : typeof entity.attributes?.native_unit_of_measurement === 'string'
              ? entity.attributes.native_unit_of_measurement
              : '';
        const parsedValue =
          domain === 'select'
            ? entity.state
            : (parseNumberish(entity.state) ??
              parseNumberish(entity.attributes?.native_value) ??
              parseNumberish(entity.attributes?.value));
        if (parsedValue == null || parsedValue === '') {
          continue;
        }

        const nextMetric: DeviceMetric = {
          label,
          value: parsedValue,
          unit,
          icon: inferMetricIcon(null, `${entityId} ${label}`, unit),
          category: 'configuration' as const,
        };
        const existingIndex = metricState.findIndex((metric) => metric.label === nextMetric.label);
        if (existingIndex === -1) {
          metricState.push(nextMetric);
        } else {
          metricState[existingIndex] = nextMetric;
        }

        switchMetricsByDeviceId.set(deviceId, metricState);
      }
    }

    for (const [entityId] of entityEntries) {
      const domain = getDomain(entityId);
      if (
        domain !== 'light' &&
        domain !== 'switch' &&
        domain !== 'climate' &&
        domain !== 'cover' &&
        domain !== 'lock' &&
        domain !== 'media_player' &&
        domain !== 'vacuum' &&
        domain !== 'camera'
      ) {
        continue;
      }

      const deviceId = entityRegistryMap.get(entityId)?.device_id;
      if (deviceId) {
        deviceIdsWithPrimaryCards.add(deviceId);
      }
    }

    for (const [entityId, entity] of entityEntries) {
      if (getDomain(entityId) !== 'switch') {
        continue;
      }

      const entityEntry = entityRegistryMap.get(entityId);
      const deviceId = entityEntry?.device_id;
      if (!deviceId) {
        continue;
      }

      const currentPrimaryEntityId = primarySwitchEntityIdByDeviceId.get(deviceId);
      if (!currentPrimaryEntityId) {
        primarySwitchEntityIdByDeviceId.set(deviceId, entityId);
        continue;
      }

      const currentPrimaryEntity = entities[currentPrimaryEntityId];
      if (!currentPrimaryEntity) {
        primarySwitchEntityIdByDeviceId.set(deviceId, entityId);
        continue;
      }

      const currentSortKey = getSwitchPrimarySortKey(
        currentPrimaryEntityId,
        currentPrimaryEntity,
        entityRegistryMap.get(currentPrimaryEntityId)
      );
      const candidateSortKey = getSwitchPrimarySortKey(entityId, entity, entityEntry);

      if (compareSortKeys(candidateSortKey, currentSortKey) < 0) {
        primarySwitchEntityIdByDeviceId.set(deviceId, entityId);
      }
    }

    for (const [entityId, entity] of entityEntries) {
      const domain = getDomain(entityId);
      const name = getName(entity);
      const room = getRoom(entityId, entity);

      switch (domain) {
        case 'light':
          lights.push(mapLightDevice(entityId, entity, name, room));
          break;

        case 'switch': {
          const entityEntry = entityRegistryMap.get(entityId);
          const deviceId = entityEntry?.device_id;
          if (
            getEntityCategory(entityEntry) === 'config' ||
            getEntityCategory(entityEntry) === 'diagnostic'
          ) {
            break;
          }

          if (deviceId && deviceIdsWithVacuumEntity.has(deviceId)) {
            break;
          }

          if (deviceId && deviceIdsWithClimateEntity.has(deviceId)) {
            break;
          }

          if (deviceId && primarySwitchEntityIdByDeviceId.get(deviceId) !== entityId) {
            break;
          }

          const deviceMetrics = entityEntry?.device_id
            ? switchMetricsByDeviceId.get(entityEntry.device_id)
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
          if (
            getEntityCategory(entityRegistryMap.get(entityId)) === 'config' ||
            getEntityCategory(entityRegistryMap.get(entityId)) === 'diagnostic'
          ) {
            break;
          }

          if (shouldSuppressHelperCard(entityId)) {
            break;
          }

          helpers.push({
            id: entityId,
            name,
            room,
            size: 'small',
            state: entity.state === 'on',
            entityType: helperLabelForDomain(domain, t),
            serviceDomain: 'input_boolean',
          });
          break;

        case 'script':
          if (
            getEntityCategory(entityRegistryMap.get(entityId)) === 'config' ||
            getEntityCategory(entityRegistryMap.get(entityId)) === 'diagnostic'
          ) {
            break;
          }

          if (shouldSuppressHelperCard(entityId)) {
            break;
          }

          helpers.push({
            id: entityId,
            name,
            room,
            size: 'small',
            state: entity.state === 'on',
            entityType: helperLabelForDomain(domain, t),
            serviceDomain: 'script',
            serviceAction: 'turn_on',
          });
          break;

        case 'button':
        case 'input_button':
          if (
            getEntityCategory(entityRegistryMap.get(entityId)) === 'config' ||
            getEntityCategory(entityRegistryMap.get(entityId)) === 'diagnostic'
          ) {
            break;
          }

          if (shouldSuppressHelperCard(entityId)) {
            break;
          }

          helpers.push({
            id: entityId,
            name,
            room,
            size: 'small',
            state: false,
            entityType: helperLabelForDomain(domain, t),
            serviceDomain: domain,
            serviceAction: 'press',
          });
          break;

        case 'climate':
          climate.push(mapClimateDevice(entityId, entity, name, room));
          break;

        case 'media_player': {
          const mapped = mapMediaDevice(entityId, entity, name, room, t);
          media.push(mapped);
          break;
        }

        case 'person': {
          const mapped = mapPersonDevice(entityId, entity, name, room, t);
          persons.push(mapped);
          break;
        }

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
          if (shouldSuppressForVacuumDevice(entityId)) {
            break;
          }

          cameras.push(mapCameraDevice(entityId, entity, name, room));
          break;

        case 'vacuum': {
          const mapped = mapVacuumDevice(entityId, entity, name, room);
          vacuums.push(mapped);
          break;
        }

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
