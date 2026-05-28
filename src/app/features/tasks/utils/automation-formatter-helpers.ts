import type { PlatformTaskEntityMap } from '@/app/platform/provider-feature-models';
import { getTaskEntityName } from './task-runtime';

export interface AutomationConfigSummaryOptions {
  entities?: PlatformTaskEntityMap | null;
}

function stringifyValue(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    const items = value.map((item) => stringifyValue(item)).filter(Boolean);
    return items.length > 0 ? items.join(', ') : null;
  }

  return null;
}

function humanizeToken(value: string): string {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function joinLabels(values: string[]): string {
  if (values.length <= 1) {
    return values[0] ?? '';
  }

  if (values.length === 2) {
    return `${values[0]} and ${values[1]}`;
  }

  return `${values.slice(0, -1).join(', ')}, and ${values[values.length - 1]}`;
}

function looksLikeEntityId(value: string): boolean {
  return /^[a-z0-9_]+\.[a-z0-9_]+$/i.test(value);
}

export function resolveEntityLabel(
  value: unknown,
  options: AutomationConfigSummaryOptions
): string | null {
  if (typeof value === 'string') {
    if (!looksLikeEntityId(value)) {
      return value.trim() || null;
    }

    const entity = options.entities?.[value];
    return entity ? getTaskEntityName(entity) : value;
  }

  if (Array.isArray(value)) {
    const labels = value
      .map((item) => resolveEntityLabel(item, options))
      .filter((item): item is string => Boolean(item));
    return labels.length > 0 ? joinLabels(labels) : null;
  }

  return stringifyValue(value);
}

export { humanizeToken, joinLabels, stringifyValue };
