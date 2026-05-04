import { describe, expect, it } from 'vitest';
import { makeHassEntity } from '../../test-utils';
import { mapAutomationTasks } from '../map-automation-tasks';

describe('mapAutomationTasks', () => {
  it('maps only automation entities', () => {
    const tasks = mapAutomationTasks({
      entities: {
        'automation.good_morning': makeHassEntity({
          entity_id: 'automation.good_morning',
          state: 'on',
          attributes: { friendly_name: 'Good morning' },
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

    expect(tasks).toEqual([
      {
        id: 'automation.good_morning',
        name: 'Good morning',
        room: 'Unassigned',
        enabled: true,
        state: 'on',
        lastTriggered: undefined,
      },
    ]);
  });

  it('resolves display name, room, and last triggered metadata', () => {
    const tasks = mapAutomationTasks({
      entities: {
        'automation.welcome_home': makeHassEntity({
          entity_id: 'automation.welcome_home',
          state: 'off',
          attributes: {
            friendly_name: 'Welcome home',
            last_triggered: '2026-05-04T07:15:00.000Z',
          },
        }),
      },
      areas: [{ area_id: 'hall', name: 'Hallway' }],
      deviceRegistry: [{ id: 'device-1', area_id: 'hall' }],
      entityRegistry: [{ entity_id: 'automation.welcome_home', device_id: 'device-1' }],
      locale: 'en-US',
    });

    expect(tasks).toEqual([
      {
        id: 'automation.welcome_home',
        name: 'Welcome home',
        room: 'Hallway',
        enabled: false,
        state: 'off',
        lastTriggered: '2026-05-04T07:15:00.000Z',
        description: undefined,
        mode: undefined,
        currentRuns: undefined,
      },
    ]);
  });

  it('sorts enabled automations first and then alphabetically', () => {
    const tasks = mapAutomationTasks({
      entities: {
        'automation.beta': makeHassEntity({
          entity_id: 'automation.beta',
          state: 'off',
          attributes: { friendly_name: 'Beta' },
        }),
        'automation.alpha': makeHassEntity({
          entity_id: 'automation.alpha',
          state: 'on',
          attributes: { friendly_name: 'Alpha' },
        }),
        'automation.zulu': makeHassEntity({
          entity_id: 'automation.zulu',
          state: 'on',
          attributes: { friendly_name: 'Zulu' },
        }),
      },
      areas: [],
      deviceRegistry: [],
      entityRegistry: [],
      locale: 'en-US',
    });

    expect(tasks.map((task) => task.id)).toEqual([
      'automation.alpha',
      'automation.zulu',
      'automation.beta',
    ]);
  });

  it('falls back safely when optional attributes are missing', () => {
    const tasks = mapAutomationTasks({
      entities: {
        'automation.night_mode': makeHassEntity({
          entity_id: 'automation.night_mode',
          state: 'unavailable',
          attributes: {},
        }),
      },
      areas: [],
      deviceRegistry: [],
      entityRegistry: [],
      locale: 'en-US',
    });

    expect(tasks).toEqual([
      {
        id: 'automation.night_mode',
        name: 'automation.night_mode',
        room: 'Unassigned',
        enabled: false,
        state: 'unavailable',
        lastTriggered: undefined,
        description: undefined,
        mode: undefined,
        currentRuns: undefined,
      },
    ]);
  });

  it('captures optional description and runtime metadata when present', () => {
    const tasks = mapAutomationTasks({
      entities: {
        'automation.arrival': makeHassEntity({
          entity_id: 'automation.arrival',
          state: 'on',
          attributes: {
            friendly_name: 'Arrival',
            description: 'Turns on hallway lights after sunset.',
            mode: 'single',
            current: 1,
          },
        }),
      },
      areas: [],
      deviceRegistry: [],
      entityRegistry: [],
      locale: 'en-US',
    });

    expect(tasks[0]).toMatchObject({
      description: 'Turns on hallway lights after sunset.',
      mode: 'single',
      currentRuns: 1,
    });
  });
});
