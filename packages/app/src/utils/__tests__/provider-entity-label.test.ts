import { describe, expect, it } from 'vitest';
import { getProviderEntityTypeLabel } from '../provider-entity-label';

describe('provider-entity-label', () => {
  it('prepends the provider label for provider-scoped entity ids', () => {
    expect(getProviderEntityTypeLabel('home_assistant:light.kitchen', 'Light')).toBe(
      'Home Assistant: Light'
    );
    expect(getProviderEntityTypeLabel('homey:light-1', 'Light')).toBe('Homey: Light');
    expect(getProviderEntityTypeLabel('openhab:KitchenLight', 'Light')).toBe('openHAB: Light');
  });

  it('returns the plain entity type when the provider cannot be resolved', () => {
    expect(getProviderEntityTypeLabel('light.kitchen', 'Light')).toBe('Light');
    expect(getProviderEntityTypeLabel(undefined, 'Light')).toBe('Light');
  });

  it('can suppress provider prefixes for single-provider layouts', () => {
    expect(getProviderEntityTypeLabel('home_assistant:light.kitchen', 'Light', false)).toBe(
      'Light'
    );
    expect(getProviderEntityTypeLabel('homey:light-1', 'Light', false)).toBe('Light');
  });

  it('returns undefined when the entity type is missing', () => {
    expect(getProviderEntityTypeLabel('home_assistant:light.kitchen', undefined)).toBeUndefined();
  });
});
