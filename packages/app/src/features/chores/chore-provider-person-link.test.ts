import type { PersonDevice } from '@navet/app/types/device.types';
import { describe, expect, it } from 'vitest';
import {
  getProviderPersonLinkId,
  resolveMatchingProviderPersonLinkId,
  resolveProviderAccountLinkId,
} from './chore-provider-person-link';

function person(overrides: Partial<PersonDevice> = {}): PersonDevice {
  return {
    id: 'home_assistant:person.alex',
    nativeId: 'person.alex',
    name: 'Alex',
    room: 'Unknown',
    location: 'Home',
    state: 'home',
    size: 'small',
    ...overrides,
  };
}

describe('provider person links', () => {
  it('uses the provider-native ID without exposing it to the person', () => {
    expect(getProviderPersonLinkId(person())).toBe('person.alex');
  });

  it('automatically resolves one case-insensitive name match', () => {
    expect(resolveMatchingProviderPersonLinkId('  ALEX ', [person()])).toBe('person.alex');
  });

  it('does not guess when names are ambiguous', () => {
    expect(
      resolveMatchingProviderPersonLinkId('Alex', [
        person(),
        person({ id: 'home_assistant:person.alex_2', nativeId: 'person.alex_2' }),
      ])
    ).toBeUndefined();
  });

  it('automatically links the signed-in provider account by name', () => {
    expect(resolveProviderAccountLinkId('Alex', { id: 'user-42', name: 'alex' })).toBe('user-42');
    expect(resolveProviderAccountLinkId('Maya', { id: 'user-42', name: 'Alex' })).toBeUndefined();
  });

  it('preserves an existing account link when a profile name changes', () => {
    expect(resolveProviderAccountLinkId('Maya', null, ' user-42 ')).toBe('user-42');
  });
});
