import type { OpenHABItem } from './openhab-types';

export function openHABItemName(item: OpenHABItem): string {
  return item.label?.replace(/\s*\[[^\]]*\]\s*$/, '').trim() || item.name;
}

export function openHABNumber(item: OpenHABItem): number | undefined {
  const match = item.state?.trim().match(/^([-+]?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?)\s*[^\d]*$/);
  const value = match ? Number(match[1]) : NaN;
  return Number.isFinite(value) ? value : undefined;
}

export function openHABUnit(item: OpenHABItem): string {
  if (!item.type?.startsWith('Number') && item.type !== 'Dimmer') return '';
  const stateUnit = item.state?.match(/^[-+]?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?\s+(.+)$/)?.[1];
  const pattern = item.stateDescription?.pattern ?? item.label?.match(/\[([^\]]+)\]/)?.[1];
  const patternUnit = pattern
    ?.replace(/%[-\d.]*[a-zA-Z]/g, '')
    .replace(/%%/g, '%')
    .trim();
  return stateUnit ?? item.unitSymbol ?? item.metadata?.unit?.value ?? patternUnit ?? '';
}

export function openHABSourceId(item: OpenHABItem): string {
  // Semantic equipment is authoritative; conventional point suffixes associate ungrouped controls.
  return (
    item.metadata?.semantics?.config?.isPointOf ??
    (typeof item.name === 'string' ? item.name : '').replace(
      /_?(PowerUsage|Power|Energy|Usage|Target|Temperature|State|Volume|Brightness|Battery)$/i,
      ''
    )
  );
}

export function relatedOpenHABItem(
  item: OpenHABItem,
  items: Record<string, OpenHABItem>,
  match: (point: OpenHABItem) => boolean
): OpenHABItem | undefined {
  const source = openHABSourceId(item);
  return Object.values(items).find(
    (point) =>
      typeof point.name === 'string' &&
      point.name !== item.name &&
      openHABSourceId(point) === source &&
      match(point)
  );
}

export function openHABSensorClass(item: OpenHABItem): string | undefined {
  const dimension = item.type?.split(':')[1]?.toLowerCase();
  const text =
    `${item.category ?? ''} ${item.name} ${(item.tags ?? []).join(' ')} ${item.label ?? ''}`.toLowerCase();
  if (/battery/.test(text)) return 'battery';
  if (/co2|co₂|carbondioxide/.test(text)) return 'carbon_dioxide';
  if (/pm2[._]?5/.test(text)) return 'pm25';
  if (/tvoc|volatile/.test(text)) return 'volatile_organic_compounds';
  if (/soil.*moisture/.test(text)) return 'moisture';
  if (dimension && dimension !== 'dimensionless')
    return (
      (
        {
          speed: 'wind_speed',
          volume: /gas/.test(text) ? 'gas' : 'water',
          length: 'precipitation',
          illuminance: 'illuminance',
        } as Record<string, string>
      )[dimension] ?? dimension
    );
  if (/humidity/.test(text)) return 'humidity';
  if (item.type === 'DateTime') return 'timestamp';
  return undefined;
}

export function openHABSecurityState(item: OpenHABItem): Record<string, unknown> {
  const sensorClass = openHABSensorClass(item);
  const binary =
    item.type === 'Contact' || (item.type === 'Switch' && (item.tags ?? []).includes('Status'));
  const text = `${item.category ?? ''} ${item.label ?? ''} ${item.name}`.toLowerCase();
  const kind =
    sensorClass === 'battery'
      ? 'battery'
      : !binary
        ? undefined
        : /motion/.test(text)
          ? 'motion'
          : /presence|occupancy/.test(text)
            ? 'occupancy'
            : /smoke|fire/.test(text)
              ? 'smoke'
              : /\bco\b|_co$|carbon.?monoxide/.test(text)
                ? 'carbonMonoxide'
                : /water|leak/.test(text)
                  ? 'waterLeak'
                  : /freezer.*alarm|heat.*alarm|temperature.*alarm/.test(text)
                    ? 'safety'
                    : /gas/.test(text)
                      ? 'gas'
                      : item.type === 'Contact'
                        ? 'opening'
                        : 'problem';
  if (!kind) return {};
  const valid = binary
    ? ['OPEN', 'CLOSED', 'ON', 'OFF'].includes(item.state ?? '')
    : openHABNumber(item) !== undefined;
  const active = binary
    ? item.state === 'OPEN' || item.state === 'ON'
    : (openHABNumber(item) ?? 101) <= 20;
  const critical = ['smoke', 'carbonMonoxide', 'gas', 'safety'].includes(kind);
  return {
    securityKind: kind,
    securitySeverity: !valid
      ? 'unknown'
      : !active
        ? 'normal'
        : critical
          ? 'critical'
          : ['motion', 'occupancy'].includes(kind)
            ? 'active'
            : 'warning',
    status: !valid ? 'unavailable' : binary ? (active ? 'active' : 'clear') : 'measurement',
    entityType: binary ? 'binary_sensor' : 'sensor',
    ...(binary ? { value: valid ? active : null } : {}),
  };
}
