import type { DeviceWithType } from '@navet/app/types/device.types';

export interface SecurityQuickviewPreference {
  mode: 'auto' | 'custom';
  entityIds: string[];
}

export const DEFAULT_SECURITY_QUICKVIEW_PREFERENCE: SecurityQuickviewPreference = {
  mode: 'auto',
  entityIds: [],
};

export function normalizeSecurityQuickviewPreference(value: unknown): SecurityQuickviewPreference {
  if (!value || typeof value !== 'object') {
    return DEFAULT_SECURITY_QUICKVIEW_PREFERENCE;
  }

  const candidate = value as Partial<SecurityQuickviewPreference>;
  if (candidate.mode !== 'custom' || !Array.isArray(candidate.entityIds)) {
    return DEFAULT_SECURITY_QUICKVIEW_PREFERENCE;
  }

  return {
    mode: 'custom',
    entityIds: [
      ...new Set(candidate.entityIds.filter((id): id is string => typeof id === 'string')),
    ],
  };
}

export function getAutomaticSecurityQuickviewEntityIds(entities: DeviceWithType[]): string[] {
  const cameraIds = entities
    .filter((entity) => entity.type === 'cameras')
    .slice(0, 2)
    .map((entity) => entity.id);

  return cameraIds.length > 0 ? cameraIds : entities.slice(0, 2).map((entity) => entity.id);
}

export function resolveSecurityQuickviewEntities(
  preference: SecurityQuickviewPreference,
  entities: DeviceWithType[]
): DeviceWithType[] {
  const entityById = new Map(entities.map((entity) => [entity.id, entity]));
  const preferredEntityIds =
    preference.mode === 'custom'
      ? preference.entityIds
      : getAutomaticSecurityQuickviewEntityIds(entities);
  const resolvedEntities = preferredEntityIds.flatMap((entityId) => {
    const entity = entityById.get(entityId);
    return entity ? [entity] : [];
  });

  return resolvedEntities;
}

/** Pin or reorder without duplicating IDs or changing dashboard visibility. */
export function placeSecurityQuickviewEntity(
  entityIds: string[],
  entityId: string,
  overId?: string
): SecurityQuickviewPreference {
  const current = [...new Set(entityIds)];
  if (overId === entityId) return { mode: 'custom', entityIds: current };
  const targetIndex = overId ? current.indexOf(overId) : -1;
  const next = current.filter((id) => id !== entityId);
  next.splice(targetIndex < 0 ? next.length : targetIndex, 0, entityId);
  return { mode: 'custom', entityIds: next };
}
