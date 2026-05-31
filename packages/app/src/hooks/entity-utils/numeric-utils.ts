/**
 * Numeric parsing and unit conversion utilities
 */

export function parseNumberish(value: unknown): number | null {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return null;
}

export function parseRoundedNumberish(value: unknown): number | null {
  const parsed = parseNumberish(value);
  return parsed === null ? null : Math.round(parsed);
}

export function toWatts(value: number, unit: unknown): number {
  if (typeof unit !== 'string') return value;
  switch (unit.toLowerCase()) {
    case 'kw':
      return value * 1000;
    case 'mw':
      return value * 1000000;
    default:
      return value;
  }
}

export function toVolts(value: number, unit: unknown): number {
  if (typeof unit !== 'string') return value;
  switch (unit.toLowerCase()) {
    case 'mv':
      return value / 1000;
    case 'kv':
      return value * 1000;
    default:
      return value;
  }
}

export function toKilowattHours(value: number, unit: unknown): number {
  if (typeof unit !== 'string') return value;
  switch (unit.toLowerCase()) {
    case 'wh':
      return value / 1000;
    case 'mwh':
      return value * 1000;
    default:
      return value;
  }
}
