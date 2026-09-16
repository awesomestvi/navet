import { describe, expect, it } from 'vitest';
import { buildOpenHABProviderRooms, mapOpenHABSnapshotToNavetEntities } from './openhab-mappers';
import type { OpenHABSnapshot } from './openhab-types';

function createSnapshot(locationLabel: string): OpenHABSnapshot {
  return {
    connected: true,
    items: {
      Kitchen: {
        name: 'Kitchen',
        label: locationLabel,
        type: 'Group',
        tags: ['Location', 'Kitchen'],
      },
      KitchenLight: {
        name: 'KitchenLight',
        label: 'Kitchen light',
        type: 'Switch',
        state: 'ON',
        tags: ['Light'],
        groupNames: ['Kitchen'],
      },
      LooseSensor: {
        name: 'LooseSensor',
        label: 'Loose sensor',
        type: 'Number:Temperature',
        state: '21 °C',
      },
    },
  };
}

describe('openhab-mappers room identity', () => {
  it.each([
    ['Switch', 'ON', 'locked', true],
    ['Switch', 'OFF', 'unlocked', false],
    ['String', 'LOCKED', 'locked', true],
    ['String', 'UNLOCKED', 'unlocked', false],
    ['Switch', 'UNDEF', 'unknown', undefined],
    ['Switch', 'NULL', 'unknown', undefined],
  ] as const)(
    'normalizes %s lock state %s for provider-confirmed card updates',
    (type, state, value, locked) => {
      const [entity] = mapOpenHABSnapshotToNavetEntities({
        connected: true,
        items: {
          FrontDoorLock: { name: 'FrontDoorLock', type, state, category: 'lock', tags: ['Lock'] },
        },
      });
      expect(entity).toMatchObject({
        type: 'lock',
        primaryState: value,
        availability: value === 'unknown' ? 'unknown' : 'available',
        attributes: { value, locked },
      });
    }
  );

  it('uses the semantic location item ID instead of its mutable label', () => {
    const snapshot = createSnapshot('Cooking space');
    const entities = mapOpenHABSnapshotToNavetEntities(snapshot);
    const rooms = buildOpenHABProviderRooms(snapshot);

    expect(entities.find((entity) => entity.externalId === 'KitchenLight')).toEqual(
      expect.objectContaining({
        room: 'Cooking space',
        roomId: 'openhab:Kitchen',
      })
    );
    expect(entities.find((entity) => entity.externalId === 'LooseSensor')).toEqual(
      expect.objectContaining({
        room: 'Unassigned',
        roomId: undefined,
      })
    );
    expect(rooms).toEqual([
      expect.objectContaining({
        canonicalId: 'openhab:Kitchen',
        externalId: 'Kitchen',
        name: 'Cooking space',
        memberIds: ['openhab:KitchenLight'],
      }),
    ]);
  });
});
