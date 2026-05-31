/**
 * Entity filter utilities for Home Assistant device mapping.
 *
 * Provides reusable helpers for filtering and sorting entities
 * based on category, domain, and other attributes.
 */

import type { HassEntity } from 'home-assistant-js-websocket';

/**
 * Entity category type from Home Assistant.
 */
export type EntityCategory = 'config' | 'diagnostic' | null;

/**
 * Extract entity category from entity entry.
 */
export function getEntityCategory(entityEntry: { entity_category?: unknown }): EntityCategory {
  const raw = entityEntry?.entity_category;
  return typeof raw === 'string' ? (raw as 'config' | 'diagnostic') : null;
}

/**
 * Calculate sort penalty for entity category.
 * Config and diagnostic entities should be sorted lower.
 */
export function getCategoryPenalty(category: EntityCategory): number {
  if (category === 'config') return 100;
  if (category === 'diagnostic') return 200;
  return 0;
}

/**
 * Check if entity is a helper/service entity based on keywords.
 */
export function isHelperEntity(objectId: string, friendlyName: string): boolean {
  const searchStr = `${objectId} ${friendlyName}`.toLowerCase();
  const helperKeywords = [
    'boost',
    'timer',
    'speed',
    'mode',
    'humidity',
    'light',
    'delay',
    'interval',
    'preset',
    'continuous',
    'trickle',
    'gateway',
    'restart',
    'reboot',
    'update',
  ];

  return helperKeywords.some((keyword) => searchStr.includes(keyword));
}

/**
 * Calculate sort penalty for helper entities.
 */
export function getHelperPenalty(objectId: string, friendlyName: string): number {
  return isHelperEntity(objectId, friendlyName) ? 20 : 0;
}

/**
 * Create a sort key for entity prioritization.
 * Returns a tuple for multi-level sorting.
 */
export function createEntitySortKey(
  entityId: string,
  entity: HassEntity,
  entityEntry?: { entity_category?: unknown } | undefined
): [number, number, string] {
  const category = getEntityCategory(entityEntry ?? { entity_category: undefined });
  const categoryPenalty = getCategoryPenalty(category);

  const objectId = entityId.split('.').pop()?.toLowerCase() ?? '';
  const friendlyName =
    typeof entity.attributes?.friendly_name === 'string'
      ? entity.attributes.friendly_name.toLowerCase()
      : '';

  const helperPenalty = getHelperPenalty(objectId, friendlyName);

  return [categoryPenalty + helperPenalty, objectId.length, objectId];
}

/**
 * Compare two sort keys for sorting.
 */
export function compareEntitySortKeys(
  left: [number, number, string],
  right: [number, number, string]
): number {
  if (left[0] !== right[0]) {
    return left[0] - right[0];
  }

  if (left[1] !== right[1]) {
    return left[1] - right[1];
  }

  return left[2].localeCompare(right[2]);
}

/**
 * Check if entity should be excluded from device mapping.
 */
export function shouldExcludeEntity(
  entity: HassEntity,
  options?: {
    excludeConfig?: boolean;
    excludeDiagnostic?: boolean;
    excludeHelpers?: boolean;
  }
): boolean {
  if (!options) return false;

  const entry = { entity_category: entity.attributes?.entity_category };
  const category = getEntityCategory(entry);

  if (options.excludeConfig && category === 'config') return true;
  if (options.excludeDiagnostic && category === 'diagnostic') return true;

  const objectId = entity.entity_id.split('.').pop() ?? '';
  const friendlyName =
    typeof entity.attributes?.friendly_name === 'string' ? entity.attributes.friendly_name : '';

  if (options.excludeHelpers && isHelperEntity(objectId, friendlyName)) return true;

  return false;
}

/**
 * Filter entities by domain.
 */
export function filterEntitiesByDomain<T extends HassEntity>(
  entities: Record<string, T>,
  domain: string
): Record<string, T> {
  const prefix = `${domain}.`;
  const result: Record<string, T> = {};

  for (const [id, entity] of Object.entries(entities)) {
    if (id.startsWith(prefix)) {
      result[id] = entity;
    }
  }

  return result;
}

/**
 * Get entities matching multiple domains.
 */
export function filterEntitiesByDomains<T extends HassEntity>(
  entities: Record<string, T>,
  domains: string[]
): Record<string, T> {
  const result: Record<string, T> = {};

  for (const [id, entity] of Object.entries(entities)) {
    const domain = id.split('.')[0];
    if (domains.includes(domain)) {
      result[id] = entity;
    }
  }

  return result;
}
