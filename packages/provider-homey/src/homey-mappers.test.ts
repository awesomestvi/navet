import { describe, expect, it } from 'vitest';
import { buildHomeyProviderRooms, mapHomeySnapshotToNavetEntities } from './homey-mappers';
import type { HomeySnapshot } from './homey-types';

function createSnapshot(zoneName: string): HomeySnapshot {
  return {
    connected: true,
    zones: {
      zone_kitchen: {
        id: 'zone_kitchen',
        name: zoneName,
      },
      zone_empty: {
        id: 'zone_empty',
        name: 'Empty room',
      },
    },
    devices: {
      kitchen_light: {
        id: 'kitchen_light',
        name: 'Kitchen light',
        class: 'light',
        zone: 'zone_kitchen',
        capabilities: ['onoff'],
        capabilitiesObj: {
          onoff: { value: true },
        },
      },
      loose_switch: {
        id: 'loose_switch',
        name: 'Loose switch',
        class: 'socket',
        capabilities: ['onoff'],
        capabilitiesObj: {
          onoff: { value: false },
        },
      },
    },
  };
}

describe('homey-mappers room identity', () => {
  it('keeps membership stable when a zone display name changes', () => {
    const snapshot = createSnapshot('Cooking space');
    const entities = mapHomeySnapshotToNavetEntities(snapshot);
    const rooms = buildHomeyProviderRooms(snapshot);

    expect(entities.find((entity) => entity.externalId === 'kitchen_light')).toEqual(
      expect.objectContaining({
        room: 'Cooking space',
        roomId: 'homey:zone_kitchen',
      })
    );
    expect(entities.find((entity) => entity.externalId === 'loose_switch')).toEqual(
      expect.objectContaining({
        room: 'Unassigned',
        roomId: undefined,
      })
    );
    expect(rooms).toEqual([
      expect.objectContaining({
        canonicalId: 'homey:zone_kitchen',
        name: 'Cooking space',
        memberIds: ['homey:kitchen_light'],
      }),
      expect.objectContaining({
        canonicalId: 'homey:zone_empty',
        name: 'Empty room',
        memberIds: [],
      }),
    ]);
  });
});
