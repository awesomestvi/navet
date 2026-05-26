import { makeEntityFixtures, makeHassEntityFixture } from '../shared';

export const fanEntityFactory = (overrides: Record<string, unknown> = {}) =>
  makeHassEntityFixture({
    entityId: 'fan.bedroom',
    state: 'on',
    attributes: {
      friendly_name: 'Bedroom Fan',
      percentage: 66,
      percentage_step: 33,
      preset_modes: ['auto', 'sleep'],
      ...overrides,
    },
  });

export const fanEntityFixtures = makeEntityFixtures(
  'fan',
  'bedroom',
  fanEntityFactory().attributes
);
