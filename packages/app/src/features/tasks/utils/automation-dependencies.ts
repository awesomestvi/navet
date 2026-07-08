import type { PlatformTaskEntityMap } from '@navet/app/platform/provider-feature-models';

export interface AutomationDependencySummary {
  entityId: string;
  label: string;
  state: string;
}

const SERVICE_REFERENCE_KEYS = new Set(['action', 'service']);

function collectEntityIds(
  value: unknown,
  entityIds = new Set<string>(),
  key?: string
): Set<string> {
  if (typeof value === 'string') {
    if (key && SERVICE_REFERENCE_KEYS.has(key)) {
      return entityIds;
    }

    const matches = value.match(/\b[a-z_]+\.[a-zA-Z0-9_]+\b/g);
    for (const match of matches ?? []) {
      entityIds.add(match);
    }
    return entityIds;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectEntityIds(item, entityIds, key);
    }
    return entityIds;
  }

  if (value && typeof value === 'object') {
    for (const [childKey, item] of Object.entries(value)) {
      collectEntityIds(item, entityIds, childKey);
    }
  }

  return entityIds;
}

export function getAutomationConfigEntityIds(config: Record<string, unknown> | null): string[] {
  return config ? [...collectEntityIds(config)].sort() : [];
}

export function buildAutomationDependencySummaries(
  entityIds: readonly string[],
  entities: PlatformTaskEntityMap | null | undefined
): AutomationDependencySummary[] {
  if (!entities || entityIds.length === 0) {
    return [];
  }

  return entityIds
    .map((entityId) => {
      const entity = entities[entityId];
      if (!entity) {
        return null;
      }

      return {
        entityId,
        label: entity.name ?? entityId,
        state: entity.state,
      };
    })
    .filter((summary): summary is AutomationDependencySummary => summary !== null);
}
