import { makeEntityFixtures, makeHassEntityFixture } from '../shared';

export const lockEntityFactory = (overrides: Record<string, unknown> = {}) =>
  makeHassEntityFixture({
    entityId: 'lock.front_door',
    state: 'locked',
    attributes: {
      friendly_name: 'Front Door',
      changed_by: 'user-1',
      code_format: null,
      ...overrides,
    },
  });

export const lockEntityFixtures = makeEntityFixtures(
  'lock',
  'front_door',
  lockEntityFactory().attributes
);
