import { UNKNOWN_ROOM_LABEL } from '@navet/app/utils/device-location';

type EntityWithAttributes = { attributes?: Record<string, unknown> };

export function resolveProviderFeatureEntityName(
  entityId: string,
  entity: EntityWithAttributes,
  entityName?: string | null
) {
  if (typeof entityName === 'string' && entityName.trim().length > 0) {
    return entityName.trim();
  }

  return (
    (typeof entity.attributes?.friendly_name === 'string' && entity.attributes.friendly_name) ||
    entityId ||
    'Unknown'
  );
}

export function resolveProviderFeatureEntityRoom(
  entity: EntityWithAttributes,
  entityRoom?: string
) {
  return (
    entityRoom ||
    (typeof entity.attributes?.room === 'string' ? entity.attributes.room : null) ||
    (typeof entity.attributes?.area === 'string' ? entity.attributes.area : null) ||
    (typeof entity.attributes?.zone === 'string' ? entity.attributes.zone : null) ||
    UNKNOWN_ROOM_LABEL
  );
}
