import { makeEntityFixtures, makeHassEntityFixture } from '../shared';

export const inputBooleanEntityFactory = (overrides: Record<string, unknown> = {}) =>
  makeHassEntityFixture({
    entityId: 'input_boolean.guest_mode',
    state: 'off',
    attributes: {
      friendly_name: 'Guest Mode',
      editable: true,
      ...overrides,
    },
  });

export const inputBooleanEntityFixtures = makeEntityFixtures(
  'input_boolean',
  'guest_mode',
  inputBooleanEntityFactory().attributes
);
