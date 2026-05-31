import { makeEntityFixtures, makeHassEntityFixture } from '../shared';

export const scriptEntityFactory = (overrides: Record<string, unknown> = {}) =>
  makeHassEntityFixture({
    entityId: 'script.good_morning',
    state: 'off',
    attributes: {
      friendly_name: 'Good Morning',
      mode: 'single',
      current: 0,
      ...overrides,
    },
  });

export const scriptEntityFixtures = makeEntityFixtures(
  'script',
  'good_morning',
  scriptEntityFactory().attributes
);
