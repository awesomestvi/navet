import { describe, expect, it, vi } from 'vitest';
import { storage } from '../storage';

describe('storage', () => {
  it('returns the default value for missing keys', () => {
    expect(storage.get('missing', 'fallback')).toBe('fallback');
  });

  it('round-trips JSON values through localStorage', () => {
    storage.set('settings', { theme: 'glass', compact: true });

    expect(storage.get('settings', null)).toEqual({ theme: 'glass', compact: true });
  });

  it('removes a single key', () => {
    storage.set('a', 1);
    storage.remove('a');

    expect(storage.get('a', null)).toBeNull();
  });

  it('clears all keys', () => {
    storage.set('a', 1);
    storage.set('b', 2);

    storage.clear();

    expect(storage.keys()).toEqual([]);
  });

  it('filters keys by prefix', () => {
    storage.set('navet:a', 1);
    storage.set('navet:b', 2);
    storage.set('other:c', 3);

    expect(storage.keys('navet:')).toEqual(['navet:a', 'navet:b']);
  });

  it('clears only matching prefixes', () => {
    storage.set('navet-a', 1);
    storage.set('ha-dashboard-b', 2);
    storage.set('hassTokens', 3);

    storage.clearByPrefixes(['navet-', 'ha-dashboard-']);

    expect(storage.get('navet-a', null)).toBeNull();
    expect(storage.get('ha-dashboard-b', null)).toBeNull();
    expect(storage.get('hassTokens', null)).toBe(3);
  });

  it('falls back when JSON parsing fails', () => {
    localStorage.setItem('broken', '{oops');

    expect(storage.get('broken', { ok: false })).toEqual({ ok: false });
  });

  it('swallows localStorage failures', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('disk full');
    });

    expect(() => storage.set('key', 'value')).not.toThrow();
    setItemSpy.mockRestore();
  });
});
