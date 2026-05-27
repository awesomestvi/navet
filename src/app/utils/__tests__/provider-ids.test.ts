import { describe, expect, it } from 'vitest';
import {
  createProviderScopedId,
  createProviderScopedMetadata,
  getProviderNativeId,
  parseProviderScopedId,
} from '../provider-ids';

describe('provider-ids', () => {
  it('creates canonical provider-scoped ids', () => {
    expect(createProviderScopedId('home_assistant', 'light.kitchen')).toBe(
      'home_assistant:light.kitchen'
    );
  });

  it('parses canonical provider-scoped ids', () => {
    expect(parseProviderScopedId('homey:device-123')).toEqual({
      providerId: 'homey',
      nativeId: 'device-123',
    });
  });

  it('returns null for invalid provider-scoped ids', () => {
    expect(parseProviderScopedId('unknown:device-123')).toBeNull();
    expect(parseProviderScopedId('homey')).toBeNull();
  });

  it('builds metadata with both native and canonical ids', () => {
    expect(createProviderScopedMetadata('openhab', 'living-room-light')).toEqual({
      providerId: 'openhab',
      nativeId: 'living-room-light',
      canonicalId: 'openhab:living-room-light',
    });
  });

  it('extracts native ids without breaking legacy ids', () => {
    expect(getProviderNativeId('home_assistant:light.kitchen')).toBe('light.kitchen');
    expect(getProviderNativeId('light.kitchen')).toBe('light.kitchen');
  });
});
