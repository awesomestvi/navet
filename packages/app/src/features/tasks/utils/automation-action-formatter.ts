import {
  type AutomationConfigSummaryOptions,
  humanizeToken,
  joinLabels,
  resolveEntityLabel,
  stringifyValue,
} from './automation-formatter-helpers';

type UnknownRecord = Record<string, unknown>;

function ensureArray(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }

  return value === undefined || value === null ? [] : [value];
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

function looksLikeEntityId(value: string): boolean {
  return /^[a-z0-9_]+\.[a-z0-9_]+$/i.test(value);
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

export function summarizeAction(
  action: unknown,
  options: AutomationConfigSummaryOptions
): string[] {
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

export function summarizeActionSequence(
  sequence: unknown,
  options: AutomationConfigSummaryOptions
): string[] {
  return ensureArray(sequence).flatMap((item) => summarizeAction(item, options));
}
