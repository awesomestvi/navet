import type { NavetEntity, NavetProviderRoom, NavetProviderState } from '@navet/core/types';
import { describe, expect, it } from 'vitest';
import {
  buildProviderScopedState,
  buildRoomDescriptors,
  collectProviderEntityEvents,
} from '../provider-state-pipeline';

function makeLight(overrides: Partial<NavetEntity> = {}): NavetEntity {
  return {
    id: 'light.kitchen',
    canonicalId: 'home_assistant:light.kitchen',
    providerId: 'home_assistant',
    externalId: 'light.kitchen',
    type: 'light',
    name: 'Kitchen',
    room: 'Kitchen',
    primaryState: true,
    availability: 'available',
    attributes: {},
    capabilities: ['toggle'],
    ...overrides,
  };
}

function makeRoom(overrides: Partial<NavetProviderRoom> = {}): NavetProviderRoom {
  return {
    id: 'home_assistant:kitchen',
    canonicalId: 'home_assistant:kitchen',
    providerId: 'home_assistant',
    externalId: 'kitchen',
    name: 'Kitchen',
    normalizedName: 'kitchen',
    memberIds: ['home_assistant:light.kitchen'],
    ...overrides,
  };
}

function makeProviderState(overrides: Partial<NavetProviderState> = {}): NavetProviderState {
  return {
    providerId: 'home_assistant',
    connected: true,
    entities: [makeLight()],
    rooms: [makeRoom()],
    ...overrides,
  };
}

describe('provider-state pipeline', () => {
  it('reuses stable entities, views, lookup, and device collections', () => {
    const first = buildProviderScopedState({
      providerId: 'home_assistant',
      providerState: makeProviderState(),
    });
    const second = buildProviderScopedState({
      providerId: 'home_assistant',
      providerState: makeProviderState(),
      previousState: first,
    });

    expect(second.entitiesByCanonicalId).toBe(first.entitiesByCanonicalId);
    expect(second.entityViewsByCanonicalId).toBe(first.entityViewsByCanonicalId);
    expect(second.entityLookupByCanonicalId).toBe(first.entityLookupByCanonicalId);
    expect(second.deviceCollection).toBe(first.deviceCollection);
    expect(second.entityLookupByCanonicalId['light.kitchen']).toBe('home_assistant:light.kitchen');
    expect(second.entityLookupByCanonicalId['home_assistant:light.kitchen']).toBe(
      'home_assistant:light.kitchen'
    );
  });

  it('updates only changed provider state slices', () => {
    const previous = buildProviderScopedState({
      providerId: 'home_assistant',
      providerState: makeProviderState(),
    });
    const next = buildProviderScopedState({
      providerId: 'home_assistant',
      providerState: makeProviderState({
        entities: [makeLight({ primaryState: false })],
      }),
      previousState: previous,
    });

    expect(next.entitiesByCanonicalId).not.toBe(previous.entitiesByCanonicalId);
    expect(next.normalizedRoomsByCanonicalId).toBe(previous.normalizedRoomsByCanonicalId);
    expect(next.roomsByCanonicalId).toBe(previous.roomsByCanonicalId);
  });

  it('collects add, update, and remove provider events', () => {
    const previous = {
      'home_assistant:light.kitchen': makeLight(),
      'home_assistant:light.hall': makeLight({
        id: 'light.hall',
        canonicalId: 'home_assistant:light.hall',
        externalId: 'light.hall',
        name: 'Hall',
      }),
    };
    const next = {
      'home_assistant:light.kitchen': makeLight({ primaryState: false }),
      'home_assistant:light.office': makeLight({
        id: 'light.office',
        canonicalId: 'home_assistant:light.office',
        externalId: 'light.office',
        name: 'Office',
      }),
    };

    expect(
      collectProviderEntityEvents('home_assistant', previous, next).map((event) => event.type)
    ).toEqual(['entity_updated', 'entity_added', 'entity_removed']);
  });

  it('merges provider-managed and derived room descriptors', () => {
    const descriptors = buildRoomDescriptors({
      homeAssistantAreas: [{ area_id: 'kitchen', name: 'Kitchen' }],
      homeyZones: {
        kitchen: { id: 'homey-kitchen', name: 'Kitchen' },
      },
      normalizedRoomsByCanonicalId: {
        'openhab:kitchen': makeRoom({
          id: 'openhab:kitchen',
          canonicalId: 'openhab:kitchen',
          providerId: 'openhab',
          externalId: 'kitchen',
        }),
      },
    });

    expect(descriptors).toHaveLength(1);
    expect(descriptors[0]).toMatchObject({
      id: 'kitchen',
      providerIds: ['home_assistant', 'homey', 'openhab'],
      memberIds: ['home_assistant:light.kitchen'],
    });
    expect(descriptors[0].sources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ providerId: 'home_assistant', nativeId: 'kitchen' }),
        expect.objectContaining({ providerId: 'homey', nativeId: 'homey-kitchen' }),
        expect.objectContaining({ providerId: 'openhab', nativeId: 'kitchen' }),
      ])
    );
  });
});
