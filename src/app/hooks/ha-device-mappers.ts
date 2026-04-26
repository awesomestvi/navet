import type { HassEntity } from 'home-assistant-js-websocket';
import { hasMediaPlayerGroupingSupport } from '../constants/media-player-features';
import type { TranslateFn } from '../i18n';
import type { HomeAssistantEntityRegistryEntry } from '../services/home-assistant.service';
import type {
  CalendarDevice,
  CameraDevice,
  ClimateDevice,
  CoverDevice,
  DeviceMetric,
  LightDevice,
  LockDevice,
  MediaDevice,
  PersonDevice,
  SceneDevice,
  SwitchDevice,
  VacuumDevice,
  WeatherDevice,
} from '../types/device.types';
import {
  brightnessToPercent,
  formatCalendarTime,
  formatClock,
  formatDaylight,
  formatEntityType,
  formatMediaEntityType,
  inferCalendarEventType,
  normalizeKelvin,
  parseCalendarDate,
  parseNumberish,
  parseRoundedNumberish,
} from './ha-entity-utils';

type WeatherForecastEntry = Record<string, unknown>;
type CalendarServiceEvent = Record<string, unknown>;

interface MapperContext {
  locale: string;
  t: TranslateFn;
}

interface WeatherContext extends MapperContext {
  sunEntity?: HassEntity;
  config?: Record<string, unknown> | null;
  weatherForecastMode: 'weekly' | 'hourly';
  storedForecasts?: { daily: WeatherForecastEntry[]; hourly: WeatherForecastEntry[] };
}

interface CalendarContext extends MapperContext {
  calendarEvents: Record<string, CalendarServiceEvent[]>;
}

function getEntityCategory(
  entityEntry?: HomeAssistantEntityRegistryEntry
): 'config' | 'diagnostic' | null {
  const raw = (entityEntry as Record<string, unknown> | undefined)?.entity_category;
  return typeof raw === 'string' ? (raw as 'config' | 'diagnostic') : null;
}

export function mapLightDevice(
  entityId: string,
  entity: HassEntity,
  name: string,
  room: string
): LightDevice {
  return {
    id: entityId,
    name,
    room,
    size: 'small',
    state: entity.state === 'on',
    brightness: brightnessToPercent(entityId, entity),
    temp: normalizeKelvin(entity),
  };
}

export function mapSwitchDevice(
  entityId: string,
  entity: HassEntity,
  name: string,
  room: string,
  t: MapperContext['t'],
  entityEntry?: HomeAssistantEntityRegistryEntry,
  deviceMetrics?: DeviceMetric[]
): SwitchDevice | null {
  const entityCategory = getEntityCategory(entityEntry);
  if (entityCategory === 'config' || entityCategory === 'diagnostic') {
    return null;
  }

  const powerMetric = deviceMetrics?.find((metric) => metric.label === 'Power');
  const voltageMetric = deviceMetrics?.find((metric) => metric.label === 'Voltage');
  const energyMetric = deviceMetrics?.find((metric) => metric.label === 'Energy');

  return {
    id: entityId,
    name,
    room,
    size: 'small',
    state: entity.state === 'on',
    entityType: formatEntityType(entity.attributes?.device_class, t('lighting.type.switch'), t),
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
  };
}

export function mapClimateDevice(
  entityId: string,
  entity: HassEntity,
  name: string,
  room: string
): ClimateDevice {
  return {
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
      (typeof entity.attributes?.hvac_action === 'string' && entity.attributes.hvac_action) ||
      undefined,
  };
}

export function mapMediaDevice(
  entityId: string,
  entity: HassEntity,
  name: string,
  room: string,
  t: MapperContext['t']
): MediaDevice {
  const supportedFeatures = parseNumberish(entity.attributes?.supported_features) ?? 0;
  const mediaDeviceClass =
    typeof entity.attributes?.device_class === 'string'
      ? entity.attributes.device_class
      : undefined;
  const entityPicture =
    (typeof entity.attributes?.entity_picture === 'string' && entity.attributes.entity_picture) ||
    (typeof entity.attributes?.entity_picture_local === 'string' &&
      entity.attributes.entity_picture_local) ||
    (typeof entity.attributes?.media_image_url === 'string' && entity.attributes.media_image_url) ||
    undefined;

  const normalizedState: MediaDevice['state'] =
    entity.state === 'playing'
      ? 'playing'
      : entity.state === 'paused'
        ? 'paused'
        : entity.state === 'idle'
          ? 'idle'
          : 'off';

  const mediaTitle =
    (typeof entity.attributes?.media_title === 'string' && entity.attributes.media_title) ||
    (typeof entity.attributes?.app_name === 'string' && entity.attributes.app_name) ||
    (typeof entity.attributes?.media_channel === 'string' && entity.attributes.media_channel) ||
    (typeof entity.attributes?.media_series_title === 'string' &&
      entity.attributes.media_series_title) ||
    t('media.nothingPlaying');

  const mediaArtist =
    (typeof entity.attributes?.media_artist === 'string' && entity.attributes.media_artist) ||
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

  return {
    id: entityId,
    name,
    room,
    size: 'medium',
    title: mediaTitle,
    artist: mediaArtist,
    entityType: formatMediaEntityType(mediaDeviceClass, t),
    deviceClass: mediaDeviceClass,
    source: mediaSource,
    sourceList: mediaSourceList,
    entityPicture,
    state: normalizedState,
    volume:
      typeof volumeLevel === 'number'
        ? Math.max(0, Math.min(100, Math.round(volumeLevel * 100)))
        : 0,
    isMuted: entity.attributes?.is_volume_muted === true,
    elapsedSeconds:
      typeof mediaPosition === 'number' ? Math.max(0, Math.floor(mediaPosition)) : undefined,
    durationSeconds:
      typeof mediaDuration === 'number' ? Math.max(0, Math.floor(mediaDuration)) : undefined,
    positionUpdatedAt,
    supportsGrouping: hasMediaPlayerGroupingSupport(supportedFeatures),
    groupMembers,
  };
}

export function mapPersonDevice(
  entityId: string,
  entity: HassEntity,
  name: string,
  room: string,
  t: MapperContext['t']
): PersonDevice {
  const personState = typeof entity.state === 'string' ? entity.state : 'not_home';
  const personLocation =
    personState === 'home'
      ? t('person.home')
      : personState === 'not_home'
        ? t('person.away')
        : personState
            .split('_')
            .map((segment) =>
              segment.length > 0 ? `${segment[0]?.toUpperCase() ?? ''}${segment.slice(1)}` : segment
            )
            .join(' ');

  return {
    id: entityId,
    name,
    room,
    size: 'small',
    location: personLocation,
    state: personState === 'home' ? 'home' : 'away',
    entityPicture:
      (typeof entity.attributes?.entity_picture === 'string' && entity.attributes.entity_picture) ||
      (typeof entity.attributes?.entity_picture_local === 'string' &&
        entity.attributes.entity_picture_local) ||
      undefined,
  };
}

export function mapCoverDevice(
  entityId: string,
  entity: HassEntity,
  name: string,
  room: string
): CoverDevice {
  return {
    id: entityId,
    name,
    room,
    size: 'medium',
    position: entity.attributes?.current_position || 0,
  };
}

export function mapLockDevice(
  entityId: string,
  entity: HassEntity,
  name: string,
  room: string
): LockDevice {
  return {
    id: entityId,
    name,
    room,
    size: 'small',
    state: entity.state === 'locked',
  };
}

export function mapSceneDevice(
  entityId: string,
  _entity: HassEntity,
  name: string,
  room: string
): SceneDevice {
  return {
    id: entityId,
    name,
    room,
    size: 'small',
  };
}

export function mapCameraDevice(
  entityId: string,
  entity: HassEntity,
  name: string,
  room: string
): CameraDevice {
  return {
    id: entityId,
    name,
    room,
    size: 'medium',
    entityPicture:
      typeof entity.attributes?.entity_picture === 'string'
        ? entity.attributes.entity_picture
        : undefined,
    state: entity.state,
  };
}

export function mapVacuumDevice(
  entityId: string,
  entity: HassEntity,
  name: string,
  room: string
): VacuumDevice {
  const batteryLevel = parseNumberish(entity.attributes?.battery_level);
  const cleanedAreaValue =
    parseNumberish(entity.attributes?.cleaned_area) ??
    parseNumberish(entity.attributes?.cleaned_area_today) ??
    parseNumberish(entity.attributes?.last_cleaned_area);
  const cleaningTimeMinutes =
    parseNumberish(entity.attributes?.cleaning_time) ??
    parseNumberish(entity.attributes?.clean_time) ??
    parseNumberish(entity.attributes?.cleaning_duration);

  const normalizedStatus: VacuumDevice['status'] =
    entity.state === 'cleaning'
      ? 'cleaning'
      : entity.state === 'returning'
        ? 'returning'
        : entity.state === 'docked'
          ? 'docked'
          : entity.state === 'paused'
            ? 'paused'
            : 'idle';

  return {
    id: entityId,
    name,
    room,
    size: 'medium',
    status: normalizedStatus,
    battery: typeof batteryLevel === 'number' ? Math.max(0, Math.min(100, batteryLevel)) : 0,
    cleanedArea:
      typeof cleanedAreaValue === 'number'
        ? `${cleanedAreaValue.toFixed(cleanedAreaValue >= 10 ? 0 : 1)} m²`
        : undefined,
    cleaningTime:
      typeof cleaningTimeMinutes === 'number'
        ? `${Math.max(0, Math.round(cleaningTimeMinutes))} min`
        : undefined,
  };
}

export function mapWeatherDevice(
  entityId: string,
  entity: HassEntity,
  name: string,
  room: string,
  context: WeatherContext
): WeatherDevice {
  const { sunEntity, config, weatherForecastMode, storedForecasts, locale, t } = context;

  const sunEntitySunrise = sunEntity?.attributes?.next_rising;
  const sunEntitySunset = sunEntity?.attributes?.next_setting;

  const fallbackDailyForecast = Array.isArray(entity.attributes?.forecast)
    ? (entity.attributes.forecast as WeatherForecastEntry[])
    : [];
  const dailyForecastSource =
    storedForecasts?.daily && storedForecasts.daily.length > 0
      ? storedForecasts.daily
      : fallbackDailyForecast;
  const hourlyForecastSource =
    storedForecasts?.hourly && storedForecasts.hourly.length > 0 ? storedForecasts.hourly : [];
  const selectedForecastSource =
    weatherForecastMode === 'hourly' && hourlyForecastSource.length > 0
      ? hourlyForecastSource
      : dailyForecastSource;
  const effectiveForecastMode =
    weatherForecastMode === 'hourly' && hourlyForecastSource.length > 0 ? 'hourly' : 'weekly';

  const hourlyFormatter = new Intl.DateTimeFormat(locale, { hour: 'numeric' });
  const weeklyFormatter = new Intl.DateTimeFormat(locale, { weekday: 'short' });

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
            ? hourlyFormatter.format(forecastDate)
            : index === 0
              ? t('weather.today')
              : weeklyFormatter.format(forecastDate)
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
      ? (config.location_name as string)
      : undefined) ||
    room ||
    name;

  return {
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
  };
}

export function mapCalendarSources(
  entityId: string,
  entity: HassEntity,
  name: string,
  room: string,
  context: CalendarContext
): NonNullable<CalendarDevice['sources']> {
  const { calendarEvents, locale, t } = context;
  const rawEvents = calendarEvents[entityId] ?? [];
  const fallbackTitle =
    typeof entity.attributes?.message === 'string' ? entity.attributes.message : '';
  const fallbackLocation =
    typeof entity.attributes?.location === 'string' ? entity.attributes.location : undefined;
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
      const location = typeof eventRecord.location === 'string' ? eventRecord.location : undefined;
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

  return [
    {
      id: entityId,
      name,
      room,
      events,
    },
  ];
}

function formatWeatherValue(value: number): string {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}

function isAllDayCalendarValue(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  return value.length === 10 && value.endsWith('T00:00:00');
}
