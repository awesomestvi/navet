import { makeEntityFixtures, makeHassEntityFixture } from '../shared';

export const todoEntityFactory = (overrides: Record<string, unknown> = {}) =>
  makeHassEntityFixture({
    entityId: 'todo.household',
    state: '2',
    attributes: {
      friendly_name: 'Household Tasks',
      supported_features: 15,
      items: [
        { uid: '1', summary: 'Take out recycling', status: 'needs_action' },
        { uid: '2', summary: 'Clean hallway', status: 'completed' },
      ],
      ...overrides,
    },
  });

export const todoEntityFixtures = makeEntityFixtures(
  'todo',
  'household',
  todoEntityFactory().attributes
);
