/**
 * Small insertion-ordered LRU cache for derived browser data. Reading an entry
 * refreshes its recency; inserting beyond the limit evicts the least recently
 * used entry. Use this for values that are safe to recompute after eviction.
 */
export class LruCache<Key, Value> {
  readonly #entries = new Map<Key, Value>();

  constructor(
    readonly maxEntries: number,
    readonly onEvict?: (value: Value, key: Key) => void
  ) {
    if (!Number.isInteger(maxEntries) || maxEntries < 1) {
      throw new Error('LruCache maxEntries must be a positive integer');
    }
  }

  get size() {
    return this.#entries.size;
  }

  get(key: Key): Value | undefined {
    if (!this.#entries.has(key)) {
      return undefined;
    }

    const value = this.#entries.get(key) as Value;
    this.#entries.delete(key);
    this.#entries.set(key, value);
    return value;
  }

  set(key: Key, value: Value) {
    if (this.#entries.has(key)) {
      const previousValue = this.#entries.get(key) as Value;
      this.#entries.delete(key);
      if (previousValue !== value) {
        this.onEvict?.(previousValue, key);
      }
    }
    this.#entries.set(key, value);

    while (this.#entries.size > this.maxEntries) {
      const oldestKey = this.#entries.keys().next().value as Key | undefined;
      if (oldestKey === undefined) break;
      this.delete(oldestKey);
    }

    return this;
  }

  delete(key: Key) {
    if (!this.#entries.has(key)) {
      return false;
    }

    const value = this.#entries.get(key) as Value;
    this.#entries.delete(key);
    this.onEvict?.(value, key);
    return true;
  }

  clear() {
    if (this.onEvict) {
      for (const [key, value] of this.#entries) {
        this.onEvict(value, key);
      }
    }
    this.#entries.clear();
  }

  entries() {
    return this.#entries.entries();
  }
}
