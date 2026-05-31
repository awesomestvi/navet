import type {
  PlatformTaskDeviceReference,
  PlatformTaskEntityMap,
  PlatformTaskEntityReference,
  PlatformTaskEntityState,
  PlatformTaskRoomReference,
} from '@navet/app/platform/provider-feature-models';

type RoomMap = Map<string, string>;
type DeviceMap = Map<string, PlatformTaskDeviceReference>;
type EntityReferenceMap = Map<string, PlatformTaskEntityReference>;

export function getTaskEntityName(entity: PlatformTaskEntityState): string {
  const friendlyName = entity.attributes.friendly_name;
  if (typeof friendlyName === 'string' && friendlyName.trim()) {
    return friendlyName;
  }

  if (typeof entity.name === 'string' && entity.name.trim()) {
    return entity.name;
  }

  return entity.entityId || (entity as { entity_id?: string }).entity_id || 'Unknown entity';
}

export function createTaskRoomMaps({
  rooms,
  devices,
  entityReferences,
}: {
  rooms: PlatformTaskRoomReference[];
  devices: PlatformTaskDeviceReference[];
  entityReferences: PlatformTaskEntityReference[];
}): {
  roomMap: RoomMap;
  deviceMap: DeviceMap;
  entityReferenceMap: EntityReferenceMap;
} {
  return {
    roomMap: new Map(rooms.map((room) => [room.id, room.name])),
    deviceMap: new Map(devices.map((device) => [device.id, device])),
    entityReferenceMap: new Map(
      entityReferences.map((entityReference) => [entityReference.entityId, entityReference])
    ),
  };
}

export function resolveTaskEntityRoom(
  entityId: string,
  roomMap: RoomMap,
  entityReferenceMap: EntityReferenceMap,
  deviceMap: DeviceMap
): string {
  const entityReference = entityReferenceMap.get(entityId);
  const directRoomId = entityReference?.roomId ?? undefined;

  if (directRoomId) {
    return roomMap.get(directRoomId) ?? 'Unassigned';
  }

  const deviceRoomId = entityReference?.deviceId
    ? (deviceMap.get(entityReference.deviceId)?.roomId ?? undefined)
    : undefined;

  if (deviceRoomId) {
    return roomMap.get(deviceRoomId) ?? 'Unassigned';
  }

  return 'Unassigned';
}

export function filterTaskEntities(
  entities: PlatformTaskEntityMap | null,
  predicate: (entityId: string) => boolean
): PlatformTaskEntityMap | null {
  if (!entities) {
    return null;
  }

  return Object.fromEntries(Object.entries(entities).filter(([entityId]) => predicate(entityId)));
}
