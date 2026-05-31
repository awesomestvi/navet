import type {
  NavetDevice,
  NavetProviderSnapshot,
  NavetRoom,
} from '@navet/app/internal/compat-models';
import { UNKNOWN_ROOM_LABEL } from '@navet/app/utils/device-location';
import type { NavetEntity, NavetProviderRoom, NavetProviderState } from '@navet/core/types';

function mapEntityTypeToDeviceKind(entity: NavetEntity): NavetDevice['kind'] {
  switch (entity.type) {
    case 'media_player':
      return 'media';
    case 'grouped_sensor':
      return 'grouped-sensor';
    case 'binary_sensor':
    case 'energy':
    case 'unknown':
      return 'sensor';
    default:
      return entity.type;
  }
}

function mapProviderEntityState(entity: NavetEntity): Record<string, unknown> {
  const baseState = { ...entity.attributes };

  if (!('value' in baseState) && entity.primaryState !== null) {
    baseState.value = entity.primaryState;
  }
  if (!('availability' in baseState)) {
    baseState.availability = entity.availability;
  }
  if (entity.lastUpdated && !('lastUpdated' in baseState) && !('last_updated' in baseState)) {
    baseState.lastUpdated = entity.lastUpdated;
  }

  return baseState;
}

export function mapProviderEntityToNavetDevice(entity: NavetEntity): NavetDevice {
  return {
    id: entity.canonicalId,
    canonicalId: entity.canonicalId,
    providerId: entity.providerId,
    nativeId: entity.externalId,
    kind: mapEntityTypeToDeviceKind(entity),
    name: entity.name,
    room: entity.room ?? UNKNOWN_ROOM_LABEL,
    capabilities: [...entity.capabilities],
    state: mapProviderEntityState(entity),
    resources: entity.resources,
  };
}

export function mapProviderRoomToNavetRoom(room: NavetProviderRoom): NavetRoom {
  return {
    id: room.canonicalId,
    canonicalId: room.canonicalId,
    providerId: room.providerId,
    nativeId: room.externalId,
    name: room.name,
    normalizedName: room.normalizedName,
    alias: room.alias,
    memberIds: [...room.memberIds],
  };
}

export function mapProviderStateToCompatibilitySnapshot(
  state: NavetProviderState
): NavetProviderSnapshot {
  return {
    providerId: state.providerId,
    connected: state.connected,
    devices: state.entities.map(mapProviderEntityToNavetDevice),
    rooms: state.rooms.map(mapProviderRoomToNavetRoom),
  };
}
