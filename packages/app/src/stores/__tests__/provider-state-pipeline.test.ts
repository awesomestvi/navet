import type { NavetEntity, NavetProviderRoom, NavetProviderState } from '@navet/core/types';
import { describe, expect, it } from 'vitest';
import {
  buildProviderScopedState,
  buildRoomDescriptors,
  collectProviderEntityEvents,
  replaceFlattenedProviderRecord,
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

  it('updates one device incrementally across a large provider snapshot', () => {
    const rooms: NavetProviderRoom[] = [];
    const entities = Array.from({ length: 1_024 }, (_, index) =>
      makeLight({
        id: `light.fixture_${index}`,
        canonicalId: `home_assistant:light.fixture_${index}`,
        externalId: `light.fixture_${index}`,
        name: `Fixture ${index}`,
        primaryState: true,
        attributes: { value: 'on' },
      })
    );
    const firstProviderState = makeProviderState({ entities, rooms });
    const first = buildProviderScopedState({
      providerId: 'home_assistant',
      providerState: firstProviderState,
    });
    const changedIndex = 700;
    const nextEntities = [...entities];
    nextEntities[changedIndex] = {
      ...(nextEntities[changedIndex] as NavetEntity),
      primaryState: false,
      attributes: { value: 'off' },
    };

    const second = buildProviderScopedState({
      providerId: 'home_assistant',
      providerState: makeProviderState({ entities: nextEntities, rooms }),
      previousState: first,
    });

    expect(second.entitiesByCanonicalId).not.toBe(first.entitiesByCanonicalId);
    expect(second.entityDeltaIds).toEqual(['home_assistant:light.fixture_700']);
    expect(second.entityLookupByCanonicalId).toBe(first.entityLookupByCanonicalId);
    expect(second.normalizedRoomsByCanonicalId).toBe(first.normalizedRoomsByCanonicalId);
    expect(second.deviceCollectionLocationsByCanonicalId).toBe(
      first.deviceCollectionLocationsByCanonicalId
    );
    expect(second.deviceCollection.lights).not.toBe(first.deviceCollection.lights);
    expect(second.deviceCollection.sensors).toBe(first.deviceCollection.sensors);
    expect(second.deviceCollection.lights[900]).toBe(first.deviceCollection.lights[900]);
    expect(second.deviceCollection.lights[changedIndex]).not.toBe(
      first.deviceCollection.lights[changedIndex]
    );
    expect(second.deviceCollection.lights[changedIndex]?.state).toBe(false);
  });

  it('returns the previous scoped state when the provider snapshot is unchanged', () => {
    const providerState = makeProviderState();
    const first = buildProviderScopedState({
      providerId: 'home_assistant',
      providerState,
    });

    expect(
      buildProviderScopedState({
        providerId: 'home_assistant',
        providerState,
        previousState: first,
      })
    ).toBe(first);
  });

  it('removes stale entity and room records during same-size replacements', () => {
    const first = buildProviderScopedState({
      providerId: 'home_assistant',
      providerState: makeProviderState(),
    });
    const hallLight = makeLight({
      id: 'light.hall',
      canonicalId: 'home_assistant:light.hall',
      externalId: 'light.hall',
      name: 'Hall',
      room: 'Hall',
    });
    const hallRoom = makeRoom({
      id: 'home_assistant:hall',
      canonicalId: 'home_assistant:hall',
      externalId: 'hall',
      name: 'Hall',
      normalizedName: 'hall',
      memberIds: [hallLight.canonicalId],
    });

    const second = buildProviderScopedState({
      providerId: 'home_assistant',
      providerState: makeProviderState({ entities: [hallLight], rooms: [hallRoom] }),
      previousState: first,
    });

    expect(second.entitiesByCanonicalId).toEqual({
      [hallLight.canonicalId]: hallLight,
    });
    expect(second.normalizedRoomsByCanonicalId).toEqual({
      [hallRoom.canonicalId]: hallRoom,
    });
    expect(second.roomsByCanonicalId).not.toHaveProperty('home_assistant:kitchen');
    expect(second.deviceCollection.lights.map((device) => device.id)).toEqual([
      hallLight.canonicalId,
    ]);
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

  it('keeps a flattened record stable when a provider wrapper contains the same values', () => {
    const kitchen = makeLight();
    const previousProviderRecord = { [kitchen.canonicalId]: kitchen };
    const flattenedRecord = {
      ...previousProviderRecord,
      'homey:socket-1': makeLight({
        id: 'socket-1',
        canonicalId: 'homey:socket-1',
        providerId: 'homey',
        externalId: 'socket-1',
      }),
    };

    expect(
      replaceFlattenedProviderRecord(flattenedRecord, previousProviderRecord, {
        ...previousProviderRecord,
      })
    ).toBe(flattenedRecord);
  });

  it('patches only changed provider values in a flattened record', () => {
    const kitchen = makeLight();
    const hall = makeLight({
      id: 'light.hall',
      canonicalId: 'home_assistant:light.hall',
      externalId: 'light.hall',
    });
    const homeySocket = makeLight({
      id: 'socket-1',
      canonicalId: 'homey:socket-1',
      providerId: 'homey',
      externalId: 'socket-1',
    });
    const flattenedRecord = {
      [kitchen.canonicalId]: kitchen,
      [hall.canonicalId]: hall,
      [homeySocket.canonicalId]: homeySocket,
    };
    const updatedKitchen = makeLight({ primaryState: false });

    const next = replaceFlattenedProviderRecord(
      flattenedRecord,
      { [kitchen.canonicalId]: kitchen, [hall.canonicalId]: hall },
      { [updatedKitchen.canonicalId]: updatedKitchen }
    );

    expect(next).not.toBe(flattenedRecord);
    expect(next).toEqual({
      [updatedKitchen.canonicalId]: updatedKitchen,
      [homeySocket.canonicalId]: homeySocket,
    });
    expect(next[homeySocket.canonicalId]).toBe(homeySocket);
  });

  it('applies a provider delta without enumerating the full provider records', () => {
    const kitchen = makeLight();
    const updatedKitchen = makeLight({ primaryState: false });
    const previousProviderRecord = new Proxy(
      { [kitchen.canonicalId]: kitchen },
      {
        ownKeys: () => {
          throw new Error('provider record was enumerated');
        },
      }
    );
    const nextProviderRecord = new Proxy(
      { [updatedKitchen.canonicalId]: updatedKitchen },
      {
        ownKeys: () => {
          throw new Error('provider record was enumerated');
        },
      }
    );

    const next = replaceFlattenedProviderRecord(
      { [kitchen.canonicalId]: kitchen },
      previousProviderRecord,
      nextProviderRecord,
      [kitchen.canonicalId]
    );

    expect(next[kitchen.canonicalId]).toBe(updatedKitchen);
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
