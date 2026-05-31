/**
 * Entity name and room resolution utilities
 */

import { UNKNOWN_ROOM_LABEL } from '@navet/app/utils/device-location';

interface NamedEntityLike {
  entity_id?: string;
  entityId?: string;
  attributes?: Record<string, unknown>;
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
    if (areaName) return areaName;
  }

  return (
    (typeof entity.attributes?.room === 'string' ? entity.attributes.room : null) ||
    (typeof entity.attributes?.area === 'string' ? entity.attributes.area : null) ||
    (typeof entity.attributes?.zone === 'string' ? entity.attributes.zone : null) ||
    UNKNOWN_ROOM_LABEL
  );
}
