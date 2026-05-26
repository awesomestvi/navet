import { describe, expect, it } from 'vitest';
import { makeHassEntity } from '@/app/features/tasks/test-utils';
import { mapTaskRoutines } from '../map-task-routines';

describe('mapTaskRoutines', () => {
  it('maps automations, scenes, and scripts into separate routine surfaces', () => {
    const routines = mapTaskRoutines({
      entities: {
        'automation.arrival': makeHassEntity({
          entity_id: 'automation.arrival',
          state: 'on',
          attributes: { friendly_name: 'Arrival' },
        }),
        'scene.movie': makeHassEntity({
          entity_id: 'scene.movie',
          state: 'scening',
          attributes: { friendly_name: 'Movie time' },
        }),
        'script.goodnight': makeHassEntity({
          entity_id: 'script.goodnight',
          state: 'off',
          attributes: { friendly_name: 'Good night' },
        }),
        'light.kitchen': makeHassEntity({
          entity_id: 'light.kitchen',
          state: 'on',
          attributes: { friendly_name: 'Kitchen light' },
        }),
      },
      areas: [],
      deviceRegistry: [],
      entityRegistry: [],
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
        'scene.movie': makeHassEntity({
          entity_id: 'scene.movie',
          state: 'scening',
          attributes: { friendly_name: 'Movie time' },
        }),
      },
      areas: [{ area_id: 'living', name: 'Living Room' }],
      deviceRegistry: [{ id: 'device-1', area_id: 'living' }],
      entityRegistry: [{ entity_id: 'scene.movie', device_id: 'device-1' }],
      locale: 'en-US',
    });

    expect(routines.quickActions[0]).toMatchObject({
      id: 'scene.movie',
      room: 'Living Room',
    });
  });
});
