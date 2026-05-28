import type { PlatformTaskEntityMap } from '@/app/platform/provider-feature-models';
import { getTaskEntityName } from './task-runtime';

type UnknownRecord = Record<string, unknown>;

interface AutomationConfigSummaryOptions {
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

function resolveEntityLabel(
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

export function summarizeTrigger(
  trigger: unknown,
  options: AutomationConfigSummaryOptions
): string | null {
  if (!trigger || typeof trigger !== 'object') {
    return stringifyValue(trigger);
  }

  const record = trigger as UnknownRecord;
  const type = stringifyValue(record.trigger ?? record.platform) ?? 'trigger';

  switch (type) {
    case 'state': {
      const entityLabel = resolveEntityLabel(record.entity_id, options) ?? 'An entity';
      const from = stringifyValue(record.from);
      const to = stringifyValue(record.to);

      if (from && to) {
        return `${entityLabel} changes from ${from} to ${to}`;
      }
      if (to) {
        return `${entityLabel} changes to ${to}`;
      }
      if (from) {
        return `${entityLabel} changes from ${from}`;
      }

      return `${entityLabel} changes state`;
    }
    case 'numeric_state': {
      const entityLabel = resolveEntityLabel(record.entity_id, options) ?? 'An entity';
      const above = stringifyValue(record.above);
      const below = stringifyValue(record.below);
      const parts = [entityLabel];
      if (above) parts.push(`rises above ${above}`);
      if (below) parts.push(`drops below ${below}`);
      return parts.join(' ');
    }
    case 'time':
      return `The time reaches ${stringifyValue(record.at) ?? 'the scheduled time'}`;
    case 'sun':
      return `It is ${stringifyValue(record.event) ?? 'a sun event'}${stringifyValue(record.offset) ? ` (${stringifyValue(record.offset)})` : ''}`;
    case 'event':
      return `The ${stringifyValue(record.event_type) ?? 'configured'} event fires`;
    case 'calendar': {
      const entityLabel = resolveEntityLabel(record.entity_id, options) ?? 'A calendar';
      return `${entityLabel} ${stringifyValue(record.event) ?? 'updates'}`;
    }
    case 'template':
      return 'A template condition becomes true';
    case 'zone': {
      const entityLabel = resolveEntityLabel(record.entity_id, options) ?? 'An entity';
      const zoneLabel =
        resolveEntityLabel(record.zone, options) ?? stringifyValue(record.zone) ?? 'a zone';
      const event = stringifyValue(record.event);
      if (event === 'enter') {
        return `${entityLabel} enters ${zoneLabel}`;
      }
      if (event === 'leave') {
        return `${entityLabel} leaves ${zoneLabel}`;
      }
      return `${entityLabel} changes zone near ${zoneLabel}`;
    }
    default:
      return stringifyValue(record.alias) ?? humanizeToken(type);
  }
}
