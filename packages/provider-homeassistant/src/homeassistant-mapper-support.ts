import type {
  HomeAssistantAreaRegistryEntry,
  HomeAssistantDeviceRegistryEntry,
  HomeAssistantEntityRegistryEntry,
} from './homeassistant-service-bridge';

const MEDIA_PLAYER_FEATURES = {
  VOLUME_SET: 4,
  VOLUME_MUTE: 8,
  PREVIOUS_TRACK: 16,
  NEXT_TRACK: 32,
  TURN_ON: 128,
  TURN_OFF: 256,
  PLAY_MEDIA: 512,
  PLAY: 16384,
  SHUFFLE_SET: 32768,
  SELECT_SOURCE: 2048,
  SELECT_SOUND_MODE: 65536,
  BROWSE_MEDIA: 131072,
  REPEAT_SET: 262144,
  GROUPING: 524288,
} as const;

export const UNKNOWN_ROOM_LABEL = 'Unassigned';

export interface HADeviceRegistryMaps {
  areaMap: Map<string, string>;
  deviceRegistryMap: Map<string, HomeAssistantDeviceRegistryEntry>;
  entityRegistryMap: Map<string, HomeAssistantEntityRegistryEntry>;
}

interface NamedEntityLike {
  entity_id?: string;
  entityId?: string;
  attributes?: Record<string, unknown>;
}

export function getEntityCategory(
  entityEntry: { entity_category?: unknown } | undefined
): 'config' | 'diagnostic' | null {
  const raw = entityEntry?.entity_category;
  return raw === 'config' || raw === 'diagnostic' ? raw : null;
}

export function createRegistryMaps(
  areas: HomeAssistantAreaRegistryEntry[],
  deviceRegistry: HomeAssistantDeviceRegistryEntry[],
  entityRegistry: HomeAssistantEntityRegistryEntry[]
): HADeviceRegistryMaps {
  return {
    areaMap: new Map(areas.map((area) => [area.area_id, area.name])),
    entityRegistryMap: new Map(
      entityRegistry.map((registryEntry) => [registryEntry.entity_id, registryEntry])
    ),
    deviceRegistryMap: new Map(deviceRegistry.map((device) => [device.id, device])),
  };
}

export function getName(entity: NamedEntityLike, registryEntry?: { name?: string | null }): string {
  if (typeof registryEntry?.name === 'string' && registryEntry.name.trim().length > 0) {
    return registryEntry.name.trim();
  }

  return (
    (typeof entity.attributes?.friendly_name === 'string' && entity.attributes.friendly_name) ||
    entity.entity_id ||
    entity.entityId ||
    'Unknown'
  );
}

export function resolveEntityRoom(
  entityId: string,
  entity: NamedEntityLike,
  areaMap: Map<string, string>,
  entityRegistryMap: Map<
    string,
    {
      area_id?: string | null;
      device_id?: string | null;
      areaId?: string | null;
      deviceId?: string | null;
    }
  >,
  deviceRegistryMap: Map<string, { area_id?: string | null; areaId?: string | null }>
): string {
  const entityEntry = entityRegistryMap.get(entityId);
  const deviceId = entityEntry?.device_id ?? entityEntry?.deviceId;
  const deviceEntry = deviceId ? deviceRegistryMap.get(deviceId) : undefined;
  const areaId =
    entityEntry?.area_id ?? entityEntry?.areaId ?? deviceEntry?.area_id ?? deviceEntry?.areaId;

  if (areaId) {
    const areaName = areaMap.get(areaId);
    if (areaName) {
      return areaName;
    }
  }

  return (
    (typeof entity.attributes?.room === 'string' ? entity.attributes.room : null) ||
    (typeof entity.attributes?.area === 'string' ? entity.attributes.area : null) ||
    (typeof entity.attributes?.zone === 'string' ? entity.attributes.zone : null) ||
    UNKNOWN_ROOM_LABEL
  );
}

export function normalizeTemperatureUnit(value: unknown): 'celsius' | 'fahrenheit' | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === '°f' || normalized === 'f' || normalized === 'fahrenheit') {
    return 'fahrenheit';
  }
  if (normalized === '°c' || normalized === 'c' || normalized === 'celsius') {
    return 'celsius';
  }

  return undefined;
}

export function normalizeVacuumStatus(state: unknown, fallback = 'idle') {
  const normalized =
    typeof state === 'string' ? state.trim().toLowerCase().replace(/\s+/g, '_') : '';

  if (normalized === 'cleaning') return 'cleaning';
  if (normalized === 'mopping' || normalized === 'washing' || normalized === 'washing_mop') {
    return 'mopping';
  }
  if (normalized === 'drying' || normalized === 'mop_drying' || normalized === 'drying_mop') {
    return 'drying';
  }
  if (normalized === 'returning' || normalized === 'returning_home') return 'returning';
  if (normalized === 'paused') return 'paused';
  if (normalized === 'charging') return 'charging';
  if (
    normalized === 'charged' ||
    normalized === 'fully_charged' ||
    normalized === 'charging_complete'
  ) {
    return 'charging-complete';
  }
  if (normalized === 'docked') return 'docked';
  if (normalized === 'error' || normalized === 'fault') return 'error';
  if (normalized === 'idle') return 'idle';
  return fallback;
}

function hasMediaPlayerFeature(supportedFeatures: number, feature: number): boolean {
  return (supportedFeatures & feature) === feature;
}

export function getMediaPlayerCapabilities(supportedFeatures: number) {
  return {
    canBrowseMedia: hasMediaPlayerFeature(supportedFeatures, MEDIA_PLAYER_FEATURES.BROWSE_MEDIA),
    canGroup: hasMediaPlayerFeature(supportedFeatures, MEDIA_PLAYER_FEATURES.GROUPING),
    canMuteVolume: hasMediaPlayerFeature(supportedFeatures, MEDIA_PLAYER_FEATURES.VOLUME_MUTE),
    canNextTrack: hasMediaPlayerFeature(supportedFeatures, MEDIA_PLAYER_FEATURES.NEXT_TRACK),
    canPlay: hasMediaPlayerFeature(supportedFeatures, MEDIA_PLAYER_FEATURES.PLAY),
    canPlayMedia: hasMediaPlayerFeature(supportedFeatures, MEDIA_PLAYER_FEATURES.PLAY_MEDIA),
    canPreviousTrack: hasMediaPlayerFeature(
      supportedFeatures,
      MEDIA_PLAYER_FEATURES.PREVIOUS_TRACK
    ),
    canRepeat: hasMediaPlayerFeature(supportedFeatures, MEDIA_PLAYER_FEATURES.REPEAT_SET),
    canSelectSoundMode: hasMediaPlayerFeature(
      supportedFeatures,
      MEDIA_PLAYER_FEATURES.SELECT_SOUND_MODE
    ),
    canSelectSource: hasMediaPlayerFeature(supportedFeatures, MEDIA_PLAYER_FEATURES.SELECT_SOURCE),
    canSetVolume: hasMediaPlayerFeature(supportedFeatures, MEDIA_PLAYER_FEATURES.VOLUME_SET),
    canShuffle: hasMediaPlayerFeature(supportedFeatures, MEDIA_PLAYER_FEATURES.SHUFFLE_SET),
    canTurnOff: hasMediaPlayerFeature(supportedFeatures, MEDIA_PLAYER_FEATURES.TURN_OFF),
    canTurnOn: hasMediaPlayerFeature(supportedFeatures, MEDIA_PLAYER_FEATURES.TURN_ON),
  };
}
