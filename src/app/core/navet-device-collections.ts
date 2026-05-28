import type { DeviceCollection } from '@/app/types/device.types';
import type { NavetDevice, NavetProviderSnapshot } from './navet';

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

function toBaseDevice(device: NavetDevice) {
  return {
    id: device.canonicalId,
    name: device.name,
    room: device.room,
    size: readString(device.state.size, 'small') as
      | 'small'
      | 'medium'
      | 'large'
      | 'extra-large'
      | 'medium-vertical',
    providerId: device.providerId,
    nativeId: device.nativeId,
    canonicalId: device.canonicalId,
    resources: device.resources
      ? {
          primaryImage: device.resources.primary_image,
          artwork: device.resources.media_artwork,
          snapshot: device.resources.camera_snapshot,
          stream: device.resources.camera_stream,
        }
      : undefined,
  };
}

export function mapNavetDevicesToDeviceCollection(devices: NavetDevice[]): DeviceCollection {
  const collection = createEmptyDeviceCollection();

  for (const device of devices) {
    const base = toBaseDevice(device);
    const state = device.state;

    switch (device.kind) {
      case 'light':
        collection.lights.push({
          ...base,
          state: state.value === 'on' || state.on === true,
          brightness: readNumber(state.brightnessPct, 0),
          temp: readNumber(state.colorTemperatureKelvin, 0),
        });
        break;
      case 'fan':
        collection.fans.push({
          ...base,
          state: state.value === 'on' || state.on === true,
          percentage: readNumber(state.percentage, 0),
          presetMode: typeof state.presetMode === 'string' ? state.presetMode : undefined,
          presetModes: readStringArray(state.presetModes),
        });
        break;
      case 'switch':
        collection.switches.push({
          ...base,
          state: state.value === 'on' || state.on === true,
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
          state: state.value === 'on' || state.on === true,
          entityType: typeof state.entityType === 'string' ? state.entityType : undefined,
          serviceDomain: typeof state.serviceDomain === 'string' ? state.serviceDomain : undefined,
          serviceAction: typeof state.serviceAction === 'string' ? state.serviceAction : undefined,
        });
        break;
      case 'sensor':
        collection.sensors.push({
          ...base,
          value:
            typeof state.value === 'string'
              ? state.value
              : typeof state.value === 'number'
                ? String(state.value)
                : state.value === true
                  ? 'Detected'
                  : state.value === false
                    ? 'Clear'
                    : '',
          unit: readString(state.unit, ''),
          icon:
            typeof state.icon === 'string'
              ? (state.icon as DeviceCollection['sensors'][number]['icon'])
              : undefined,
          entityType: typeof state.entityType === 'string' ? state.entityType : undefined,
          deviceClass: typeof state.deviceClass === 'string' ? state.deviceClass : undefined,
          status:
            typeof state.status === 'string'
              ? (state.status as DeviceCollection['sensors'][number]['status'])
              : undefined,
          lastUpdated: typeof state.lastUpdated === 'string' ? state.lastUpdated : undefined,
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
      case 'media':
        collection.media.push({
          ...base,
          title: readString(state.title, device.name),
          artist: readString(state.artist, ''),
          entityType: typeof state.entityType === 'string' ? state.entityType : undefined,
          deviceClass: typeof state.deviceClass === 'string' ? state.deviceClass : undefined,
          source: typeof state.source === 'string' ? state.source : undefined,
          sourceList: readStringArray(state.sourceList),
          entityPicture: typeof state.entityPicture === 'string' ? state.entityPicture : undefined,
          state:
            state.value === 'playing' || state.value === 'paused' || state.value === 'idle'
              ? state.value
              : 'off',
          volume: readNumber(state.volume, 0),
          isMuted: state.isMuted === true,
          elapsedSeconds:
            typeof state.elapsedSeconds === 'number' ? state.elapsedSeconds : undefined,
          durationSeconds:
            typeof state.durationSeconds === 'number' ? state.durationSeconds : undefined,
          positionUpdatedAt:
            typeof state.positionUpdatedAt === 'string' ? state.positionUpdatedAt : undefined,
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
          state: state.value === 'locked' || state.locked === true,
        });
        break;
      case 'scene':
        collection.scenes.push(base);
        break;
      case 'person':
        collection.persons.push({
          ...base,
          location: readString(state.location, ''),
          state: state.value === 'home' ? 'home' : 'away',
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
          state: readString(state.value, ''),
          supportedFeatures:
            typeof state.supportedFeatures === 'number' ? state.supportedFeatures : undefined,
          isStreamCapable: state.isStreamCapable === true,
          isStillImageOnly: state.isStillImageOnly === true,
          lastChanged: typeof state.lastChanged === 'string' ? state.lastChanged : undefined,
          lastUpdated: typeof state.lastUpdated === 'string' ? state.lastUpdated : undefined,
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

export function mapProviderSnapshotsToDeviceCollection(
  snapshots: NavetProviderSnapshot[]
): DeviceCollection {
  return snapshots.reduce<DeviceCollection>((collection, snapshot) => {
    const next = mapNavetDevicesToDeviceCollection(snapshot.devices);

    collection.lights.push(...next.lights);
    collection.fans.push(...next.fans);
    collection.hvac.push(...next.hvac);
    collection.climate.push(...next.climate);
    collection.media.push(...next.media);
    collection.weather.push(...next.weather);
    collection.switches.push(...next.switches);
    collection.helpers.push(...next.helpers);
    collection.covers.push(...next.covers);
    collection.locks.push(...next.locks);
    collection.scenes.push(...next.scenes);
    collection.persons.push(...next.persons);
    collection.sensors.push(...next.sensors);
    collection.vacuums.push(...next.vacuums);
    collection.calendars.push(...next.calendars);
    collection.cameras.push(...next.cameras);
    collection['grouped-sensors'].push(...next['grouped-sensors']);

    return collection;
  }, createEmptyDeviceCollection());
}
