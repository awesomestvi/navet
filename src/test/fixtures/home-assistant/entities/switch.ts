import { makeEntityFixtures, makeHassEntityFixture } from '../shared';

export const switchEntityFactory = (overrides: Record<string, unknown> = {}) =>
  makeHassEntityFixture({
    entityId: 'switch.coffee_machine',
    state: 'off',
    attributes: {
      friendly_name: 'Coffee Machine',
      icon: 'mdi:coffee-maker',
      ...overrides,
    },
  });

export const switchEntityFixtures = makeEntityFixtures(
  'switch',
  'coffee_machine',
  switchEntityFactory().attributes
);
