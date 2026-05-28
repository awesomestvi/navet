import { describe, expect, it } from 'vitest';
import {
  ensureCanonicalEntityId,
  ensureCanonicalEntityIds,
  isLegacyHomeAssistantEntityId,
  normalizePersistedEntityRecord,
} from '../provider-entity-id';

describe('provider-entity-id', () => {
  it('canonicalizes legacy Home Assistant entity ids', () => {
    expect(ensureCanonicalEntityId('light.kitchen')).toBe('home_assistant:light.kitchen');
  });

  it('keeps already-scoped ids stable', () => {
    expect(ensureCanonicalEntityId('homey:switch_1')).toBe('homey:switch_1');
  });

  it('does not rewrite custom non-entity ids', () => {
    expect(ensureCanonicalEntityId('custom-card-123')).toBe('custom-card-123');
    expect(isLegacyHomeAssistantEntityId('custom-card-123')).toBe(false);
  });

  it('normalizes arrays and records of persisted ids', () => {
    expect(ensureCanonicalEntityIds(['light.kitchen', 'homey:switch_1'])).toEqual([
      'home_assistant:light.kitchen',
      'homey:switch_1',
    ]);

    expect(
      normalizePersistedEntityRecord({
        'light.kitchen': 'small',
        'homey:switch_1': 'medium',
      })
    ).toEqual({
      'home_assistant:light.kitchen': 'small',
      'homey:switch_1': 'medium',
    });
  });
});
