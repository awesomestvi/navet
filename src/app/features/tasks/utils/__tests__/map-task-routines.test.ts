import { describe, expect, it } from 'vitest';
import { makeTaskEntity } from '@/app/features/tasks/test-utils';
import { mapTaskRoutines } from '../map-task-routines';

describe('mapTaskRoutines', () => {
  it('maps automations, scenes, and scripts into separate routine surfaces', () => {
    const routines = mapTaskRoutines({
      entities: {
        'automation.arrival': makeTaskEntity({
          entity_id: 'automation.arrival',
          state: 'on',
          attributes: { friendly_name: 'Arrival' },
        }),
        'scene.movie': makeTaskEntity({
          entity_id: 'scene.movie',
          state: 'scening',
          attributes: { friendly_name: 'Movie time' },
        }),
        'script.goodnight': makeTaskEntity({
          entity_id: 'script.goodnight',
          state: 'off',
          attributes: { friendly_name: 'Good night' },
        }),
        'light.kitchen': makeTaskEntity({
          entity_id: 'light.kitchen',
          state: 'on',
          attributes: { friendly_name: 'Kitchen light' },
        }),
      },
      rooms: [],
      devices: [],
      entityReferences: [],
      locale: 'en-US',
    });

    expect(routines.automations).toMatchObject([
      {
        id: 'automation.arrival',
        type: 'automation',
        name: 'Arrival',
        enabled: true,
      },
    ]);
    expect(routines.quickActions).toEqual([
      {
        id: 'scene.movie',
        type: 'scene',
        name: 'Movie time',
        room: 'Unassigned',
        state: 'scening',
      },
      {
        id: 'script.goodnight',
        type: 'script',
        name: 'Good night',
        room: 'Unassigned',
        state: 'off',
      },
    ]);
  });

  it('resolves quick action rooms through the registry', () => {
    const routines = mapTaskRoutines({
      entities: {
        'scene.movie': makeTaskEntity({
          entity_id: 'scene.movie',
          state: 'scening',
          attributes: { friendly_name: 'Movie time' },
        }),
      },
      rooms: [{ id: 'living', name: 'Living Room' }],
      devices: [{ id: 'device-1', roomId: 'living' }],
      entityReferences: [{ entityId: 'scene.movie', deviceId: 'device-1' }],
      locale: 'en-US',
    });

    expect(routines.quickActions[0]).toMatchObject({
      id: 'scene.movie',
      room: 'Living Room',
    });
  });
});
