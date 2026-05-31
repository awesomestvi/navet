import { makeEntityFixtures, makeHassEntityFixture } from '../shared';

export const selectEntityFactory = (overrides: Record<string, unknown> = {}) =>
  makeHassEntityFixture({
    entityId: 'select.air_purifier_mode',
    state: 'auto',
    attributes: {
      friendly_name: 'Air Purifier Mode',
      options: ['auto', 'sleep', 'turbo'],
      ...overrides,
    },
  });

export const selectEntityFixtures = makeEntityFixtures(
  'select',
  'air_purifier_mode',
  selectEntityFactory().attributes
);
