import { makeEntityFixtures, makeHassEntityFixture } from '../shared';

export const inputSelectEntityFactory = (overrides: Record<string, unknown> = {}) =>
  makeHassEntityFixture({
    entityId: 'input_select.home_mode',
    state: 'Day',
    attributes: {
      friendly_name: 'Home Mode',
      options: ['Morning', 'Day', 'Night'],
      editable: true,
      ...overrides,
    },
  });

export const inputSelectEntityFixtures = makeEntityFixtures(
  'input_select',
  'home_mode',
  inputSelectEntityFactory().attributes
);
