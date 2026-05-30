export function areArraysEqual<T>(
  left: readonly T[],
  right: readonly T[],
  itemEquals: (leftItem: T, rightItem: T) => boolean = Object.is
): boolean {
  if (left === right) {
    return true;
  }

  if (left.length !== right.length) {
    return false;
  }

  for (let index = 0; index < left.length; index += 1) {
    if (!itemEquals(left[index] as T, right[index] as T)) {
      return false;
    }
  }

  return true;
}

export function areStringArraysEqual(left: readonly string[], right: readonly string[]): boolean {
  return areArraysEqual(left, right, (leftItem, rightItem) => leftItem === rightItem);
}

export function areRecordKeysEqual(
  left: Record<string, unknown>,
  right: Record<string, unknown>
): boolean {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);

  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  for (const key of leftKeys) {
    if (!(key in right)) {
      return false;
    }
  }

  return true;
}

export function areRecordValuesEqual<T>(
  left: Record<string, T>,
  right: Record<string, T>,
  valueEquals: (leftValue: T, rightValue: T) => boolean = Object.is
): boolean {
  if (left === right) {
    return true;
  }

  if (!areRecordKeysEqual(left, right)) {
    return false;
  }

  for (const key of Object.keys(left)) {
    if (!valueEquals(left[key] as T, right[key] as T)) {
      return false;
    }
  }

  return true;
}

export function areDataEqual(left: unknown, right: unknown): boolean {
  if (left === right) {
    return true;
  }

  if (left == null || right == null) {
    return false;
  }

  if (Array.isArray(left) && Array.isArray(right)) {
    return areArraysEqual(left, right, areDataEqual);
  }

  if (typeof left === 'object' && typeof right === 'object') {
    const leftRecord = left as Record<string, unknown>;
    const rightRecord = right as Record<string, unknown>;

    if (!areRecordKeysEqual(leftRecord, rightRecord)) {
      return false;
    }

    for (const [key, value] of Object.entries(leftRecord)) {
      if (!areDataEqual(value, rightRecord[key])) {
        return false;
      }
    }

    return true;
  }

  return false;
}
