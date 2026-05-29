import type { NavetEntity } from '@navet/core/types';
import type { DeviceCollection } from '@/app/types/device.types';

export function createEmptyDeviceCollection(): DeviceCollection {
  return {
    lights: [],
    fans: [],
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

type EntityStateRecord = Record<string, unknown>;

function readEntityState(entity: NavetEntity): EntityStateRecord {
  return entity.attributes && typeof entity.attributes === 'object' ? entity.attributes : {};
}

function readNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function readString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function readStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const strings = value.filter((entry): entry is string => typeof entry === 'string');
  return strings.length > 0 ? strings : undefined;
}

function toBaseDevice(entity: NavetEntity, state: EntityStateRecord) {
  return {
    id: entity.canonicalId,
    name: entity.name,
    room: entity.room ?? 'Unknown',
    size: readString(state.size, 'small') as
      | 'small'
      | 'medium'
      | 'large'
      | 'extra-large'
      | 'medium-vertical',
    providerId: entity.providerId,
    nativeId: entity.externalId,
    canonicalId: entity.canonicalId,
    resources: entity.resources
      ? {
          primaryImage: entity.resources.primary_image,
          artwork: entity.resources.media_artwork,
          snapshot: entity.resources.camera_snapshot,
          stream: entity.resources.camera_stream,
        }
      : undefined,
  };
}

function resolveEntityValue(entity: NavetEntity, state: EntityStateRecord) {
  return 'value' in state ? state.value : entity.primaryState;
}

export function mapNavetEntitiesToDeviceCollection(entities: NavetEntity[]): DeviceCollection {
  const collection = createEmptyDeviceCollection();

  for (const entity of entities) {
    const state = readEntityState(entity);
    const base = toBaseDevice(entity, state);
    const value = resolveEntityValue(entity, state);

    switch (entity.type) {
      case 'light':
        collection.lights.push({
          ...base,
          state: value === 'on' || state.on === true,
          brightness: readNumber(state.brightnessPct, 0),
          temp: readNumber(state.colorTemperatureKelvin, 0),
        });
        break;
      case 'fan':
        collection.fans.push({
          ...base,
          state: value === 'on' || state.on === true,
          percentage: readNumber(state.percentage, 0),
          presetMode: typeof state.presetMode === 'string' ? state.presetMode : undefined,
          presetModes: readStringArray(state.presetModes),
        });
        break;
      case 'switch':
        collection.switches.push({
          ...base,
          state: value === 'on' || state.on === true,
          entityType: typeof state.entityType === 'string' ? state.entityType : undefined,
          serviceDomain: typeof state.serviceDomain === 'string' ? state.serviceDomain : undefined,
          serviceAction: typeof state.serviceAction === 'string' ? state.serviceAction : undefined,
          power: typeof state.power === 'number' ? state.power : undefined,
          voltage: typeof state.voltage === 'number' ? state.voltage : undefined,
          energy: typeof state.energy === 'number' ? state.energy : undefined,
          metrics: Array.isArray(state.metrics)
            ? (state.metrics as DeviceCollection['switches'][number]['metrics'])
            : undefined,
        });
        break;
      case 'helper':
        collection.helpers.push({
          ...base,
          state: value === 'on' || state.on === true,
          entityType: typeof state.entityType === 'string' ? state.entityType : undefined,
          serviceDomain: typeof state.serviceDomain === 'string' ? state.serviceDomain : undefined,
          serviceAction: typeof state.serviceAction === 'string' ? state.serviceAction : undefined,
        });
        break;
      case 'sensor':
      case 'binary_sensor':
      case 'energy':
      case 'unknown':
        collection.sensors.push({
          ...base,
          value:
            typeof value === 'string'
              ? value
              : typeof value === 'number'
                ? String(value)
                : value === true
                  ? 'Detected'
                  : value === false
                    ? 'Clear'
                    : '',
          unit: readString(state.unit, ''),
          icon:
            typeof state.icon === 'string'
              ? (state.icon as DeviceCollection['sensors'][number]['icon'])
              : undefined,
          entityType: typeof state.entityType === 'string' ? state.entityType : undefined,
          deviceClass: typeof state.deviceClass === 'string' ? state.deviceClass : undefined,
          sourceDeviceId:
            typeof state.sourceDeviceId === 'string' ? state.sourceDeviceId : undefined,
          status:
            typeof state.status === 'string'
              ? (state.status as DeviceCollection['sensors'][number]['status'])
              : undefined,
          lastUpdated:
            typeof state.lastUpdated === 'string'
              ? state.lastUpdated
              : typeof state.last_updated === 'string'
                ? state.last_updated
                : entity.lastUpdated,
        });
        break;
      case 'grouped_sensor':
        collection['grouped-sensors'].push({
          ...base,
          sensors: Array.isArray(state.sensors)
            ? (state.sensors as DeviceCollection['grouped-sensors'][number]['sensors'])
            : [],
          accentColor:
            state.accentColor === 'teal' ||
            state.accentColor === 'blue' ||
            state.accentColor === 'purple' ||
            state.accentColor === 'amber' ||
            state.accentColor === 'emerald'
              ? state.accentColor
              : undefined,
        });
        break;
      case 'climate':
      case 'hvac':
        collection.climate.push({
          ...base,
          temperature: readNumber(state.temperature, 0),
          currentTemperature: readNumber(state.currentTemperature, 0),
          temperatureUnit:
            state.temperatureUnit === 'celsius' || state.temperatureUnit === 'fahrenheit'
              ? state.temperatureUnit
              : undefined,
          mode: readString(state.mode, 'off'),
          action: typeof state.action === 'string' ? state.action : undefined,
          supportedHvacModes: readStringArray(state.supportedHvacModes),
          serviceDomain:
            state.serviceDomain === 'climate' || state.serviceDomain === 'water_heater'
              ? state.serviceDomain
              : undefined,
        });
        break;
      case 'weather':
        collection.weather.push({
          ...base,
          temperature: readNumber(state.temperature, 0),
          temperatureUnit:
            state.temperatureUnit === 'celsius' || state.temperatureUnit === 'fahrenheit'
              ? state.temperatureUnit
              : undefined,
          feelsLikeTemperature:
            typeof state.feelsLikeTemperature === 'number' ? state.feelsLikeTemperature : undefined,
          feelsLikeTemperatureUnit:
            state.feelsLikeTemperatureUnit === 'celsius' ||
            state.feelsLikeTemperatureUnit === 'fahrenheit'
              ? state.feelsLikeTemperatureUnit
              : undefined,
          location: readString(state.location, base.room),
          condition: readString(state.condition, ''),
          humidity: readNumber(state.humidity, 0),
          windSpeed: readNumber(state.windSpeed, 0),
          windSpeedUnit: typeof state.windSpeedUnit === 'string' ? state.windSpeedUnit : undefined,
          windGustSpeed: typeof state.windGustSpeed === 'number' ? state.windGustSpeed : undefined,
          pressure: readNumber(state.pressure, 0),
          pressureUnit: typeof state.pressureUnit === 'string' ? state.pressureUnit : undefined,
          uvIndex: typeof state.uvIndex === 'number' ? state.uvIndex : undefined,
          cloudCoverage: typeof state.cloudCoverage === 'number' ? state.cloudCoverage : undefined,
          precipitation: readNumber(state.precipitation, 0),
          precipitationUnit: readString(state.precipitationUnit, ''),
          sunrise: readString(state.sunrise, ''),
          sunset: readString(state.sunset, ''),
          daylight: readString(state.daylight, ''),
          rainForecast: readString(state.rainForecast, ''),
          highTemp: readNumber(state.highTemp, 0),
          highTempUnit:
            state.highTempUnit === 'celsius' || state.highTempUnit === 'fahrenheit'
              ? state.highTempUnit
              : undefined,
          lowTemp: readNumber(state.lowTemp, 0),
          lowTempUnit:
            state.lowTempUnit === 'celsius' || state.lowTempUnit === 'fahrenheit'
              ? state.lowTempUnit
              : undefined,
          forecastMode:
            state.forecastMode === 'weekly' || state.forecastMode === 'hourly'
              ? state.forecastMode
              : 'weekly',
          forecast: Array.isArray(state.forecast)
            ? (state.forecast as DeviceCollection['weather'][number]['forecast'])
            : [],
        });
        break;
      case 'media_player':
        collection.media.push({
          ...base,
          title: readString(state.title, entity.name),
          artist: readString(state.artist, ''),
          entityType: typeof state.entityType === 'string' ? state.entityType : undefined,
          deviceClass: typeof state.deviceClass === 'string' ? state.deviceClass : undefined,
          source: typeof state.source === 'string' ? state.source : undefined,
          sourceList: readStringArray(state.sourceList),
          entityPicture: typeof state.entityPicture === 'string' ? state.entityPicture : undefined,
          state: value === 'playing' || value === 'paused' || value === 'idle' ? value : 'off',
          volume: readNumber(state.volume, 0),
          isMuted: state.isMuted === true,
          elapsedSeconds:
            typeof state.elapsedSeconds === 'number' ? state.elapsedSeconds : undefined,
          durationSeconds:
            typeof state.durationSeconds === 'number' ? state.durationSeconds : undefined,
          positionUpdatedAt:
            typeof state.positionUpdatedAt === 'string' ? state.positionUpdatedAt : undefined,
          mediaCapabilities:
            state.mediaCapabilities && typeof state.mediaCapabilities === 'object'
              ? (state.mediaCapabilities as DeviceCollection['media'][number]['mediaCapabilities'])
              : undefined,
          supportsGrouping: state.supportsGrouping === true,
          supportsPreviousTrack: state.supportsPreviousTrack !== false,
          supportsNextTrack: state.supportsNextTrack !== false,
          supportedFeatures:
            typeof state.supportedFeatures === 'number' ? state.supportedFeatures : undefined,
          groupMembers: readStringArray(state.groupMembers),
        });
        break;
      case 'cover':
        collection.covers.push({
          ...base,
          position: readNumber(state.position, 0),
          positionMode:
            state.positionMode === 'position' || state.positionMode === 'tilt'
              ? state.positionMode
              : undefined,
          deviceClass: typeof state.deviceClass === 'string' ? state.deviceClass : undefined,
          supportedFeatures:
            typeof state.supportedFeatures === 'number' ? state.supportedFeatures : undefined,
          hasPosition: state.hasPosition === true,
        });
        break;
      case 'lock':
        collection.locks.push({
          ...base,
          state: value === 'locked' || state.locked === true,
        });
        break;
      case 'scene':
        collection.scenes.push(base);
        break;
      case 'person':
        collection.persons.push({
          ...base,
          location: readString(state.location, ''),
          state: value === 'home' ? 'home' : 'away',
          entityPicture: typeof state.entityPicture === 'string' ? state.entityPicture : undefined,
        });
        break;
      case 'vacuum':
        collection.vacuums.push({
          ...base,
          status: readString(state.status, 'idle') as DeviceCollection['vacuums'][number]['status'],
          battery: readNumber(state.battery, 0),
          cleanedArea: typeof state.cleanedArea === 'string' ? state.cleanedArea : undefined,
          cleaningTime: typeof state.cleaningTime === 'string' ? state.cleaningTime : undefined,
          nextCleaning: typeof state.nextCleaning === 'string' ? state.nextCleaning : undefined,
          waterLevel:
            typeof state.waterLevel === 'string' || typeof state.waterLevel === 'number'
              ? state.waterLevel
              : undefined,
          binLevel:
            typeof state.binLevel === 'string' || typeof state.binLevel === 'number'
              ? state.binLevel
              : undefined,
        });
        break;
      case 'camera':
        collection.cameras.push({
          ...base,
          entityPicture: typeof state.entityPicture === 'string' ? state.entityPicture : undefined,
          state: readString(value, ''),
          supportedFeatures:
            typeof state.supportedFeatures === 'number' ? state.supportedFeatures : undefined,
          isStreamCapable: state.isStreamCapable === true,
          isStillImageOnly: state.isStillImageOnly === true,
          lastChanged:
            typeof state.lastChanged === 'string'
              ? state.lastChanged
              : typeof state.last_changed === 'string'
                ? state.last_changed
                : undefined,
          lastUpdated:
            typeof state.lastUpdated === 'string'
              ? state.lastUpdated
              : typeof state.last_updated === 'string'
                ? state.last_updated
                : entity.lastUpdated,
          motionDetected: state.motionDetected === true,
          motionChangedAt:
            typeof state.motionChangedAt === 'string' ? state.motionChangedAt : undefined,
        });
        break;
      default:
        break;
    }
  }

  return collection;
}
