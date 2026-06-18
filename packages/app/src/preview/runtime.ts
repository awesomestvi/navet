import { mapNavetEntitiesToDeviceCollection } from '@navet/app/core/navet-device-collections';
import { setProviderPackageRegistrationOverride } from '@navet/app/provider-package-registry';
import { resetProviderRuntimeRegistrationCache } from '@navet/app/provider-runtime-registry';
import type { HomeAssistantStore } from '@navet/app/stores/home-assistant-store';
import { integrationStore } from '@navet/app/stores/integration-store';
import { createProviderScopedId } from '@navet/app/utils/provider-ids';
import type { NavetProviderContract } from '@navet/core/provider-contract';
import type {
  PlatformAutomationDetails,
  PlatformEntityRegistryEntry,
  PlatformEntitySnapshotMap,
  PlatformTaskRuntimeSnapshot,
} from '@navet/core/provider-feature-models';
import type {
  ProviderLightFeatureService,
  ProviderSecurityFeatureService,
  ProviderTaskFeatureService,
} from '@navet/core/provider-feature-services';
import type { ProviderPackageRegistration } from '@navet/core/provider-runtime-types';
import { createSnapshotBackedProviderAdapter } from '@navet/core/snapshot-backed-adapter';
import type {
  CommandResult,
  NavetCommand,
  NavetEntity,
  NavetProviderRoom,
  NavetProviderState,
} from '@navet/core/types';
import { createStore } from 'zustand/vanilla';

type PreviewHomeAssistantCompatibilityState = Pick<
  HomeAssistantStore,
  | 'areas'
  | 'config'
  | 'connected'
  | 'connecting'
  | 'connection'
  | 'deviceRegistry'
  | 'entities'
  | 'entityRegistry'
  | 'error'
  | 'reconnecting'
  | 'registriesHydrated'
  | 'user'
>;

export interface PreviewRuntimeScenario {
  id: string;
  entities: NavetEntity[];
  rooms: NavetProviderRoom[];
  homeAssistant: PreviewHomeAssistantCompatibilityState;
  taskRuntime: PlatformTaskRuntimeSnapshot;
}

interface PreviewRuntimeState {
  scenario: PreviewRuntimeScenario | null;
}

const PREVIEW_PROVIDER_ID = 'home_assistant';
const PREVIEW_TIMESTAMP = '2026-05-16T08:00:00.000Z';
const PREVIEW_HOME_ASSISTANT_CONFIG = {
  unit_system: {
    temperature: 'C',
  },
  temperature_unit: 'C',
  location_name: 'Navet Preview',
  time_zone: 'Europe/Stockholm',
};

const previewRuntimeStore = createStore<PreviewRuntimeState>(() => ({
  scenario: null,
}));

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, '_');
}

function createPreviewEntity(
  type: NavetEntity['type'],
  externalId: string,
  name: string,
  primaryState: NavetEntity['primaryState'],
  attributes: Record<string, unknown>,
  options: {
    room?: string;
  } = {}
): NavetEntity {
  return {
    id: createProviderScopedId(PREVIEW_PROVIDER_ID, externalId),
    canonicalId: createProviderScopedId(PREVIEW_PROVIDER_ID, externalId),
    providerId: PREVIEW_PROVIDER_ID,
    externalId,
    type,
    name,
    room: options.room ?? 'Home',
    primaryState,
    availability: 'available',
    attributes,
    capabilities: [],
    lastUpdated: PREVIEW_TIMESTAMP,
  };
}

function createPreviewRoom(name: string, memberEntityIds: string[]): NavetProviderRoom {
  const nativeId = slugify(name);
  return {
    id: createProviderScopedId(PREVIEW_PROVIDER_ID, nativeId),
    canonicalId: createProviderScopedId(PREVIEW_PROVIDER_ID, nativeId),
    providerId: PREVIEW_PROVIDER_ID,
    externalId: nativeId,
    name,
    normalizedName: name.trim().toLowerCase(),
    memberIds: memberEntityIds.map((entityId) =>
      createProviderScopedId(PREVIEW_PROVIDER_ID, entityId)
    ),
  };
}

function createHomeAssistantCompatEntity(entity: NavetEntity) {
  const state =
    entity.primaryState === null || entity.primaryState === undefined
      ? 'unknown'
      : typeof entity.primaryState === 'string'
        ? entity.primaryState
        : String(entity.primaryState);

  return {
    entity_id: entity.externalId,
    state,
    attributes: {
      friendly_name: entity.name,
      ...entity.attributes,
    },
    last_changed: PREVIEW_TIMESTAMP,
    last_updated: entity.lastUpdated ?? PREVIEW_TIMESTAMP,
    context: {
      id: `preview-${entity.externalId}`,
      parent_id: null,
      user_id: null,
    },
  };
}

function createHomeAssistantCompatibilityState(
  entities: NavetEntity[],
  areas: Array<{ area_id: string; name: string }>,
  deviceRegistry: Array<{ id: string; area_id: string | null; name?: string | null }>,
  entityRegistry: Array<{ entity_id: string; device_id: string | null; area_id?: string | null }>
): PreviewHomeAssistantCompatibilityState {
  return {
    connected: true,
    connecting: false,
    reconnecting: false,
    connection: null,
    config: PREVIEW_HOME_ASSISTANT_CONFIG as unknown as HomeAssistantStore['config'],
    entities: Object.fromEntries(
      entities.map((entity) => [entity.externalId, createHomeAssistantCompatEntity(entity)])
    ),
    user: null,
    areas: areas as HomeAssistantStore['areas'],
    deviceRegistry: deviceRegistry as HomeAssistantStore['deviceRegistry'],
    entityRegistry: entityRegistry as HomeAssistantStore['entityRegistry'],
    registriesHydrated: true,
    error: null,
  };
}

function createTaskRuntimeSnapshot(): PlatformTaskRuntimeSnapshot {
  return {
    entities: {
      'automation.good_morning': {
        entityId: 'automation.good_morning',
        state: 'on',
        name: 'Good morning',
        attributes: {
          description:
            'Raises bedroom lights, starts the kitchen speaker, and sets downstairs heat.',
          last_triggered: '2026-05-16T06:45:00.000Z',
          mode: 'single',
          current: 0,
        },
      },
      'automation.night_check': {
        entityId: 'automation.night_check',
        state: 'on',
        name: 'Night check',
        attributes: {
          description: 'Locks doors, arms home mode, and turns off common-area lights after 22:30.',
          last_triggered: '2026-05-15T22:32:00.000Z',
          mode: 'queued',
          current: 0,
        },
      },
      'automation.away_presence': {
        entityId: 'automation.away_presence',
        state: 'off',
        name: 'Away presence',
        attributes: {
          description: 'Runs presence lighting and camera notifications when nobody is home.',
          last_triggered: '2026-05-14T18:10:00.000Z',
          mode: 'restart',
          current: 0,
        },
      },
      'scene.movie_mode': {
        entityId: 'scene.movie_mode',
        state: 'scening',
        name: 'Movie mode',
        attributes: {},
      },
      'script.goodnight': {
        entityId: 'script.goodnight',
        state: 'off',
        name: 'Goodnight',
        attributes: {},
      },
    },
    rooms: [
      { id: 'kitchen', name: 'Kitchen' },
      { id: 'living-room', name: 'Living Room' },
      { id: 'hallway', name: 'Hallway' },
      { id: 'outside', name: 'Outside' },
    ],
    devices: [
      { id: 'device-kitchen', roomId: 'kitchen' },
      { id: 'device-living-room', roomId: 'living-room' },
      { id: 'device-hallway', roomId: 'hallway' },
      { id: 'device-outside', roomId: 'outside' },
    ],
    entityReferences: [
      { entityId: 'automation.good_morning', roomId: 'kitchen', deviceId: 'device-kitchen' },
      { entityId: 'automation.night_check', roomId: 'hallway', deviceId: 'device-hallway' },
      { entityId: 'automation.away_presence', roomId: 'outside', deviceId: 'device-outside' },
      { entityId: 'scene.movie_mode', roomId: 'living-room', deviceId: 'device-living-room' },
      { entityId: 'script.goodnight', roomId: 'hallway', deviceId: 'device-hallway' },
    ],
  };
}

function createPreviewScenario(): PreviewRuntimeScenario {
  const entities: NavetEntity[] = [
    createPreviewEntity(
      'light',
      'light.living_room',
      'Living Room',
      'on',
      {
        value: 'on',
        brightnessPct: 68,
        colorTemperatureKelvin: 3200,
        supportedColorModes: ['brightness', 'color_temp'],
        colorMode: 'color_temp',
        effect: 'None',
        effectList: ['None', 'Rainbow', 'Fire', 'Twinkle'],
        room: 'Living Room',
        deviceId: 'device-living-room-light',
      },
      { room: 'Living Room' }
    ),
    createPreviewEntity(
      'light',
      'light.kitchen',
      'Kitchen',
      'on',
      {
        value: 'on',
        brightnessPct: 84,
        colorTemperatureKelvin: 4100,
        supportedColorModes: ['brightness', 'color_temp'],
        colorMode: 'color_temp',
        room: 'Kitchen',
        deviceId: 'device-kitchen-light',
      },
      { room: 'Kitchen' }
    ),
    createPreviewEntity(
      'fan',
      'fan.bedroom_ceiling',
      'Bedroom fan',
      'on',
      {
        value: 'on',
        percentage: 66,
        room: 'Bedroom',
        deviceId: 'device-bedroom-fan',
      },
      { room: 'Bedroom' }
    ),
    createPreviewEntity(
      'hvac',
      'climate.main_floor',
      'Main floor',
      'heat',
      {
        value: 'heat',
        temperature: 22,
        currentTemperature: 21,
        temperatureUnit: 'celsius',
        action: 'heating',
        supportedHvacModes: ['off', 'heat', 'cool', 'auto'],
        room: 'Hallway',
        deviceId: 'device-hallway-climate',
      },
      { room: 'Hallway' }
    ),
    createPreviewEntity(
      'climate',
      'humidifier.bedroom',
      'Bedroom Humidifier',
      'on',
      {
        value: 'on',
        entityType: 'Humidifier',
        deviceClass: 'humidifier',
        targetHumidity: 46,
        minHumidity: 30,
        maxHumidity: 70,
        targetHumidityStep: 1,
        mode: 'auto',
        availableModes: ['auto', 'eco', 'sleep'],
        room: 'Bedroom',
        deviceId: 'device-bedroom-humidifier',
        serviceDomain: 'humidifier',
      },
      { room: 'Bedroom' }
    ),
    createPreviewEntity(
      'media_player',
      'media_player.living_room_speaker',
      'Living Room Speaker',
      'playing',
      {
        value: 'playing',
        title: 'Morning Mix',
        artist: 'Navet Radio',
        entityType: 'Speaker',
        source: 'Spotify',
        sourceList: ['Spotify', 'AirPlay', 'Radio'],
        volume: 42,
        isMuted: false,
        elapsedSeconds: 86,
        durationSeconds: 243,
        positionUpdatedAt: '2026-05-16T12:00:00.000Z',
        supportsGrouping: true,
        groupMembers: ['Kitchen Speaker'],
        room: 'Living Room',
        deviceId: 'device-living-room-speaker',
      },
      { room: 'Living Room' }
    ),
    createPreviewEntity(
      'weather',
      'weather.home',
      'Home Weather',
      'partlycloudy',
      {
        value: 'partlycloudy',
        location: 'Stockholm',
        temperature: 18,
        feelsLikeTemperature: 17,
        humidity: 58,
        windSpeed: 12,
        precipitation: 0.4,
        precipitationUnit: 'mm',
        sunrise: '05:08',
        sunset: '20:51',
        daylight: '15h 43m',
        rainForecast: 'Light rain possible later',
        highTemp: 22,
        lowTemp: 13,
        forecastMode: 'weekly',
        forecast: [
          { day: 'Mon', condition: 'sunny', high: 22, low: 13 },
          { day: 'Tue', condition: 'partlycloudy', high: 19, low: 12 },
        ],
        room: 'Outside',
        deviceId: 'device-outside-weather',
      },
      { room: 'Outside' }
    ),
    createPreviewEntity(
      'switch',
      'switch.desk_power',
      'Desk power',
      true,
      {
        value: true,
        entityType: 'switch',
        serviceDomain: 'switch',
        serviceAction: 'toggle',
        power: 230,
        room: 'Office',
        deviceId: 'device-office-switch',
      },
      { room: 'Office' }
    ),
    createPreviewEntity(
      'helper',
      'input_boolean.guest_mode',
      'Guest mode',
      true,
      {
        value: true,
        entityType: 'helper',
        serviceDomain: 'input_boolean',
        serviceAction: 'toggle',
        room: 'Hallway',
        deviceId: 'device-hallway-helper',
      },
      { room: 'Hallway' }
    ),
    createPreviewEntity(
      'cover',
      'cover.living_room_blind',
      'Living Room Blind',
      'open',
      {
        value: 'open',
        position: 72,
        positionMode: 'position',
        deviceClass: 'blind',
        supportedFeatures: 15,
        hasPosition: true,
        room: 'Living Room',
        deviceId: 'device-living-room-cover',
      },
      { room: 'Living Room' }
    ),
    createPreviewEntity(
      'lock',
      'lock.front_door',
      'Front Door',
      'locked',
      {
        value: 'locked',
        locked: true,
        room: 'Entrance',
        deviceId: 'device-entrance-lock',
      },
      { room: 'Entrance' }
    ),
    createPreviewEntity(
      'scene',
      'scene.movie_mode',
      'Movie Mode',
      'scening',
      {
        value: 'scening',
        room: 'Living Room',
        deviceId: 'device-living-room-scene',
      },
      { room: 'Living Room' }
    ),
    createPreviewEntity(
      'camera',
      'camera.front_door',
      'Front Door',
      'idle',
      {
        value: 'idle',
        entityPicture: '/assets/reference/media/camera-sample.webp',
        entityPictureSources: [
          { srcSet: '/assets/reference/media/camera-sample.avif', type: 'image/avif' },
          { srcSet: '/assets/reference/media/camera-sample.webp', type: 'image/webp' },
        ],
        supportedFeatures: 0,
        isStreamCapable: false,
        room: 'Outside',
        deviceId: 'device-outside-camera',
      },
      { room: 'Outside' }
    ),
    createPreviewEntity(
      'person',
      'person.alice',
      'Alice',
      'home',
      {
        value: 'home',
        location: 'Home',
        latitude: 55.8708,
        longitude: 12.8302,
        gps_accuracy: 24,
        entity_picture: '/assets/reference/portraits/alice.png',
        room: 'Home',
        deviceId: 'device-person-alice',
      },
      { room: 'Home' }
    ),
    createPreviewEntity(
      'unknown',
      'device_tracker.phone_charlie',
      'Charlie',
      'not_home',
      {
        value: 'not_home',
        latitude: 55.874,
        longitude: 12.835,
        gps_accuracy: 12,
        room: 'Home',
        deviceId: 'device-tracker-charlie',
      },
      { room: 'Home' }
    ),
    createPreviewEntity(
      'sensor',
      'sensor.front_door_sensor_battery',
      'Front Door Sensor',
      '18',
      {
        value: '18',
        deviceClass: 'battery',
        unit: '%',
        unit_of_measurement: '%',
        room: 'Entrance',
        deviceId: 'device-entrance-sensor',
      },
      { room: 'Entrance' }
    ),
    createPreviewEntity(
      'sensor',
      'sensor.kitchen_remote_battery',
      'Kitchen Remote',
      '42',
      {
        value: '42',
        deviceClass: 'battery',
        unit: '%',
        unit_of_measurement: '%',
        room: 'Kitchen',
        deviceId: 'device-kitchen-remote',
      },
      { room: 'Kitchen' }
    ),
    createPreviewEntity(
      'binary_sensor',
      'binary_sensor.entry_motion',
      'Entry Motion',
      'on',
      {
        value: 'on',
        icon: 'activity',
        unit: '',
        entityType: 'Sensor',
        deviceClass: 'motion',
        status: 'active',
        room: 'Entrance',
        deviceId: 'device-entry-motion',
        securityKind: 'motion',
        securitySeverity: 'active',
      },
      { room: 'Entrance' }
    ),
    createPreviewEntity(
      'sensor',
      'sensor.living_room_temp',
      'Living Room Temperature',
      '22.4',
      {
        value: '22.4',
        deviceClass: 'temperature',
        unit: 'C',
        unit_of_measurement: 'C',
        icon: 'thermometer',
        room: 'Living Room',
        deviceId: 'device-living-room-air',
      },
      { room: 'Living Room' }
    ),
    createPreviewEntity(
      'grouped_sensor',
      'grouped_sensors.living_room_air',
      'Living Room Air',
      '22.4',
      {
        value: '22.4',
        sensors: [
          {
            id: 'sensor.living_room_temp',
            label: 'Temp',
            value: '22.4',
            unit: 'C',
            icon: 'thermometer',
          },
          {
            id: 'sensor.living_room_humidity',
            label: 'Humidity',
            value: '47',
            unit: '%',
            icon: 'droplets',
          },
          { id: 'sensor.living_room_co2', label: 'CO2', value: '510', unit: 'ppm', icon: 'gauge' },
        ],
        accentColor: 'teal',
        room: 'Living Room',
        deviceId: 'device-living-room-air',
      },
      { room: 'Living Room' }
    ),
    createPreviewEntity(
      'vacuum',
      'vacuum.downstairs',
      'Downstairs Vacuum',
      'docked',
      {
        value: 'docked',
        status: 'docked',
        battery: 92,
        cleanedArea: '48 m2',
        cleaningTime: '42 min',
        nextCleaning: 'Tomorrow',
        room: 'Home',
        deviceId: 'device-vacuum-downstairs',
      },
      { room: 'Home' }
    ),
    createPreviewEntity(
      'calendar',
      'calendar.home',
      'Family Calendar',
      'on',
      {
        value: 'on',
        events: [
          {
            id: 'demo-calendar-1',
            title: 'School pickup',
            startTime: '15:00',
            endTime: '15:30',
            timeDisplay: '15:00',
            startDateTime: '2026-05-16T15:00:00.000Z',
            endDateTime: '2026-05-16T15:30:00.000Z',
            type: 'event',
            color: 'bg-blue-500',
            location: 'North entrance',
            sortKey: '2026-05-16T15:00:00.000Z',
          },
        ],
        room: 'Home',
        deviceId: 'device-calendar-home',
      },
      { room: 'Home' }
    ),
    createPreviewEntity(
      'sensor',
      'alarm_control_panel.home',
      'Home Alarm',
      'armed_home',
      {
        value: 'armed_home',
        alarmState: 'armed_home',
        alarmSupportedActions: ['arm_home', 'arm_away', 'arm_night', 'disarm'],
        alarmCodeFormat: 'number',
        alarmRequiresCode: true,
        availability: 'available',
        room: 'Home',
        deviceId: 'device-home-alarm',
      },
      { room: 'Home' }
    ),
    createPreviewEntity(
      'sensor',
      'sensor.nutdev1_battery_charge',
      'Battery charge',
      '97',
      {
        value: '97',
        deviceClass: 'battery',
        unit: '%',
        unit_of_measurement: '%',
        room: 'Server Room',
        deviceId: 'device-ups',
      },
      { room: 'Server Room' }
    ),
    createPreviewEntity(
      'sensor',
      'sensor.nutdev1_load',
      'Load',
      '14',
      {
        value: '14',
        unit: '%',
        unit_of_measurement: '%',
        room: 'Server Room',
        deviceId: 'device-ups',
      },
      { room: 'Server Room' }
    ),
    createPreviewEntity(
      'sensor',
      'sensor.nutdev1_status',
      'Status',
      'Online',
      {
        value: 'Online',
        room: 'Server Room',
        deviceId: 'device-ups',
      },
      { room: 'Server Room' }
    ),
    createPreviewEntity(
      'sensor',
      'sensor.nutdev1_status_data',
      'Status data',
      'OL',
      {
        value: 'OL',
        room: 'Server Room',
        deviceId: 'device-ups',
      },
      { room: 'Server Room' }
    ),
    createPreviewEntity(
      'sensor',
      'sensor.nutdev1_input_voltage',
      'Input voltage',
      '232',
      {
        value: '232',
        unit: 'V',
        unit_of_measurement: 'V',
        room: 'Server Room',
        deviceId: 'device-ups',
      },
      { room: 'Server Room' }
    ),
    createPreviewEntity(
      'sensor',
      'sensor.nutdev1_output_voltage',
      'Output voltage',
      '230',
      {
        value: '230',
        unit: 'V',
        unit_of_measurement: 'V',
        room: 'Server Room',
        deviceId: 'device-ups',
      },
      { room: 'Server Room' }
    ),
    createPreviewEntity(
      'sensor',
      'sensor.nutdev1_battery_runtime',
      'Battery runtime',
      '1320',
      {
        value: '1320',
        unit: 's',
        unit_of_measurement: 's',
        room: 'Server Room',
        deviceId: 'device-ups',
      },
      { room: 'Server Room' }
    ),
  ];

  const rooms = [
    createPreviewRoom('Living Room', [
      'light.living_room',
      'sensor.living_room_temp',
      'grouped_sensors.living_room_air',
      'cover.living_room_blind',
      'scene.movie_mode',
    ]),
    createPreviewRoom('Kitchen', ['light.kitchen', 'sensor.kitchen_remote_battery']),
    createPreviewRoom('Bedroom', ['fan.bedroom_ceiling', 'humidifier.bedroom']),
    createPreviewRoom('Hallway', ['climate.main_floor', 'input_boolean.guest_mode']),
    createPreviewRoom('Outside', ['camera.front_door', 'weather.home']),
    createPreviewRoom('Home', [
      'person.alice',
      'vacuum.downstairs',
      'calendar.home',
      'alarm_control_panel.home',
    ]),
    createPreviewRoom('Server Room', [
      'sensor.nutdev1_battery_charge',
      'sensor.nutdev1_load',
      'sensor.nutdev1_status',
      'sensor.nutdev1_status_data',
      'sensor.nutdev1_input_voltage',
      'sensor.nutdev1_output_voltage',
      'sensor.nutdev1_battery_runtime',
    ]),
  ];

  const homeAssistant = createHomeAssistantCompatibilityState(
    entities,
    [
      { area_id: 'living-room', name: 'Living Room' },
      { area_id: 'kitchen', name: 'Kitchen' },
      { area_id: 'hallway', name: 'Hallway' },
      { area_id: 'outside', name: 'Outside' },
      { area_id: 'server-room', name: 'Server Room' },
    ],
    [
      { id: 'device-ups', area_id: 'server-room', name: 'Rack UPS' },
      { id: 'device-kitchen-light', area_id: 'kitchen', name: 'Kitchen Light' },
      { id: 'device-living-room-light', area_id: 'living-room', name: 'Living Room Light' },
      { id: 'device-hallway', area_id: 'hallway', name: 'Hallway Controls' },
    ],
    entities.map((entity) => ({
      entity_id: entity.externalId,
      device_id: typeof entity.attributes.deviceId === 'string' ? entity.attributes.deviceId : null,
      area_id: null,
    }))
  );

  return {
    id: 'default',
    entities,
    rooms,
    homeAssistant,
    taskRuntime: createTaskRuntimeSnapshot(),
  };
}

const DEFAULT_PREVIEW_SCENARIO = createPreviewScenario();

function clonePreviewScenario(scenario: PreviewRuntimeScenario): PreviewRuntimeScenario {
  return {
    ...scenario,
    entities: scenario.entities.map((entity) => ({
      ...entity,
      attributes: { ...entity.attributes },
      resources: entity.resources ? { ...entity.resources } : undefined,
    })),
    rooms: scenario.rooms.map((room) => ({ ...room, memberIds: [...room.memberIds] })),
    homeAssistant: {
      ...scenario.homeAssistant,
      entities: scenario.homeAssistant.entities
        ? Object.fromEntries(
            Object.entries(scenario.homeAssistant.entities).map(([entityId, entity]) => [
              entityId,
              { ...entity, attributes: { ...entity.attributes } },
            ])
          )
        : null,
      areas: scenario.homeAssistant.areas.map((area) => ({ ...area })),
      deviceRegistry: scenario.homeAssistant.deviceRegistry.map((device) => ({ ...device })),
      entityRegistry: scenario.homeAssistant.entityRegistry.map((entity) => ({ ...entity })),
    },
    taskRuntime: {
      entities: scenario.taskRuntime.entities
        ? Object.fromEntries(
            Object.entries(scenario.taskRuntime.entities).map(([entityId, entity]) => [
              entityId,
              { ...entity, attributes: { ...entity.attributes } },
            ])
          )
        : null,
      rooms: scenario.taskRuntime.rooms.map((room) => ({ ...room })),
      devices: scenario.taskRuntime.devices.map((device) => ({ ...device })),
      entityReferences: scenario.taskRuntime.entityReferences.map((reference) => ({
        ...reference,
      })),
    },
  };
}

export function getPreviewRuntimeScenario(name: 'default' | 'demo' = 'default') {
  if (name === 'demo') {
    return clonePreviewScenario(DEFAULT_PREVIEW_SCENARIO);
  }

  return clonePreviewScenario(DEFAULT_PREVIEW_SCENARIO);
}

function getActiveScenario() {
  return previewRuntimeStore.getState().scenario;
}

export function getPreviewHomeAssistantCompatibilityState(): PreviewHomeAssistantCompatibilityState | null {
  return getActiveScenario()?.homeAssistant ?? null;
}

export function subscribePreviewHomeAssistantCompatibilityState(listener: () => void) {
  return previewRuntimeStore.subscribe((state, previousState) => {
    if (state.scenario?.homeAssistant !== previousState.scenario?.homeAssistant) {
      listener();
    }
  });
}

function getPreviewProviderState(): NavetProviderState {
  const scenario = getActiveScenario() ?? DEFAULT_PREVIEW_SCENARIO;

  return {
    providerId: PREVIEW_PROVIDER_ID,
    connected: true,
    entities: scenario.entities,
    rooms: scenario.rooms,
  };
}

function updateScenario(mutator: (scenario: PreviewRuntimeScenario) => PreviewRuntimeScenario) {
  const currentScenario = getActiveScenario();
  if (!currentScenario) {
    return;
  }

  const nextScenario = mutator(currentScenario);
  previewRuntimeStore.setState({ scenario: nextScenario });

  integrationStore.getState().applyPreviewProviderState(PREVIEW_PROVIDER_ID, {
    homeAssistantState: nextScenario.homeAssistant,
    currentProviderId: PREVIEW_PROVIDER_ID,
    selectedProviderIds: [PREVIEW_PROVIDER_ID],
  });
}

function updatePreviewEntity(entityId: string, updater: (entity: NavetEntity) => NavetEntity) {
  updateScenario((scenario) => {
    const nextEntities = scenario.entities.map((entity) =>
      entity.externalId === entityId ? updater(entity) : entity
    );
    const nextHomeAssistant = createHomeAssistantCompatibilityState(
      nextEntities,
      scenario.homeAssistant.areas as Array<{ area_id: string; name: string }>,
      scenario.homeAssistant.deviceRegistry as Array<{
        id: string;
        area_id: string | null;
        name?: string | null;
      }>,
      scenario.homeAssistant.entityRegistry as Array<{
        entity_id: string;
        device_id: string | null;
        area_id?: string | null;
      }>
    );

    return {
      ...scenario,
      entities: nextEntities,
      homeAssistant: nextHomeAssistant,
    };
  });
}

function updateTaskRuntime(
  mutator: (taskRuntime: PlatformTaskRuntimeSnapshot) => PlatformTaskRuntimeSnapshot
) {
  updateScenario((scenario) => ({
    ...scenario,
    taskRuntime: mutator(scenario.taskRuntime),
  }));
}

function buildEntitySnapshotMap(entities: NavetEntity[]): PlatformEntitySnapshotMap {
  return Object.fromEntries(
    entities.map((entity) => [
      entity.externalId,
      {
        entityId: entity.externalId,
        state:
          entity.primaryState === null || entity.primaryState === undefined
            ? 'unknown'
            : typeof entity.primaryState === 'string'
              ? entity.primaryState
              : String(entity.primaryState),
        attributes: entity.attributes,
        lastChanged: PREVIEW_TIMESTAMP,
        lastUpdated: entity.lastUpdated ?? PREVIEW_TIMESTAMP,
      },
    ])
  );
}

let cachedPreviewEntitySnapshotSource: NavetEntity[] | null = null;
let cachedPreviewEntitySnapshots: PlatformEntitySnapshotMap | null = null;
let cachedPreviewEntityRegistrySource:
  | PreviewRuntimeScenario['homeAssistant']['entityRegistry']
  | null = null;
let cachedPreviewEntityRegistryEntries: PlatformEntityRegistryEntry[] = [];
let cachedPreviewEntityRegistryById: Record<string, PlatformEntityRegistryEntry | undefined> = {};

function resetPreviewEntityRuntimeCaches() {
  cachedPreviewEntitySnapshotSource = null;
  cachedPreviewEntitySnapshots = null;
  cachedPreviewEntityRegistrySource = null;
  cachedPreviewEntityRegistryEntries = [];
  cachedPreviewEntityRegistryById = {};
}

function getPreviewEntitySnapshotMap(entities: NavetEntity[]): PlatformEntitySnapshotMap {
  if (cachedPreviewEntitySnapshotSource === entities && cachedPreviewEntitySnapshots) {
    return cachedPreviewEntitySnapshots;
  }

  cachedPreviewEntitySnapshotSource = entities;
  cachedPreviewEntitySnapshots = buildEntitySnapshotMap(entities);
  return cachedPreviewEntitySnapshots;
}

function getPreviewEntityRegistryEntries(
  entityRegistry: PreviewRuntimeScenario['homeAssistant']['entityRegistry'] | undefined
): PlatformEntityRegistryEntry[] {
  const nextSource = entityRegistry ?? [];
  if (cachedPreviewEntityRegistrySource === nextSource) {
    return cachedPreviewEntityRegistryEntries;
  }

  cachedPreviewEntityRegistrySource = nextSource;
  cachedPreviewEntityRegistryEntries = nextSource.map(
    (entry): PlatformEntityRegistryEntry => ({
      entityId: entry.entity_id,
      deviceId: entry.device_id,
      areaId: entry.area_id ?? null,
      name: null,
      platform: 'preview',
    })
  );
  cachedPreviewEntityRegistryById = Object.fromEntries(
    cachedPreviewEntityRegistryEntries.map((entry) => [entry.entityId, entry])
  );
  return cachedPreviewEntityRegistryEntries;
}

function createPreviewEntityRuntimeService() {
  return {
    getEntitySnapshots: () => getPreviewEntitySnapshotMap(getPreviewProviderState().entities),
    subscribeEntitySnapshots: (listener: () => void) =>
      previewRuntimeStore.subscribe((state, previousState) => {
        if (state.scenario?.entities !== previousState.scenario?.entities) {
          listener();
        }
      }),
    getEntitySnapshot: (entityId: string) =>
      getPreviewEntitySnapshotMap(getPreviewProviderState().entities)[entityId],
    subscribeEntitySnapshot: (_entityId: string, listener: () => void) =>
      previewRuntimeStore.subscribe((state, previousState) => {
        if (state.scenario?.entities !== previousState.scenario?.entities) {
          listener();
        }
      }),
    getEntityRegistryEntries: () =>
      getPreviewEntityRegistryEntries(getActiveScenario()?.homeAssistant.entityRegistry),
    subscribeEntityRegistryEntries: (listener: () => void) =>
      previewRuntimeStore.subscribe((state, previousState) => {
        if (
          state.scenario?.homeAssistant.entityRegistry !==
          previousState.scenario?.homeAssistant.entityRegistry
        ) {
          listener();
        }
      }),
    getEntityRegistryEntry: (entityId: string) => {
      getPreviewEntityRegistryEntries(getActiveScenario()?.homeAssistant.entityRegistry);
      return cachedPreviewEntityRegistryById[entityId];
    },
    subscribeEntityRegistryEntry: (entityId: string, listener: () => void) =>
      previewRuntimeStore.subscribe((state, previousState) => {
        if (
          state.scenario?.homeAssistant.entityRegistry !==
          previousState.scenario?.homeAssistant.entityRegistry
        ) {
          const previousRegistryEntries = getPreviewEntityRegistryEntries(
            previousState.scenario?.homeAssistant.entityRegistry
          );
          const previousEntry = previousRegistryEntries.find(
            (entry) => entry.entityId === entityId
          );
          const nextRegistryEntries = getPreviewEntityRegistryEntries(
            state.scenario?.homeAssistant.entityRegistry
          );
          const nextEntry = nextRegistryEntries.find((entry) => entry.entityId === entityId);
          if (nextEntry !== previousEntry) {
            listener();
          }
        }
      }),
    getConfig: () => getActiveScenario()?.homeAssistant.config ?? PREVIEW_HOME_ASSISTANT_CONFIG,
    subscribeConfig: (listener: () => void) =>
      previewRuntimeStore.subscribe((state, previousState) => {
        if (state.scenario?.homeAssistant.config !== previousState.scenario?.homeAssistant.config) {
          listener();
        }
      }),
  };
}

function applyCommandToEntity(entity: NavetEntity, command: NavetCommand): NavetEntity {
  switch (command.type) {
    case 'turn_on':
      return {
        ...entity,
        primaryState: entity.type === 'switch' || entity.type === 'helper' ? true : 'on',
        attributes: {
          ...entity.attributes,
          value: entity.type === 'switch' || entity.type === 'helper' ? true : 'on',
        },
      };
    case 'turn_off':
      return {
        ...entity,
        primaryState: entity.type === 'switch' || entity.type === 'helper' ? false : 'off',
        attributes: {
          ...entity.attributes,
          value: entity.type === 'switch' || entity.type === 'helper' ? false : 'off',
        },
      };
    case 'set_brightness':
      return {
        ...entity,
        primaryState: 'on',
        attributes: { ...entity.attributes, value: 'on', brightnessPct: command.brightness },
      };
    case 'set_color_temperature':
      return {
        ...entity,
        primaryState: 'on',
        attributes: { ...entity.attributes, value: 'on', colorTemperatureKelvin: command.kelvin },
      };
    case 'lock':
      return {
        ...entity,
        primaryState: 'locked',
        attributes: { ...entity.attributes, value: 'locked', locked: true },
      };
    case 'unlock':
      return {
        ...entity,
        primaryState: 'unlocked',
        attributes: { ...entity.attributes, value: 'unlocked', locked: false },
      };
    case 'open':
      return {
        ...entity,
        primaryState: 'open',
        attributes: { ...entity.attributes, value: 'open', position: 100 },
      };
    case 'close':
      return {
        ...entity,
        primaryState: 'closed',
        attributes: { ...entity.attributes, value: 'closed', position: 0 },
      };
    case 'stop':
      return entity;
    default:
      return entity;
  }
}

async function executePreviewCommand(entity: NavetEntity, command: NavetCommand) {
  updatePreviewEntity(entity.externalId, (currentEntity) =>
    applyCommandToEntity(currentEntity, command)
  );
}

const previewLightFeatureService: ProviderLightFeatureService = {
  updateLight: async (entityId, options) => {
    updatePreviewEntity(entityId, (entity) => ({
      ...entity,
      primaryState: options.state ?? entity.primaryState,
      attributes: {
        ...entity.attributes,
        value: options.state ?? entity.attributes.value,
        brightnessPct:
          typeof options.brightnessPct === 'number'
            ? options.brightnessPct
            : entity.attributes.brightnessPct,
        colorTemperatureKelvin:
          typeof options.kelvin === 'number'
            ? options.kelvin
            : entity.attributes.colorTemperatureKelvin,
        effect: typeof options.effect === 'string' ? options.effect : entity.attributes.effect,
      },
    }));
  },
};

const previewSecurityFeatureService: ProviderSecurityFeatureService = {
  lockEntity: async (entityId) =>
    updatePreviewEntity(entityId, (entity) =>
      applyCommandToEntity(entity, { type: 'lock', entityId: entity.id })
    ),
  unlockEntity: async (entityId) =>
    updatePreviewEntity(entityId, (entity) =>
      applyCommandToEntity(entity, { type: 'unlock', entityId: entity.id })
    ),
  armHome: async (entityId, code) =>
    updatePreviewEntity(entityId, (entity) => ({
      ...entity,
      primaryState: 'armed_home',
      attributes: { ...entity.attributes, value: 'armed_home', code },
    })),
  armAway: async (entityId, code) =>
    updatePreviewEntity(entityId, (entity) => ({
      ...entity,
      primaryState: 'armed_away',
      attributes: { ...entity.attributes, value: 'armed_away', code },
    })),
  armNight: async (entityId, code) =>
    updatePreviewEntity(entityId, (entity) => ({
      ...entity,
      primaryState: 'armed_night',
      attributes: { ...entity.attributes, value: 'armed_night', code },
    })),
  armVacation: async (entityId, code) =>
    updatePreviewEntity(entityId, (entity) => ({
      ...entity,
      primaryState: 'armed_vacation',
      attributes: { ...entity.attributes, value: 'armed_vacation', code },
    })),
  armCustomBypass: async (entityId, code) =>
    updatePreviewEntity(entityId, (entity) => ({
      ...entity,
      primaryState: 'armed_custom_bypass',
      attributes: { ...entity.attributes, value: 'armed_custom_bypass', code },
    })),
  disarm: async (entityId, code) =>
    updatePreviewEntity(entityId, (entity) => ({
      ...entity,
      primaryState: 'disarmed',
      attributes: { ...entity.attributes, value: 'disarmed', code },
    })),
  trigger: async (entityId, code) =>
    updatePreviewEntity(entityId, (entity) => ({
      ...entity,
      primaryState: 'triggered',
      attributes: { ...entity.attributes, value: 'triggered', code },
    })),
  openCover: async (entityId) =>
    updatePreviewEntity(entityId, (entity) => ({
      ...entity,
      primaryState: 'open',
      attributes: { ...entity.attributes, value: 'open', position: 100 },
    })),
  closeCover: async (entityId) =>
    updatePreviewEntity(entityId, (entity) => ({
      ...entity,
      primaryState: 'closed',
      attributes: { ...entity.attributes, value: 'closed', position: 0 },
    })),
  stopCover: async (_entityId) => undefined,
  setCoverPosition: async (entityId, position) =>
    updatePreviewEntity(entityId, (entity) => ({
      ...entity,
      primaryState: position >= 100 ? 'open' : position <= 0 ? 'closed' : 'open',
      attributes: {
        ...entity.attributes,
        value: position >= 100 ? 'open' : position <= 0 ? 'closed' : 'open',
        position,
      },
    })),
};

const previewTaskFeatureService: ProviderTaskFeatureService = {
  getTaskRuntimeSnapshot: () => getActiveScenario()?.taskRuntime ?? createTaskRuntimeSnapshot(),
  subscribeTaskRuntimeSnapshot: (listener) =>
    previewRuntimeStore.subscribe((state, previousState) => {
      if (state.scenario?.taskRuntime !== previousState.scenario?.taskRuntime) {
        listener();
      }
    }),
  getAutomationDetails: async (entityId) => {
    const automation = getActiveScenario()?.taskRuntime.entities?.[entityId];
    return {
      config: automation?.attributes ?? {},
    } satisfies PlatformAutomationDetails;
  },
  triggerAutomation: async (entityId) => {
    updateTaskRuntime((taskRuntime) => ({
      ...taskRuntime,
      entities: taskRuntime.entities
        ? {
            ...taskRuntime.entities,
            [entityId]: {
              ...(taskRuntime.entities[entityId] ?? {
                entityId,
                state: 'on',
                attributes: {},
              }),
              attributes: {
                ...(taskRuntime.entities[entityId]?.attributes ?? {}),
                last_triggered: new Date().toISOString(),
              },
            },
          }
        : taskRuntime.entities,
    }));
  },
};

const previewContract: NavetProviderContract = {
  providerId: PREVIEW_PROVIDER_ID,
  bootstrapSession: () => ({
    providerId: PREVIEW_PROVIDER_ID,
    connected: true,
    runtime: 'preview',
    authMode: 'preview',
  }),
  initializeSession: async () => undefined,
  attachRuntimeBridge: () => undefined,
  teardownSession: () => undefined,
  getState: () => getPreviewProviderState(),
  subscribeState: (listener) =>
    previewRuntimeStore.subscribe((state, previousState) => {
      if (
        state.scenario?.entities !== previousState.scenario?.entities ||
        state.scenario?.rooms !== previousState.scenario?.rooms
      ) {
        listener();
      }
    }),
};

const previewProviderPackageRegistration: ProviderPackageRegistration = {
  contract: previewContract,
  providerContractAdapter: createSnapshotBackedProviderAdapter({
    providerId: PREVIEW_PROVIDER_ID,
    providerLabel: 'Preview',
    contract: previewContract,
    executeCommand: executePreviewCommand,
    getSession: () => ({
      providerId: PREVIEW_PROVIDER_ID,
      runtime: 'preview',
      authMode: 'preview',
    }),
  }),
  runtimeRegistration: {
    contract: previewContract,
    providerContractAdapter: createSnapshotBackedProviderAdapter({
      providerId: PREVIEW_PROVIDER_ID,
      providerLabel: 'Preview',
      contract: previewContract,
      executeCommand: executePreviewCommand,
      getSession: () => ({
        providerId: PREVIEW_PROVIDER_ID,
        runtime: 'preview',
        authMode: 'preview',
      }),
    }),
    implementationStatus: 'implemented',
    capabilities: {
      pathSigning: false,
      cameraStreams: false,
    },
    featureMatrix: {
      rooms: true,
      lighting: true,
      sensors: true,
      climate: true,
      mediaControls: true,
      mediaBrowse: false,
      mediaArtwork: false,
      cameraSnapshot: true,
      cameraStreams: false,
      energyNow: false,
      calendar: true,
      weather: true,
      notifications: false,
      tasks: true,
    },
    lightFeatureService: previewLightFeatureService,
    securityFeatureService: previewSecurityFeatureService,
    taskFeatureService: previewTaskFeatureService,
    entityRuntimeService: createPreviewEntityRuntimeService(),
  },
};

function applyPreviewRuntimeScenario(scenario: PreviewRuntimeScenario) {
  resetPreviewEntityRuntimeCaches();
  previewRuntimeStore.setState({ scenario });
  setProviderPackageRegistrationOverride(PREVIEW_PROVIDER_ID, previewProviderPackageRegistration);
  resetProviderRuntimeRegistrationCache();
  integrationStore.getState().applyPreviewProviderState(PREVIEW_PROVIDER_ID, {
    homeAssistantState: scenario.homeAssistant,
    currentProviderId: PREVIEW_PROVIDER_ID,
    selectedProviderIds: [PREVIEW_PROVIDER_ID],
  });
}

export function installPreviewRuntime(scenario: PreviewRuntimeScenario) {
  applyPreviewRuntimeScenario(clonePreviewScenario(scenario));
}

export function resetPreviewRuntime() {
  resetPreviewEntityRuntimeCaches();
  previewRuntimeStore.setState({ scenario: null });
  setProviderPackageRegistrationOverride(PREVIEW_PROVIDER_ID, null);
  resetProviderRuntimeRegistrationCache();
}

export function createPreviewStoryScenario(
  configure?: (scenario: PreviewRuntimeScenario) => PreviewRuntimeScenario
) {
  const scenario = getPreviewRuntimeScenario('default');
  return configure ? configure(scenario) : scenario;
}

export function replacePreviewEntity(
  scenario: PreviewRuntimeScenario,
  nextEntity: NavetEntity
): PreviewRuntimeScenario {
  const nextEntities = scenario.entities.map((entity) =>
    entity.externalId === nextEntity.externalId ? nextEntity : entity
  );

  return {
    ...scenario,
    entities: nextEntities,
    homeAssistant: createHomeAssistantCompatibilityState(
      nextEntities,
      scenario.homeAssistant.areas as Array<{ area_id: string; name: string }>,
      scenario.homeAssistant.deviceRegistry as Array<{
        id: string;
        area_id: string | null;
        name?: string | null;
      }>,
      scenario.homeAssistant.entityRegistry as Array<{
        entity_id: string;
        device_id: string | null;
        area_id?: string | null;
      }>
    ),
  };
}

export function createPreviewLightEntity(
  externalId: string,
  overrides: Partial<NavetEntity['attributes']> = {}
) {
  return createPreviewEntity(
    'light',
    externalId,
    'Living Room',
    'on',
    {
      value: 'on',
      brightnessPct: 64,
      colorTemperatureKelvin: 3900,
      supportedColorModes: ['brightness', 'color_temp'],
      colorMode: 'color_temp',
      effect: 'None',
      effectList: ['None', 'Rainbow', 'Fire', 'Twinkle'],
      room: 'Living Room',
      deviceId: 'device-living-room-light',
      ...overrides,
    },
    { room: 'Living Room' }
  );
}

export function getPreviewDeviceCollection(
  scenario: PreviewRuntimeScenario = getPreviewRuntimeScenario('default')
) {
  return mapNavetEntitiesToDeviceCollection(scenario.entities);
}

export function readPreviewCommandResult(): CommandResult {
  return {
    accepted: true,
    requiresEventConfirmation: true,
  };
}
