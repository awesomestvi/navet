/**
 * Entity name and room resolution utilities
 */

import { UNKNOWN_ROOM_LABEL } from '@navet/app/utils/device-location';

interface NamedEntityLike {
  entity_id?: string;
  entityId?: string;
  attributes?: Record<string, unknown>;
}

function readRegistryName(registryEntry?: {
  name?: string | null;
  name_by_user?: string | null;
  original_name?: string | null;
  originalName?: string | null;
}) {
  for (const candidate of [
    registryEntry?.name_by_user,
    registryEntry?.name,
    registryEntry?.original_name,
    registryEntry?.originalName,
  ]) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }
}

export function getName(
  entity: NamedEntityLike,
  registryEntry?: {
    name?: string | null;
    name_by_user?: string | null;
    original_name?: string | null;
    originalName?: string | null;
  }
): string {
  const registryName = readRegistryName(registryEntry);
  if (registryName) {
    return registryName;
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
