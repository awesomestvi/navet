import type { DeviceWithType } from '@navet/app/types/device.types';

export interface SecurityOverviewPreference {
  mode: 'auto' | 'custom';
  entityIds: string[];
}

export const DEFAULT_SECURITY_OVERVIEW_PREFERENCE: SecurityOverviewPreference = {
  mode: 'auto',
  entityIds: [],
};

export function normalizeSecurityOverviewPreference(value: unknown): SecurityOverviewPreference {
  if (!value || typeof value !== 'object') {
    return DEFAULT_SECURITY_OVERVIEW_PREFERENCE;
  }

  const candidate = value as Partial<SecurityOverviewPreference>;
  if (candidate.mode !== 'custom' || !Array.isArray(candidate.entityIds)) {
    return DEFAULT_SECURITY_OVERVIEW_PREFERENCE;
  }

  return {
    mode: 'custom',
    entityIds: [
      ...new Set(candidate.entityIds.filter((id): id is string => typeof id === 'string')),
    ],
  };
}

export function getAutomaticSecurityOverviewEntityIds(entities: DeviceWithType[]): string[] {
  const cameraIds = entities
    .filter((entity) => entity.type === 'cameras')
    .slice(0, 2)
    .map((entity) => entity.id);

  return cameraIds.length > 0 ? cameraIds : entities.slice(0, 2).map((entity) => entity.id);
}

export function resolveSecurityOverviewEntities(
  preference: SecurityOverviewPreference,
  entities: DeviceWithType[]
): DeviceWithType[] {
  const entityById = new Map(entities.map((entity) => [entity.id, entity]));
  const preferredEntityIds =
    preference.mode === 'custom'
      ? preference.entityIds
      : getAutomaticSecurityOverviewEntityIds(entities);
  const resolvedEntities = preferredEntityIds.flatMap((entityId) => {
    const entity = entityById.get(entityId);
    return entity ? [entity] : [];
  });

  if (resolvedEntities.length > 0 || preference.mode === 'auto') {
    return resolvedEntities;
  }

  return getAutomaticSecurityOverviewEntityIds(entities).flatMap((entityId) => {
    const entity = entityById.get(entityId);
    return entity ? [entity] : [];
  });
}
