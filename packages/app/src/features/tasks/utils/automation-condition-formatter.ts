import {
  type AutomationConfigSummaryOptions,
  resolveEntityLabel,
  stringifyValue,
} from './automation-formatter-helpers';

type UnknownRecord = Record<string, unknown>;

export function summarizeCondition(
  condition: unknown,
  options: AutomationConfigSummaryOptions
): string | null {
  if (!condition || typeof condition !== 'object') {
    return stringifyValue(condition);
  }

  const record = condition as UnknownRecord;
  const type = stringifyValue(record.condition) ?? 'condition';

  switch (type) {
    case 'state': {
      const entityLabel = resolveEntityLabel(record.entity_id, options) ?? 'An entity';
      return `${entityLabel} is ${stringifyValue(record.state) ?? 'in the required state'}`;
    }
    case 'numeric_state': {
      const entityLabel = resolveEntityLabel(record.entity_id, options) ?? 'An entity';
      const above = stringifyValue(record.above);
      const below = stringifyValue(record.below);
      const parts = [entityLabel, 'is'];
      if (above) parts.push(`above ${above}`);
      if (below) parts.push(`below ${below}`);
      return parts.join(' ');
    }
    case 'time': {
      const after = stringifyValue(record.after);
      const before = stringifyValue(record.before);
      if (after && before) {
        return `The time is between ${after} and ${before}`;
      }
      if (after) {
        return `The time is after ${after}`;
      }
      if (before) {
        return `The time is before ${before}`;
      }
      return 'The current time matches the configured window';
    }
    case 'sun':
      return 'The sun position matches the configured rule';
    case 'template':
      return 'A template condition is true';
    case 'or':
    case 'and':
    case 'not':
      return `${type.toUpperCase()} condition group`;
    default:
      return stringifyValue(record.alias) ?? humanizeToken(type);
  }
}

function humanizeToken(value: string): string {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
