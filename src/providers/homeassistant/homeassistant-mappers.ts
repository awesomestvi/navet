import { createProviderScopedId } from '@navet/core/ids';
import type { NavetEntity, NavetProviderRoom } from '@navet/core/types';
import type { HassEntities, HassEntity } from 'home-assistant-js-websocket';
import { getMediaPlayerCapabilities } from '@/app/constants/media-player-features';
import { normalizeVacuumStatus } from '@/app/features/vacuum';
import { getName, resolveEntityRoom } from '@/app/hooks/entity-utils';
import {
  createRegistryMaps,
  getEntityCategory,
} from '@/app/infrastructure/home-assistant/home-assistant-registry-helpers';
import type {
  HomeAssistantAreaRegistryEntry,
  HomeAssistantDeviceRegistryEntry,
  HomeAssistantEntityRegistryEntry,
} from '@/app/services/home-assistant.service';
import { UNKNOWN_ROOM_LABEL } from '@/app/utils/device-location';
import { normalizeTemperatureUnit } from '@/app/utils/temperature';

export interface HomeAssistantNavetMappingInput {
  entities: HassEntities | null;
  areas: HomeAssistantAreaRegistryEntry[];
  deviceRegistry: HomeAssistantDeviceRegistryEntry[];
  entityRegistry: HomeAssistantEntityRegistryEntry[];
}

function normalizeRoomName(name: string) {
  return name.trim().toLocaleLowerCase();
}

function buildProviderRoomMap(entities: NavetEntity[]): NavetProviderRoom[] {
  const roomMap = new Map<string, NavetProviderRoom>();

  for (const entity of entities) {
    const roomName = entity.room ?? UNKNOWN_ROOM_LABEL;
    const normalizedName = normalizeRoomName(roomName);
    const canonicalId = createProviderScopedId('home_assistant', normalizedName);
    const existing = roomMap.get(canonicalId);

    if (existing) {
      if (!existing.memberIds.includes(entity.canonicalId)) {
        existing.memberIds.push(entity.canonicalId);
      }
      continue;
    }

    roomMap.set(canonicalId, {
      id: canonicalId,
      canonicalId,
      providerId: 'home_assistant',
      externalId: normalizedName,
      name: roomName,
      normalizedName,
      memberIds: [entity.canonicalId],
    });
  }

  return Array.from(roomMap.values()).sort((left, right) => left.name.localeCompare(right.name));
}

function getDomain(entityId: string): string {
  const separatorIndex = entityId.indexOf('.');
  return separatorIndex === -1 ? entityId : entityId.slice(0, separatorIndex);
}

function inferVehicleLockPresentation(entityId: string, entity: HassEntity): boolean {
  const searchText = `${entityId} ${
    typeof entity.attributes?.friendly_name === 'string' ? entity.attributes.friendly_name : ''
  } ${
    typeof entity.attributes?.device_class === 'string' ? entity.attributes.device_class : ''
  }`.toLowerCase();

  return [
    'car',
    'vehicle',
    'tesla',
    'volvo',
    'bmw',
    'audi',
    'mercedes',
    'trunk',
    'boot',
    'frunk',
  ].some((token) => searchText.includes(token));
}

function createNavetEntity(
  nativeId: string,
  type: NavetEntity['type'],
  name: string,
  room: string,
  capabilities: NavetEntity['capabilities'],
  state: Record<string, unknown>,
  resources?: NavetEntity['resources']
): NavetEntity {
  const canonicalId = createProviderScopedId('home_assistant', nativeId);

  return {
    id: canonicalId,
    canonicalId,
    providerId: 'home_assistant',
    externalId: nativeId,
    type,
    name,
    room,
    primaryState:
      typeof state.value === 'string' ||
      typeof state.value === 'number' ||
      typeof state.value === 'boolean'
        ? state.value
        : null,
    availability:
      state.value === 'unavailable'
        ? 'unavailable'
        : state.value === 'unknown'
          ? 'unknown'
          : 'available',
    attributes: state,
    capabilities,
    resources,
    lastUpdated:
      typeof state.lastUpdated === 'string'
        ? state.lastUpdated
        : typeof state.last_updated === 'string'
          ? state.last_updated
          : undefined,
  };
}

function readNumberish(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function readStringList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const entries = value.filter((entry): entry is string => typeof entry === 'string');
  return entries.length > 0 ? entries : undefined;
}

function readPercent(value: unknown): number | undefined {
  const numericValue = readNumberish(value);
  if (typeof numericValue !== 'number') {
    return undefined;
  }

  return Math.max(0, Math.min(100, Math.round(numericValue)));
}

function resolveBinarySensorPresentation(
  state: string,
  deviceClass: string | undefined
): { value: string; status: 'active' | 'clear' | 'unavailable' } {
  const normalized = state.toLowerCase();

  if (normalized === 'unknown' || normalized === 'unavailable') {
    return { value: state, status: 'unavailable' };
  }

  const isActive = ['on', 'detected', 'open', 'wet', 'problem', 'unsafe'].includes(normalized);

  switch (deviceClass) {
    case 'door':
    case 'garage_door':
    case 'opening':
    case 'window':
      return { value: isActive ? 'Open' : 'Closed', status: isActive ? 'active' : 'clear' };
    case 'gas':
    case 'moisture':
    case 'motion':
    case 'occupancy':
    case 'presence':
    case 'smoke':
      return { value: isActive ? 'Detected' : 'Clear', status: isActive ? 'active' : 'clear' };
    default:
      return {
        value: isActive ? 'On' : normalized === 'off' ? 'Off' : state,
        status: isActive ? 'active' : 'clear',
      };
  }
}

function inferHomeAssistantCapabilities(
  entityId: string,
  entity: HassEntity
): NavetEntity['capabilities'] {
  const domain = getDomain(entityId);

  if (domain === 'light') {
    const capabilities: NavetEntity['capabilities'] = ['toggle'];
    if (typeof entity.attributes?.brightness === 'number') {
      capabilities.push('brightness');
    }
    if (
      typeof entity.attributes?.color_temp_kelvin === 'number' ||
      typeof entity.attributes?.min_color_temp_kelvin === 'number' ||
      typeof entity.attributes?.max_color_temp_kelvin === 'number'
    ) {
      capabilities.push('color_temperature');
    }
    return capabilities;
  }

  if (domain === 'fan') {
    const capabilities: NavetEntity['capabilities'] = ['toggle'];
    if (typeof entity.attributes?.percentage === 'number') {
      capabilities.push('fan_speed');
    }
    return capabilities;
  }

  if (domain === 'switch' || domain === 'input_boolean') {
    return ['toggle'];
  }

  if (domain === 'climate' || domain === 'water_heater') {
    return ['temperature_setpoint'];
  }

  if (domain === 'media_player') {
    return ['media_playback'];
  }

  if (domain === 'cover') {
    return ['position'];
  }

  if (domain === 'lock') {
    return ['lock'];
  }

  if (domain === 'sensor' || domain === 'binary_sensor') {
    return ['numeric_sensor'];
  }

  return [];
}

function createHomeAssistantState(
  entityId: string,
  entity: HassEntity,
  entityEntry?: HomeAssistantEntityRegistryEntry
): Record<string, unknown> {
  const domain = getDomain(entityId);
  const deviceClass =
    typeof entity.attributes?.device_class === 'string'
      ? entity.attributes.device_class
      : undefined;
  const entityCategory = getEntityCategory(entityEntry);
  const deviceId = entityEntry?.device_id ?? undefined;
  const commonState = {
    deviceId,
    entityCategory: entityCategory ?? undefined,
  };

  if (domain === 'climate' || domain === 'water_heater') {
    const currentTemperature = readNumberish(entity.attributes?.current_temperature);
    const targetTemperature =
      readNumberish(entity.attributes?.temperature) ??
      readNumberish(entity.attributes?.target_temp_low) ??
      readNumberish(entity.attributes?.target_temp_high) ??
      currentTemperature;

    return {
      ...commonState,
      value: entity.state,
      temperature: targetTemperature ?? 0,
      currentTemperature: currentTemperature ?? targetTemperature ?? 0,
      temperatureUnit:
        normalizeTemperatureUnit(
          entity.attributes?.temperature_unit ?? entity.attributes?.unit_of_measurement
        ) ?? undefined,
      mode:
        (typeof entity.state === 'string' && entity.state) ||
        (typeof entity.attributes?.hvac_mode === 'string' && entity.attributes.hvac_mode) ||
        'off',
      action:
        typeof entity.attributes?.hvac_action === 'string'
          ? entity.attributes.hvac_action
          : undefined,
      supportedHvacModes:
        readStringList(entity.attributes?.hvac_modes ?? entity.attributes?.operation_list) ?? [],
      serviceDomain: domain === 'water_heater' ? 'water_heater' : 'climate',
      size: 'medium',
    };
  }

  if (domain === 'media_player') {
    const supportedFeatures = readNumberish(entity.attributes?.supported_features) ?? 0;
    const mediaCapabilities = getMediaPlayerCapabilities(supportedFeatures);
    const normalizedState =
      entity.state === 'playing'
        ? 'playing'
        : entity.state === 'paused'
          ? 'paused'
          : entity.state === 'idle'
            ? 'idle'
            : 'off';
    const entityPicture =
      (typeof entity.attributes?.entity_picture === 'string' && entity.attributes.entity_picture) ||
      (typeof entity.attributes?.entity_picture_local === 'string' &&
        entity.attributes.entity_picture_local) ||
      (typeof entity.attributes?.media_image_url === 'string' &&
        entity.attributes.media_image_url) ||
      undefined;

    return {
      ...commonState,
      value: normalizedState,
      title:
        (typeof entity.attributes?.media_title === 'string' && entity.attributes.media_title) ||
        (typeof entity.attributes?.app_name === 'string' && entity.attributes.app_name) ||
        (typeof entity.attributes?.media_channel === 'string' && entity.attributes.media_channel) ||
        getName(entity),
      artist:
        (typeof entity.attributes?.media_artist === 'string' && entity.attributes.media_artist) ||
        (typeof entity.attributes?.media_album_name === 'string' &&
          entity.attributes.media_album_name) ||
        (typeof entity.attributes?.source === 'string' && entity.attributes.source) ||
        '',
      entityType: 'Media player',
      deviceClass,
      source: typeof entity.attributes?.source === 'string' ? entity.attributes.source : undefined,
      sourceList: readStringList(entity.attributes?.source_list),
      entityPicture,
      volume:
        typeof entity.attributes?.volume_level === 'number'
          ? Math.max(0, Math.min(100, Math.round(entity.attributes.volume_level * 100)))
          : 0,
      isMuted: entity.attributes?.is_volume_muted === true,
      elapsedSeconds: readNumberish(entity.attributes?.media_position),
      durationSeconds: readNumberish(entity.attributes?.media_duration),
      positionUpdatedAt:
        typeof entity.attributes?.media_position_updated_at === 'string'
          ? entity.attributes.media_position_updated_at
          : undefined,
      mediaCapabilities,
      supportsGrouping: mediaCapabilities.canGroup,
      supportsPreviousTrack: mediaCapabilities.canPreviousTrack,
      supportsNextTrack: mediaCapabilities.canNextTrack,
      supportedFeatures,
      groupMembers: readStringList(entity.attributes?.group_members),
      size: 'medium',
    };
  }

  if (domain === 'cover') {
    const position = readNumberish(entity.attributes?.current_position);
    const tiltPosition = readNumberish(entity.attributes?.current_tilt_position);

    return {
      ...commonState,
      value: entity.state,
      position: position ?? tiltPosition,
      positionMode: position != null ? 'position' : tiltPosition != null ? 'tilt' : undefined,
      deviceClass,
      supportedFeatures: readNumberish(entity.attributes?.supported_features),
      hasPosition: position != null || tiltPosition != null,
      size: 'medium',
    };
  }

  if (domain === 'lock') {
    return {
      ...commonState,
      value: entity.state,
      locked: entity.state === 'locked',
      deviceClass,
      presentation: inferVehicleLockPresentation(entityId, entity) ? 'vehicle' : 'standard',
      size: 'small',
    };
  }

  if (domain === 'scene') {
    return {
      ...commonState,
      value: entity.state,
      size: 'small',
    };
  }

  if (domain === 'person') {
    const personState = typeof entity.state === 'string' ? entity.state : 'not_home';
    return {
      ...commonState,
      value: personState === 'home' ? 'home' : 'away',
      location:
        personState === 'home'
          ? 'Home'
          : personState === 'not_home'
            ? 'Away'
            : personState.replace(/_/g, ' '),
      entityPicture:
        (typeof entity.attributes?.entity_picture === 'string' &&
          entity.attributes.entity_picture) ||
        (typeof entity.attributes?.entity_picture_local === 'string' &&
          entity.attributes.entity_picture_local) ||
        undefined,
      batteryLevel:
        readPercent(entity.attributes?.battery_level) ?? readPercent(entity.attributes?.battery),
      address:
        typeof entity.attributes?.address === 'string' ? entity.attributes.address : undefined,
      locationName:
        typeof entity.attributes?.location_name === 'string'
          ? entity.attributes.location_name
          : undefined,
      geocodedLocation:
        typeof entity.attributes?.geocoded_location === 'string'
          ? entity.attributes.geocoded_location
          : undefined,
      zone: typeof entity.attributes?.zone === 'string' ? entity.attributes.zone : undefined,
      size: 'small',
    };
  }

  if (domain === 'camera') {
    const entityPicture =
      typeof entity.attributes?.entity_picture === 'string'
        ? entity.attributes.entity_picture
        : undefined;
    const supportedFeatures = readNumberish(entity.attributes?.supported_features) ?? 0;

    return {
      ...commonState,
      value: entity.state,
      entityPicture,
      supportedFeatures,
      isStreamCapable: (supportedFeatures & 2) === 2,
      isStillImageOnly: (supportedFeatures & 2) !== 2,
      motionDetectionEnabled:
        typeof entity.attributes?.motion_detection_enabled === 'boolean'
          ? entity.attributes.motion_detection_enabled
          : undefined,
      lastChanged: entity.last_changed,
      lastUpdated: entity.last_updated,
      size: 'medium',
    };
  }

  if (domain === 'vacuum') {
    const batteryLevel =
      readNumberish(entity.attributes?.battery_level) ??
      readNumberish(entity.attributes?.battery) ??
      readNumberish(entity.attributes?.battery_percent);

    return {
      ...commonState,
      value: entity.state,
      status: normalizeVacuumStatus(entity.attributes?.status ?? entity.state),
      battery: typeof batteryLevel === 'number' ? Math.max(0, Math.min(100, batteryLevel)) : 0,
      cleanedArea:
        typeof entity.attributes?.cleaned_area === 'number'
          ? `${entity.attributes.cleaned_area} m²`
          : undefined,
      cleaningTime:
        typeof entity.attributes?.cleaning_time === 'number'
          ? `${Math.round(entity.attributes.cleaning_time)} min`
          : undefined,
      nextCleaning:
        typeof entity.attributes?.next_cleaning === 'string'
          ? entity.attributes.next_cleaning
          : undefined,
      waterLevel:
        typeof entity.attributes?.water_level === 'string' ||
        typeof entity.attributes?.water_level === 'number'
          ? entity.attributes.water_level
          : undefined,
      binLevel:
        typeof entity.attributes?.bin_level === 'string' ||
        typeof entity.attributes?.bin_level === 'number'
          ? entity.attributes.bin_level
          : undefined,
      size: 'medium',
    };
  }

  return {
    ...commonState,
    value: entity.state,
    brightness: entity.attributes?.brightness,
    brightnessPct:
      typeof entity.attributes?.brightness === 'number'
        ? Math.round((entity.attributes.brightness / 255) * 100)
        : undefined,
    colorTemperatureKelvin: entity.attributes?.color_temp_kelvin,
    percentage: entity.attributes?.percentage,
    presetMode:
      typeof entity.attributes?.preset_mode === 'string'
        ? entity.attributes.preset_mode
        : undefined,
    presetModes: readStringList(entity.attributes?.preset_modes),
    deviceClass,
    unit: entity.attributes?.unit_of_measurement ?? entity.attributes?.native_unit_of_measurement,
    lastChanged: entity.last_changed,
    lastUpdated: entity.last_updated,
    entityType: domain,
    serviceDomain:
      domain === 'input_boolean' ||
      domain === 'script' ||
      domain === 'button' ||
      domain === 'input_button'
        ? domain
        : undefined,
    serviceAction:
      domain === 'script'
        ? 'turn_on'
        : domain === 'button' || domain === 'input_button'
          ? 'press'
          : undefined,
    size:
      domain === 'light' ||
      domain === 'fan' ||
      domain === 'switch' ||
      domain === 'input_boolean' ||
      domain === 'script' ||
      domain === 'button' ||
      domain === 'input_button' ||
      domain === 'sensor' ||
      domain === 'binary_sensor'
        ? 'small'
        : 'medium',
    ...(domain === 'binary_sensor'
      ? resolveBinarySensorPresentation(entity.state, deviceClass)
      : {}),
  };
}

export function mapHomeAssistantEntitiesToNavetEntities(
  input: HomeAssistantNavetMappingInput
): NavetEntity[] {
  if (!input.entities) {
    return [];
  }

  const { areaMap, deviceRegistryMap, entityRegistryMap } = createRegistryMaps(
    input.areas,
    input.deviceRegistry,
    input.entityRegistry
  );

  const entities: NavetEntity[] = [];

  for (const [entityId, entity] of Object.entries(input.entities)) {
    const domain = getDomain(entityId);
    const entityEntry = entityRegistryMap.get(entityId);

    if (
      ![
        'light',
        'fan',
        'switch',
        'input_boolean',
        'script',
        'button',
        'input_button',
        'sensor',
        'binary_sensor',
        'climate',
        'water_heater',
        'media_player',
        'cover',
        'lock',
        'scene',
        'person',
        'camera',
        'vacuum',
      ].includes(domain)
    ) {
      continue;
    }

    if (getEntityCategory(entityEntry) === 'config') {
      continue;
    }

    const room = resolveEntityRoom(entityId, entity, areaMap, entityRegistryMap, deviceRegistryMap);
    const name = getName(entity, entityEntry);
    const capabilities = inferHomeAssistantCapabilities(entityId, entity);
    const type =
      domain === 'input_boolean' ||
      domain === 'script' ||
      domain === 'button' ||
      domain === 'input_button'
        ? 'helper'
        : domain === 'binary_sensor'
          ? 'sensor'
          : (domain as NavetEntity['type']);

    const resources =
      domain === 'camera'
        ? ({
            camera_snapshot: {
              kind: 'camera_snapshot' as const,
              providerId: 'home_assistant',
              entityId,
              path:
                typeof entity.attributes?.entity_picture === 'string'
                  ? entity.attributes.entity_picture
                  : undefined,
            },
          } satisfies NavetEntity['resources'])
        : domain === 'media_player'
          ? ({
              media_artwork: {
                kind: 'media_artwork' as const,
                providerId: 'home_assistant',
                entityId,
                path:
                  (typeof entity.attributes?.entity_picture === 'string' &&
                    entity.attributes.entity_picture) ||
                  (typeof entity.attributes?.entity_picture_local === 'string' &&
                    entity.attributes.entity_picture_local) ||
                  (typeof entity.attributes?.media_image_url === 'string' &&
                    entity.attributes.media_image_url) ||
                  undefined,
              },
            } satisfies NavetEntity['resources'])
          : typeof entity.attributes?.entity_picture === 'string'
            ? ({
                primary_image: {
                  kind: 'primary_image' as const,
                  providerId: 'home_assistant',
                  entityId,
                  path:
                    typeof entity.attributes?.entity_picture === 'string'
                      ? entity.attributes.entity_picture
                      : undefined,
                },
              } satisfies NavetEntity['resources'])
            : undefined;

    entities.push(
      createNavetEntity(
        entityId,
        type,
        name,
        room || UNKNOWN_ROOM_LABEL,
        capabilities,
        createHomeAssistantState(entityId, entity, entityEntry),
        resources
      )
    );
  }

  return entities;
}

export function buildHomeAssistantProviderRooms(
  input: HomeAssistantNavetMappingInput
): NavetProviderRoom[] {
  return buildProviderRoomMap(mapHomeAssistantEntitiesToNavetEntities(input));
}
