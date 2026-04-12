import type { Connection, HassEntity } from 'home-assistant-js-websocket';
import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { shallow } from 'zustand/shallow';
import { STORAGE_KEYS } from '../constants/storage-keys';
import { normalizeMediaPlaybackState } from '../features/media';
import { normalizeVacuumStatus } from '../features/vacuum';
import { useI18n } from '../i18n';
import type { HomeAssistantEntityRegistryEntry } from '../services/home-assistant.service';
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
  brightnessToPercent,
  formatCalendarTime,
  formatClock,
  formatDaylight,
  formatEntityType,
  formatMediaEntityType,
  getMetricLabel,
  getName,
  helperLabelForDomain,
  inferCalendarEventType,
  inferMetricIcon,
  isAllDayCalendarValue,
  normalizeKelvin,
  normalizeMetric,
  parseCalendarDate,
  parseNumberish,
  parseRoundedNumberish,
  resolveEntityRoom,
} from './ha-entity-utils';
import { useHomeAssistant } from './use-home-assistant';
import { usePersistedState } from './use-persisted-state';

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

function formatWeatherValue(value: number): string {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}

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

function getEntityCategory(entityEntry?: HomeAssistantEntityRegistryEntry): string | null {
  const raw = (entityEntry as Record<string, unknown> | undefined)?.entity_category;
  return typeof raw === 'string' ? raw : null;
}

function getSwitchPrimarySortKey(
  entityId: string,
  entity: HassEntity,
  entityEntry?: HomeAssistantEntityRegistryEntry
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

/**
 * Maps raw Home Assistant entities to typed device collections.
 */
export const useHADevices = (): DeviceCollection => {
  const areas = useHomeAssistant(homeAssistantSelectors.areas, shallow);
  const connection = useHomeAssistant(homeAssistantSelectors.connection);
  const config = useHomeAssistant(homeAssistantSelectors.config);
  const deviceRegistry = useHomeAssistant(homeAssistantSelectors.deviceRegistry, shallow);
  // Structural equality: DeviceCollection only rebuilds when entities are added/removed,
  // not on every state change. Per-card subscriptions handle live state updates.
  const entities = useHomeAssistant(homeAssistantSelectors.entities, haEntityStructureEqual);
  const entityRegistry = useHomeAssistant(homeAssistantSelectors.entityRegistry, shallow);
  const { locale, t } = useI18n();
  const weatherForecastMode = useSettingsStore(settingsSelectors.weatherForecastMode);
  const [entityRoomOverrides] = usePersistedState<Record<string, string>>(
    STORAGE_KEYS.entityRoomOverrides,
    {}
  );
  const primaryWeatherEntityId = useMemo(() => {
    if (!entities) {
      return null;
    }

    return Object.keys(entities).find((entityId) => entityId.startsWith('weather.')) ?? null;
  }, [entities]);
  const calendarEntityIds = useMemo(() => {
    if (!entities) {
      return [];
    }

    return Object.keys(entities)
      .filter((entityId) => entityId.startsWith('calendar.'))
      .sort((left, right) => left.localeCompare(right));
  }, [entities]);
  const [weatherForecasts, setWeatherForecasts] = useState<WeatherForecastState>({});
  const [calendarEvents, setCalendarEvents] = useState<Record<string, CalendarServiceEvent[]>>({});
  const deferredWeatherForecasts = useDeferredValue(weatherForecasts);
  const deferredCalendarEvents = useDeferredValue(calendarEvents);

  useEffect(() => {
    if (!connection || !primaryWeatherEntityId) {
      startTransition(() => {
        setWeatherForecasts({});
      });
      return;
    }

    let cancelled = false;

    void Promise.all([
      fetchWeatherForecast(connection, primaryWeatherEntityId, 'daily').catch(() => []),
      fetchWeatherForecast(connection, primaryWeatherEntityId, 'hourly').catch(() => []),
    ]).then(([daily, hourly]) => {
      if (cancelled) {
        return;
      }

      startTransition(() => {
        setWeatherForecasts({
          [primaryWeatherEntityId]: {
            daily,
            hourly,
          },
        });
      });
    });

    return () => {
      cancelled = true;
    };
  }, [connection, primaryWeatherEntityId]);

  useEffect(() => {
    if (!connection || calendarEntityIds.length === 0) {
      startTransition(() => {
        setCalendarEvents({});
      });
      return;
    }

    let cancelled = false;

    void Promise.all(
      calendarEntityIds.map(async (entityId) => {
        const events = await fetchCalendarEvents(connection, entityId).catch(() => []);
        return [entityId, events] as const;
      })
    ).then((entries) => {
      if (cancelled) {
        return;
      }

      startTransition(() => {
        setCalendarEvents(Object.fromEntries(entries));
      });
    });

    return () => {
      cancelled = true;
    };
  }, [calendarEntityIds, connection]);

  return useMemo(() => {
    if (!entities) {
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

    const hourlyForecastLabelFormatter = new Intl.DateTimeFormat(locale, { hour: 'numeric' });
    const weeklyForecastLabelFormatter = new Intl.DateTimeFormat(locale, { weekday: 'short' });

    const sunEntity = entities['sun.sun'];
    const sunEntitySunrise = sunEntity?.attributes?.next_rising;
    const sunEntitySunset = sunEntity?.attributes?.next_setting;

    // Process entities into device collections
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
    const weather: WeatherDevice[] = [];
    const calendars: CalendarDevice[] = [];
    const calendarSources: CalendarDevice['sources'] = [];
    const cameras: CameraDevice[] = [];
    const areaMap = new Map(areas.map((area) => [area.area_id, area.name]));
    const entityRegistryMap = new Map(
      entityRegistry.map((registryEntry) => [registryEntry.entity_id, registryEntry])
    );
    const deviceRegistryMap = new Map(deviceRegistry.map((device) => [device.id, device]));
    const switchMetricsByDeviceId = new Map<string, DeviceMetric[]>();
    const primarySwitchEntityIdByDeviceId = new Map<string, string>();
    const deviceIdsWithVacuumEntity = new Set<string>();
    const deviceIdsWithClimateEntity = new Set<string>();
    const deviceIdsWithPrimaryCards = new Set<string>();

    const getRoom = (entityId: string, entity: HassEntity) =>
      resolveEntityRoom(
        entityId,
        entity,
        entityRoomOverrides[entityId],
        areaMap,
        entityRegistryMap,
        deviceRegistryMap
      );
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

    // Pre-pass: collect power/config metrics for switch devices
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
          const nextMetric: DeviceMetric = {
            ...normalizedMetric,
            icon: inferMetricIcon(
              deviceClass,
              `${entityId} ${friendlyName} ${entity.attributes?.friendly_name ?? ''}`,
              unit
            ),
            category: 'measurement',
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
          category: 'configuration',
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

    // Pre-pass: choose one primary switch card entity per HA device.
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

    // Process each entity based on domain
    for (const [entityId, entity] of entityEntries) {
      const domain = getDomain(entityId);
      const name = getName(entity);
      const room = getRoom(entityId, entity);

      switch (domain) {
        case 'light':
          lights.push({
            id: entityId,
            name,
            room,
            size: 'small',
            state: entity.state === 'on',
            brightness: brightnessToPercent(entityId, entity),
            temp: normalizeKelvin(entity),
          });
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
          const powerMetric = deviceMetrics?.find((metric) => metric.label === 'Power');
          const voltageMetric = deviceMetrics?.find((metric) => metric.label === 'Voltage');
          const energyMetric = deviceMetrics?.find((metric) => metric.label === 'Energy');
          switches.push({
            id: entityId,
            name,
            room,
            size: 'small',
            state: entity.state === 'on',
            entityType: formatEntityType(
              entity.attributes?.device_class,
              t('lighting.type.switch'),
              t
            ),
            power:
              parseNumberish(entity.attributes?.power) ??
              parseNumberish(entity.attributes?.current_power_w) ??
              (typeof powerMetric?.value === 'number' ? powerMetric.value : undefined),
            voltage:
              parseNumberish(entity.attributes?.voltage) ??
              parseNumberish(entity.attributes?.current_voltage) ??
              (typeof voltageMetric?.value === 'number' ? voltageMetric.value : undefined),
            energy:
              parseNumberish(entity.attributes?.energy) ??
              parseNumberish(entity.attributes?.energy_today) ??
              (typeof energyMetric?.value === 'number' ? energyMetric.value : undefined),
            metrics: deviceMetrics,
          });
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
          climate.push({
            id: entityId,
            name,
            room,
            size: 'medium',
            temperature: parseFloat(entity.attributes?.temperature) || 0,
            currentTemperature:
              parseNumberish(entity.attributes?.current_temperature) ??
              (parseFloat(entity.attributes?.temperature ?? '0') || 0),
            mode:
              (typeof entity.state === 'string' && entity.state) ||
              (typeof entity.attributes?.hvac_mode === 'string' && entity.attributes.hvac_mode) ||
              'off',
            action:
              (typeof entity.attributes?.hvac_action === 'string' &&
                entity.attributes.hvac_action) ||
              undefined,
          });
          break;

        case 'media_player': {
          const supportedFeatures = parseNumberish(entity.attributes?.supported_features) ?? 0;
          const mediaDeviceClass =
            typeof entity.attributes?.device_class === 'string'
              ? entity.attributes.device_class
              : undefined;
          const mediaEntityType = formatMediaEntityType(mediaDeviceClass, t);
          const entityPicture =
            (typeof entity.attributes?.entity_picture === 'string' &&
              entity.attributes.entity_picture) ||
            (typeof entity.attributes?.entity_picture_local === 'string' &&
              entity.attributes.entity_picture_local) ||
            (typeof entity.attributes?.media_image_url === 'string' &&
              entity.attributes.media_image_url) ||
            undefined;
          const normalizedState: MediaDevice['state'] = normalizeMediaPlaybackState(
            entity.state,
            mediaDeviceClass
          );
          const mediaTitle =
            (typeof entity.attributes?.media_title === 'string' && entity.attributes.media_title) ||
            (typeof entity.attributes?.app_name === 'string' && entity.attributes.app_name) ||
            (typeof entity.attributes?.media_channel === 'string' &&
              entity.attributes.media_channel) ||
            (typeof entity.attributes?.media_series_title === 'string' &&
              entity.attributes.media_series_title) ||
            t('media.nothingPlaying');
          const mediaArtist =
            (typeof entity.attributes?.media_artist === 'string' &&
              entity.attributes.media_artist) ||
            (typeof entity.attributes?.media_album_name === 'string' &&
              entity.attributes.media_album_name) ||
            (typeof entity.attributes?.media_series_title === 'string' &&
              entity.attributes.media_series_title) ||
            (typeof entity.attributes?.app_name === 'string' && entity.attributes.app_name) ||
            (typeof entity.attributes?.source === 'string' && entity.attributes.source) ||
            t('media.nothingPlayingDescription');
          const mediaSource =
            typeof entity.attributes?.source === 'string' ? entity.attributes.source : undefined;
          const mediaSourceList = Array.isArray(entity.attributes?.source_list)
            ? entity.attributes.source_list.filter(
                (value): value is string => typeof value === 'string' && value.trim().length > 0
              )
            : [];
          const volumeLevel = parseNumberish(entity.attributes?.volume_level);
          const mediaPosition = parseNumberish(entity.attributes?.media_position);
          const mediaDuration = parseNumberish(entity.attributes?.media_duration);
          const positionUpdatedAt =
            typeof entity.attributes?.media_position_updated_at === 'string'
              ? entity.attributes.media_position_updated_at
              : undefined;
          const groupMembers = Array.isArray(entity.attributes?.group_members)
            ? entity.attributes.group_members.filter(
                (value): value is string => typeof value === 'string' && value.length > 0
              )
            : [];

          media.push({
            id: entityId,
            name,
            room,
            size: 'medium',
            title: mediaTitle,
            artist: mediaArtist,
            entityType: mediaEntityType,
            deviceClass: mediaDeviceClass,
            source: mediaSource,
            sourceList: mediaSourceList,
            entityPicture,
            state: normalizedState,
            volume:
              typeof volumeLevel === 'number'
                ? Math.max(0, Math.min(100, Math.round(volumeLevel * 100)))
                : 70,
            isMuted: entity.attributes?.is_volume_muted === true,
            elapsedSeconds:
              typeof mediaPosition === 'number'
                ? Math.max(0, Math.floor(mediaPosition))
                : undefined,
            durationSeconds:
              typeof mediaDuration === 'number'
                ? Math.max(0, Math.floor(mediaDuration))
                : undefined,
            positionUpdatedAt,
            supportsGrouping: (supportedFeatures & 524288) === 524288,
            groupMembers,
          });
          break;
        }

        case 'person': {
          const personState = typeof entity.state === 'string' ? entity.state : 'not_home';
          const personLocation =
            personState === 'home'
              ? t('person.home')
              : personState === 'not_home'
                ? t('person.away')
                : personState
                    .split('_')
                    .map((segment) =>
                      segment.length > 0
                        ? `${segment[0]?.toUpperCase() ?? ''}${segment.slice(1)}`
                        : segment
                    )
                    .join(' ');

          persons.push({
            id: entityId,
            name,
            room,
            size: 'small',
            location: personLocation,
            state: personState === 'home' ? 'home' : 'away',
            entityPicture:
              (typeof entity.attributes?.entity_picture === 'string' &&
                entity.attributes.entity_picture) ||
              (typeof entity.attributes?.entity_picture_local === 'string' &&
                entity.attributes.entity_picture_local) ||
              undefined,
          });
          break;
        }

        case 'cover':
          covers.push({
            id: entityId,
            name,
            room,
            size: 'medium',
            position: entity.attributes?.current_position || 0,
          });
          break;

        case 'lock':
          locks.push({
            id: entityId,
            name,
            room,
            size: 'small',
            state: entity.state === 'locked',
          });
          break;

        case 'scene':
          scenes.push({
            id: entityId,
            name,
            room,
            size: 'small',
          });
          break;

        case 'camera':
          if (shouldSuppressForVacuumDevice(entityId)) {
            break;
          }

          cameras.push({
            id: entityId,
            name,
            room,
            size: 'medium',
            entityPicture:
              typeof entity.attributes?.entity_picture === 'string'
                ? entity.attributes.entity_picture
                : undefined,
            state: entity.state,
          });
          break;

        case 'vacuum': {
          const batteryLevel = parseNumberish(entity.attributes?.battery_level);
          const cleanedAreaValue =
            parseNumberish(entity.attributes?.cleaned_area) ??
            parseNumberish(entity.attributes?.cleaned_area_today) ??
            parseNumberish(entity.attributes?.last_cleaned_area);
          const cleaningTimeMinutes =
            parseNumberish(entity.attributes?.cleaning_time) ??
            parseNumberish(entity.attributes?.clean_time) ??
            parseNumberish(entity.attributes?.cleaning_duration);

          const normalizedStatus: VacuumDevice['status'] = normalizeVacuumStatus(entity.state);

          vacuums.push({
            id: entityId,
            name,
            room,
            size: 'medium',
            status: normalizedStatus,
            battery:
              typeof batteryLevel === 'number' ? Math.max(0, Math.min(100, batteryLevel)) : 0,
            cleanedArea:
              typeof cleanedAreaValue === 'number'
                ? `${cleanedAreaValue.toFixed(cleanedAreaValue >= 10 ? 0 : 1)} m²`
                : undefined,
            cleaningTime:
              typeof cleaningTimeMinutes === 'number'
                ? `${Math.max(0, Math.round(cleaningTimeMinutes))} min`
                : undefined,
          });
          break;
        }

        case 'calendar': {
          const rawEvents = deferredCalendarEvents[entityId] ?? [];
          const fallbackTitle =
            typeof entity.attributes?.message === 'string' ? entity.attributes.message : '';
          const fallbackLocation =
            typeof entity.attributes?.location === 'string'
              ? entity.attributes.location
              : undefined;
          const fallbackEvents =
            fallbackTitle.length > 0
              ? [
                  {
                    id: `${entityId}-current`,
                    title: fallbackTitle,
                    start: entity.attributes?.start_time,
                    end: entity.attributes?.end_time,
                    location: fallbackLocation,
                  },
                ]
              : [];

          const colors = [
            'bg-blue-500',
            'bg-purple-500',
            'bg-green-500',
            'bg-orange-500',
            'bg-indigo-500',
          ] as const;

          const events = (rawEvents.length > 0 ? rawEvents : fallbackEvents)
            .map((rawEvent, index) => {
              const eventRecord = rawEvent as Record<string, unknown>;
              const title =
                typeof eventRecord.title === 'string'
                  ? eventRecord.title
                  : typeof eventRecord.summary === 'string'
                    ? eventRecord.summary
                    : typeof eventRecord.message === 'string'
                      ? eventRecord.message
                      : t('calendar.fallbackEvent', { count: index + 1 });
              const location =
                typeof eventRecord.location === 'string' ? eventRecord.location : undefined;
              const description =
                typeof eventRecord.description === 'string'
                  ? eventRecord.description
                  : typeof eventRecord.notes === 'string'
                    ? eventRecord.notes
                    : typeof eventRecord.message === 'string'
                      ? eventRecord.message
                      : undefined;
              const startDate = parseCalendarDate(eventRecord.start ?? eventRecord.start_time);
              const endDate = parseCalendarDate(eventRecord.end ?? eventRecord.end_time);
              const isAllDay = isAllDayCalendarValue(eventRecord.start ?? eventRecord.start_time);
              const startTime = formatCalendarTime(startDate, locale);
              const endTime = formatCalendarTime(endDate, locale);
              const attendees = Array.isArray(eventRecord.attendees)
                ? eventRecord.attendees.length
                : typeof eventRecord.attendees === 'number'
                  ? eventRecord.attendees
                  : undefined;

              return {
                id:
                  (typeof eventRecord.uid === 'string' && eventRecord.uid) ||
                  (typeof eventRecord.id === 'string' && eventRecord.id) ||
                  `${entityId}-${index}`,
                title,
                startTime,
                endTime,
                timeDisplay: startTime,
                isAllDay,
                location,
                description,
                type: inferCalendarEventType(title, location),
                color: colors[index % colors.length],
                attendees,
                sortKey: startDate?.toISOString(),
                sourceId: entityId,
                sourceName: name,
                startDate,
              };
            })
            .sort((left, right) => {
              const leftTime = left.startDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
              const rightTime = right.startDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
              return leftTime - rightTime;
            })
            .slice(0, 5)
            .map(({ startDate: _startDate, ...event }) => event);

          calendarSources.push({
            id: entityId,
            name,
            room,
            events,
          });
          break;
        }

        case 'weather': {
          if (entityId !== primaryWeatherEntityId) {
            break;
          }

          const storedForecasts = deferredWeatherForecasts[entityId];
          const fallbackDailyForecast = Array.isArray(entity.attributes?.forecast)
            ? (entity.attributes.forecast as WeatherForecastEntry[])
            : [];
          const dailyForecastSource =
            storedForecasts?.daily && storedForecasts.daily.length > 0
              ? storedForecasts.daily
              : fallbackDailyForecast;
          const hourlyForecastSource =
            storedForecasts?.hourly && storedForecasts.hourly.length > 0
              ? storedForecasts.hourly
              : [];
          const selectedForecastSource =
            weatherForecastMode === 'hourly' && hourlyForecastSource.length > 0
              ? hourlyForecastSource
              : dailyForecastSource;
          const effectiveForecastMode =
            weatherForecastMode === 'hourly' && hourlyForecastSource.length > 0
              ? 'hourly'
              : 'weekly';

          const forecast = selectedForecastSource
            .slice(0, 7)
            .map((entry: Record<string, unknown>, index) => {
              const forecastDate =
                typeof entry.datetime === 'string'
                  ? new Date(entry.datetime)
                  : typeof entry.datetime === 'number'
                    ? new Date(entry.datetime)
                    : null;
              const dayLabel =
                forecastDate && !Number.isNaN(forecastDate.getTime())
                  ? effectiveForecastMode === 'hourly'
                    ? hourlyForecastLabelFormatter.format(forecastDate)
                    : index === 0
                      ? t('weather.today')
                      : weeklyForecastLabelFormatter.format(forecastDate)
                  : effectiveForecastMode === 'hourly'
                    ? `+${index + 1}h`
                    : index === 0
                      ? t('weather.today')
                      : t('weather.dayFallback', { day: index + 1 });
              const forecastTemperature =
                parseRoundedNumberish(entry.temperature) ??
                parseRoundedNumberish(entry.native_temperature) ??
                0;

              return {
                day: dayLabel,
                condition: (typeof entry.condition === 'string' && entry.condition) || entity.state,
                high: forecastTemperature,
                low:
                  effectiveForecastMode === 'hourly'
                    ? forecastTemperature
                    : (parseRoundedNumberish(entry.templow) ?? 0),
              };
            });

          const highTemp =
            parseRoundedNumberish(dailyForecastSource[0]?.temperature) ??
            parseRoundedNumberish(entity.attributes?.temperature) ??
            parseRoundedNumberish(entity.attributes?.native_temperature) ??
            0;
          const lowTemp = parseRoundedNumberish(dailyForecastSource[0]?.templow) ?? highTemp;
          const precipitationUnit =
            (typeof entity.attributes?.precipitation_unit === 'string' &&
              entity.attributes.precipitation_unit) ||
            '%';
          const precipitationValue =
            parseNumberish(entity.attributes?.precipitation_probability) ??
            parseNumberish(entity.attributes?.precipitation) ??
            0;
          const tomorrowForecast = dailyForecastSource[1] as Record<string, unknown> | undefined;
          const tomorrowPrecipitationProbability = tomorrowForecast
            ? parseNumberish(tomorrowForecast.precipitation_probability)
            : null;
          const tomorrowPrecipitationAmount = tomorrowForecast
            ? parseNumberish(tomorrowForecast.precipitation)
            : null;

          const sunriseSource = sunEntitySunrise ?? entity.attributes?.sunrise;
          const sunsetSource = sunEntitySunset ?? entity.attributes?.sunset;
          const weatherLocation =
            (typeof entity.attributes?.location === 'string' && entity.attributes.location) ||
            (typeof entity.attributes?.city === 'string' && entity.attributes.city) ||
            (typeof entity.attributes?.place === 'string' && entity.attributes.place) ||
            (config &&
            typeof config === 'object' &&
            'location_name' in config &&
            typeof config.location_name === 'string'
              ? config.location_name
              : undefined) ||
            room ||
            name;

          weather.push({
            id: entityId,
            name,
            room,
            size: 'large',
            location: weatherLocation,
            temperature:
              parseRoundedNumberish(entity.attributes?.temperature) ??
              parseRoundedNumberish(entity.attributes?.native_temperature) ??
              0,
            condition: entity.state,
            humidity: parseNumberish(entity.attributes?.humidity) ?? 0,
            windSpeed:
              parseNumberish(entity.attributes?.wind_speed) ??
              parseNumberish(entity.attributes?.native_wind_speed) ??
              0,
            pressure:
              parseNumberish(entity.attributes?.pressure) ??
              parseNumberish(entity.attributes?.native_pressure) ??
              0,
            precipitation: precipitationValue,
            precipitationUnit,
            sunrise: formatClock(sunriseSource, locale),
            sunset: formatClock(sunsetSource, locale),
            daylight: formatDaylight(sunriseSource, sunsetSource),
            rainForecast:
              tomorrowPrecipitationProbability !== null
                ? t('weather.rainTomorrow', {
                    chance: Math.round(tomorrowPrecipitationProbability),
                  })
                : tomorrowPrecipitationAmount !== null
                  ? t('weather.precipitationTomorrow', {
                      amount: formatWeatherValue(tomorrowPrecipitationAmount),
                      unit: precipitationUnit,
                    })
                  : '',
            highTemp,
            lowTemp,
            forecastMode: effectiveForecastMode,
            forecast,
          });
          break;
        }
      }
    }

    if (calendarSources.length > 0) {
      const aggregatedCalendarId = 'calendar.navet_overview';
      const roomSet = new Set(calendarSources.map((source) => source.room).filter(Boolean));
      const aggregatedCalendarRoomOverride = entityRoomOverrides[aggregatedCalendarId];
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
              event.color ||
              fallbackEventColors[index % fallbackEventColors.length] ||
              'bg-blue-500',
          }))
        )
        .sort((left, right) => {
          const leftKey = left.sortKey ?? left.startTime;
          const rightKey = right.sortKey ?? right.startTime;
          return leftKey.localeCompare(rightKey);
        })
        .slice(0, 12);

      calendars.push({
        id: aggregatedCalendarId,
        name: t('calendar.defaultTitle'),
        room:
          (aggregatedCalendarRoomOverride
            ? (areaMap.get(aggregatedCalendarRoomOverride) ?? aggregatedCalendarRoomOverride)
            : null) ??
          singleRoom ??
          UNKNOWN_ROOM_LABEL,
        size: 'medium',
        sourceIds: calendarSources.map((source) => source.id),
        sources: calendarSources,
        events: combinedEvents,
      });
    }

    return {
      lights,
      hvac: [],
      climate,
      media,
      weather,
      switches,
      helpers,
      covers,
      locks,
      scenes,
      persons,
      sensors: [],
      vacuums,
      calendars,
      cameras,
      'grouped-sensors': [],
    };
  }, [
    areas,
    config,
    deferredCalendarEvents,
    deferredWeatherForecasts,
    deviceRegistry,
    entityRoomOverrides,
    entities,
    entityRegistry,
    locale,
    primaryWeatherEntityId,
    t,
    weatherForecastMode,
  ]);
};
