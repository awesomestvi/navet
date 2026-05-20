/**
 * Entity name and room resolution utilities
 */

import type { HassEntity } from 'home-assistant-js-websocket';
import { UNKNOWN_ROOM_LABEL } from '../../utils/device-location';

export function getName(entity: HassEntity, registryEntry?: { name?: string | null }): string {
  if (typeof registryEntry?.name === 'string' && registryEntry.name.trim().length > 0) {
    return registryEntry.name.trim();
  }

  return entity.attributes?.friendly_name || entity.entity_id;
}

export function resolveEntityRoom(
  entityId: string,
  entity: HassEntity,
  areaMap: Map<string, string>,
  entityRegistryMap: Map<string, { area_id?: string | null; device_id?: string | null }>,
  deviceRegistryMap: Map<string, { area_id?: string | null }>
): string {
  const entityEntry = entityRegistryMap.get(entityId);
  const deviceEntry = entityEntry?.device_id
    ? deviceRegistryMap.get(entityEntry.device_id)
    : undefined;
  const areaId = entityEntry?.area_id ?? deviceEntry?.area_id;

  if (areaId) {
    const areaName = areaMap.get(areaId);
    if (areaName) return areaName;
  }

  return (
    entity.attributes?.room ||
    entity.attributes?.area ||
    entity.attributes?.zone ||
    UNKNOWN_ROOM_LABEL
  );
}
