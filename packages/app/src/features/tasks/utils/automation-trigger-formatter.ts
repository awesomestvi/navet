import {
  type AutomationConfigSummaryOptions,
  humanizeToken,
  resolveEntityLabel,
  stringifyValue,
} from './automation-formatter-helpers';

type UnknownRecord = Record<string, unknown>;

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
