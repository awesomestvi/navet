/** Reject property names and identifiers that can resolve inherited object properties. */
export function setOwnRecordValue(record: object, key: string, value: unknown): void {
  if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
    throw new Error('Unsafe record key');
  }
  Object.defineProperty(record, key, {
    value,
    enumerable: true,
    writable: true,
    configurable: true,
  });
}

export function assertSafeRecord(value: unknown, depth?: number): void {
  if (!value || typeof value !== 'object') return;
  const currentDepth = depth || 0;
  if (currentDepth > 64) throw new Error('Record nesting is too deep');
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index];
    const entry = record[key];
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      throw new Error('Unsafe record key');
    }
    if (/^(?:id|.*Id|.*Ids)$/.test(key)) {
      const ids = Array.isArray(entry) ? entry : [entry];
      for (let idIndex = 0; idIndex < ids.length; idIndex += 1) {
        const id = ids[idIndex];
        if (id === '__proto__' || id === 'constructor' || id === 'prototype') {
          throw new Error('Unsafe record identifier');
        }
      }
    }
    assertSafeRecord(entry, currentDepth + 1);
  }
}
