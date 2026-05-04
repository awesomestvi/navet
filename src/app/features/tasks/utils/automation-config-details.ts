import type { HassEntities } from 'home-assistant-js-websocket';
import { getName } from '@/app/hooks/ha-entity-utils';

export interface AutomationConfigSections {
  overview?: string;
  description?: string;
  triggers: string[];
  conditions: string[];
  actions: string[];
}

interface AutomationConfigSummaryOptions {
  entities?: HassEntities | null;
}

type UnknownRecord = Record<string, unknown>;

function ensureArray(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  return value === undefined || value === null ? [] : [value];
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
    return entity ? getName(entity) : value;
  }

  if (Array.isArray(value)) {
    const labels = value
      .map((item) => resolveEntityLabel(item, options))
      .filter((item): item is string => Boolean(item));
    return labels.length > 0 ? joinLabels(labels) : null;
  }

  return stringifyValue(value);
}

function formatDataValue(value: unknown, options: AutomationConfigSummaryOptions): string | null {
  if (typeof value === 'string' && looksLikeEntityId(value)) {
    return resolveEntityLabel(value, options);
  }

  if (Array.isArray(value)) {
    const labels = value
      .map((item) => formatDataValue(item, options))
      .filter((item): item is string => Boolean(item));
    return labels.length > 0 ? joinLabels(labels) : null;
  }

  return stringifyValue(value);
}

function formatTarget(value: unknown, options: AutomationConfigSummaryOptions): string | null {
  if (!value || typeof value !== 'object') {
    return resolveEntityLabel(value, options);
  }

  const record = value as UnknownRecord;
  const entityLabel = resolveEntityLabel(record.entity_id, options);
  const areaLabel = stringifyValue(record.area_id);
  const deviceLabel = stringifyValue(record.device_id);
  const labels = [
    entityLabel,
    areaLabel ? `area ${areaLabel}` : null,
    deviceLabel ? `device ${deviceLabel}` : null,
  ].filter((item): item is string => Boolean(item));

  return labels.length > 0 ? joinLabels(labels) : null;
}

function serviceVerbLabel(serviceName: string): string {
  switch (serviceName) {
    case 'turn_on':
      return 'Turn on';
    case 'turn_off':
      return 'Turn off';
    case 'toggle':
      return 'Toggle';
    case 'trigger':
      return 'Run';
    case 'open':
      return 'Open';
    case 'close':
      return 'Close';
    case 'lock':
      return 'Lock';
    case 'unlock':
      return 'Unlock';
    case 'start':
      return 'Start';
    case 'stop':
      return 'Stop';
    case 'pause':
    case 'media_pause':
      return 'Pause';
    case 'play':
    case 'media_play':
      return 'Play';
    case 'media_stop':
      return 'Stop playback';
    case 'select_option':
      return 'Set';
    default:
      return humanizeToken(serviceName);
  }
}

function formatServiceAction(
  actionName: string,
  record: UnknownRecord,
  options: AutomationConfigSummaryOptions
): string {
  const [domain, serviceName] = actionName.split('.');
  const target =
    formatTarget(record.target, options) ?? resolveEntityLabel(record.entity_id, options);
  const dataBits: string[] = [];

  if (record.data && typeof record.data === 'object') {
    for (const [key, value] of Object.entries(record.data as UnknownRecord)) {
      const formatted = formatDataValue(value, options);
      if (formatted) {
        dataBits.push(`${humanizeToken(key).toLowerCase()} ${formatted}`);
      }
    }
  }

  if (domain && serviceName) {
    const base = target
      ? `${serviceVerbLabel(serviceName)} ${target}`
      : `${serviceVerbLabel(serviceName)} ${humanizeToken(domain).toLowerCase()}`;

    return dataBits.length > 0 ? `${base} with ${dataBits.join(', ')}` : base;
  }

  const fallback = target ? `${actionName} ${target}` : actionName;
  return dataBits.length > 0 ? `${fallback} with ${dataBits.join(', ')}` : fallback;
}

function summarizeTrigger(
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

function summarizeCondition(
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

function summarizeAction(action: unknown, options: AutomationConfigSummaryOptions): string[] {
  if (!action || typeof action !== 'object') {
    const fallback = stringifyValue(action);
    return fallback ? [fallback] : [];
  }

  const record = action as UnknownRecord;
  const directService = stringifyValue(record.action ?? record.service);
  if (directService?.includes('.')) {
    return [formatServiceAction(directService, record, options)];
  }

  if (record.delay) {
    return [`Wait ${stringifyValue(record.delay) ?? ''}`.trim()];
  }

  if (record.wait_template) {
    return ['Wait until a template becomes true'];
  }

  if (record.event) {
    return [`Fire the ${stringifyValue(record.event) ?? 'configured'} event`];
  }

  if (record.choose) {
    return [
      `Choose between ${ensureArray(record.choose).length} branch${ensureArray(record.choose).length === 1 ? '' : 'es'}`,
      ...ensureArray(record.choose).flatMap((choice) =>
        choice && typeof choice === 'object'
          ? summarizeActionSequence((choice as UnknownRecord).sequence, options)
          : []
      ),
    ];
  }

  if (record.sequence) {
    return summarizeActionSequence(record.sequence, options);
  }

  if (record.parallel) {
    return [
      `Run ${ensureArray(record.parallel).length} branch${ensureArray(record.parallel).length === 1 ? '' : 'es'} in parallel`,
      ...ensureArray(record.parallel).flatMap((branch) => summarizeAction(branch, options)),
    ];
  }

  if (record.if) {
    return [
      'Run a conditional branch',
      ...summarizeActionSequence(record.then, options),
      ...summarizeActionSequence(record.else, options),
    ];
  }

  if (record.repeat) {
    return [
      'Repeat a sequence',
      ...summarizeActionSequence((record.repeat as UnknownRecord).sequence, options),
    ];
  }

  return [stringifyValue(record.alias) ?? 'Run the configured action'];
}

function summarizeActionSequence(
  sequence: unknown,
  options: AutomationConfigSummaryOptions
): string[] {
  return ensureArray(sequence).flatMap((item) => summarizeAction(item, options));
}

function buildOverview({
  description,
  actions,
  triggers,
}: Pick<AutomationConfigSections, 'description' | 'actions' | 'triggers'>): string | undefined {
  if (description?.trim()) {
    return description.trim();
  }

  const action = actions[0];
  const trigger = triggers[0];

  if (action && trigger) {
    return `${action} when ${trigger.charAt(0).toLowerCase()}${trigger.slice(1)}`;
  }

  return action ?? trigger ?? undefined;
}

export function buildAutomationConfigSections(
  config: Record<string, unknown>,
  options: AutomationConfigSummaryOptions = {}
): AutomationConfigSections {
  const triggers = ensureArray(config.triggers ?? config.trigger)
    .map((trigger) => summarizeTrigger(trigger, options))
    .filter((value): value is string => Boolean(value));
  const conditions = ensureArray(config.conditions ?? config.condition)
    .map((condition) => summarizeCondition(condition, options))
    .filter((value): value is string => Boolean(value));
  const actions = summarizeActionSequence(config.actions ?? config.action, options);
  const description =
    typeof config.description === 'string' && config.description.trim()
      ? config.description
      : undefined;

  return {
    overview: buildOverview({ description, actions, triggers }),
    description,
    triggers,
    conditions,
    actions,
  };
}
