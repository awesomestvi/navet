import { makeTaskEntity } from '@navet/app/features/tasks/test-utils';
import {
  automationEntityFactory,
  automationEntityFixtures,
} from '@navet/app/test/fixtures/home-assistant/entities/automation';
import { scriptEntityFixtures } from '@navet/app/test/fixtures/home-assistant/entities/script';
import { describe, expect, it } from 'vitest';
import { mapAutomationTasks } from '../map-automation-tasks';

describe('mapAutomationTasks', () => {
  it('maps only automation entities', () => {
    const tasks = mapAutomationTasks({
      entities: {
        [automationEntityFixtures.normal.entity_id]: makeTaskEntity(
          automationEntityFixtures.normal
        ),
        [scriptEntityFixtures.normal.entity_id]: makeTaskEntity(scriptEntityFixtures.normal),
      },
      rooms: [],
      devices: [],
      entityReferences: [],
      locale: 'en-US',
    });

    expect(tasks).toEqual([
      expect.objectContaining({
        id: automationEntityFixtures.normal.entity_id,
        name: 'Welcome Home',
        enabled: true,
        status: 'active',
      }),
    ]);
  });

  it('resolves display name, room, and last_triggered metadata from Home Assistant registries', () => {
    const tasks = mapAutomationTasks({
      entities: {
        [automationEntityFixtures.normal.entity_id]: makeTaskEntity(
          automationEntityFixtures.normal
        ),
      },
      rooms: [{ id: 'hall', name: 'Hallway' }],
      devices: [{ id: 'device-1', roomId: 'hall' }],
      entityReferences: [
        { entityId: automationEntityFixtures.normal.entity_id, deviceId: 'device-1' },
      ],
      locale: 'en-US',
    });

    expect(tasks).toEqual([
      expect.objectContaining({
        id: automationEntityFixtures.normal.entity_id,
        room: 'Hallway',
        lastTriggered: '2026-05-04T07:15:00.000Z',
        lastTriggeredDate: new Date('2026-05-04T07:15:00.000Z'),
      }),
    ]);
  });

  it('derives recent, next run, and attention metadata without provider-specific fields', () => {
    const recent = automationEntityFactory({
      friendly_name: 'Recent routine',
      last_triggered: '2026-05-04T07:15:00.000Z',
      next_run: '2026-05-04T09:15:00.000Z',
    });
    recent.entity_id = 'automation.recent';
    const unavailable = automationEntityFactory({ friendly_name: 'Unavailable routine' });
    unavailable.entity_id = 'automation.unavailable';
    unavailable.state = 'unavailable';

    const tasks = mapAutomationTasks({
      entities: {
        [recent.entity_id]: makeTaskEntity(recent),
        [unavailable.entity_id]: makeTaskEntity(unavailable),
      },
      rooms: [],
      devices: [],
      entityReferences: [],
      locale: 'en-US',
      now: new Date('2026-05-04T08:15:00.000Z'),
    });

    expect(tasks).toEqual([
      expect.objectContaining({
        id: 'automation.recent',
        status: 'active',
        isRecentlyTriggered: true,
        nextRunLabel: '2026-05-04T09:15:00.000Z',
      }),
      expect.objectContaining({
        id: 'automation.unavailable',
        status: 'attention',
        needsAttention: true,
        attentionReason: 'unavailable',
      }),
    ]);
  });

  it('sorts enabled automations first and then alphabetically', () => {
    const alpha = automationEntityFactory({ friendly_name: 'Alpha' });
    alpha.entity_id = 'automation.alpha';
    alpha.state = 'on';
    const beta = automationEntityFactory({ friendly_name: 'Beta' });
    beta.entity_id = 'automation.beta';
    beta.state = 'off';
    const zulu = automationEntityFactory({ friendly_name: 'Zulu' });
    zulu.entity_id = 'automation.zulu';
    zulu.state = 'on';

    const tasks = mapAutomationTasks({
      entities: {
        [beta.entity_id]: makeTaskEntity(beta),
        [alpha.entity_id]: makeTaskEntity(alpha),
        [zulu.entity_id]: makeTaskEntity(zulu),
      },
      rooms: [],
      devices: [],
      entityReferences: [],
      locale: 'en-US',
    });

    expect(tasks.map((task) => task.id)).toEqual([
      'automation.alpha',
      'automation.zulu',
      'automation.beta',
    ]);
  });

  it('falls back safely when friendly_name and optional metadata are missing', () => {
    const entity = automationEntityFactory({
      friendly_name: undefined,
      last_triggered: undefined,
      description: undefined,
      mode: undefined,
      current: undefined,
    });

    const tasks = mapAutomationTasks({
      entities: {
        [entity.entity_id]: makeTaskEntity(entity),
      },
      rooms: [],
      devices: [],
      entityReferences: [],
      locale: 'en-US',
    });

    expect(tasks).toEqual([
      expect.objectContaining({
        id: entity.entity_id,
        name: entity.entity_id,
        lastTriggered: undefined,
        lastTriggeredDate: undefined,
        isRecentlyTriggered: false,
        description: undefined,
        mode: undefined,
        currentRuns: undefined,
        nextRunLabel: undefined,
      }),
    ]);
  });

  it('preserves unavailable automations and optional description/current metadata', () => {
    const entity = automationEntityFactory({
      friendly_name: 'Arrival',
      description: 'Turns on hallway lights after sunset.',
      mode: 'single',
      current: 1,
    });
    entity.entity_id = 'automation.arrival';
    entity.state = 'unavailable';

    const tasks = mapAutomationTasks({
      entities: {
        [entity.entity_id]: makeTaskEntity(entity),
      },
      rooms: [],
      devices: [],
      entityReferences: [],
      locale: 'en-US',
    });

    expect(tasks[0]).toMatchObject({
      id: 'automation.arrival',
      enabled: false,
      status: 'attention',
      state: 'unavailable',
      needsAttention: true,
      attentionReason: 'unavailable',
      description: 'Turns on hallway lights after sunset.',
      mode: 'single',
      currentRuns: 1,
    });
  });
});
