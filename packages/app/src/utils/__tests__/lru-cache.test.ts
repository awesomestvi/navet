import { describe, expect, it, vi } from 'vitest';
import { LruCache } from '../lru-cache';

describe('LruCache', () => {
  it('evicts the least recently used entry when the limit is exceeded', () => {
    const cache = new LruCache<string, number>(2);
    cache.set('first', 1).set('second', 2);

    expect(cache.get('first')).toBe(1);
    cache.set('third', 3);

    expect(cache.get('second')).toBeUndefined();
    expect(cache.get('first')).toBe(1);
    expect(cache.get('third')).toBe(3);
    expect(cache.size).toBe(2);
  });

  it('rejects invalid limits so caches cannot silently become unbounded', () => {
    expect(() => new LruCache(0)).toThrow('positive integer');
    expect(() => new LruCache(Number.POSITIVE_INFINITY)).toThrow('positive integer');
  });

  it('releases entries when they are evicted, deleted, replaced, or cleared', () => {
    const onEvict = vi.fn();
    const cache = new LruCache<string, number>(2, onEvict);

    cache.set('first', 1).set('second', 2).set('third', 3);
    cache.set('second', 20);
    cache.delete('third');
    cache.clear();

    expect(onEvict.mock.calls).toEqual([
      [1, 'first'],
      [2, 'second'],
      [3, 'third'],
      [20, 'second'],
    ]);
  });
});
