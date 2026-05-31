/**
 * Type guards for Home Assistant and API responses
 */

export function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !Number.isNaN(value);
}

export function isArray<T>(value: unknown, itemGuard?: (item: unknown) => item is T): value is T[] {
  if (!Array.isArray(value)) {
    return false;
  }

  if (itemGuard) {
    return value.every(itemGuard);
  }

  return true;
}

export function isStringRecord(value: unknown): value is Record<string, string> {
  if (!isRecord(value)) {
    return false;
  }

  return Object.values(value).every(isString);
}

export function isNumberRecord(value: unknown): value is Record<string, number> {
  if (!isRecord(value)) {
    return false;
  }

  return Object.values(value).every(isNumber);
}

export function hasProperty<T extends string>(
  value: unknown,
  property: T
): value is { [K in T]: unknown } {
  return isRecord(value) && property in value;
}

export function hasStringProperty<T extends string>(
  value: unknown,
  property: T
): value is { [K in T]: string } {
  return hasProperty(value, property) && isString(value[property]);
}

export function hasNumberProperty<T extends string>(
  value: unknown,
  property: T
): value is { [K in T]: number } {
  return hasProperty(value, property) && isNumber(value[property]);
}

export function hasArrayProperty<T extends string>(
  value: unknown,
  property: T
): value is { [K in T]: unknown[] } {
  return hasProperty(value, property) && Array.isArray(value[property]);
}
