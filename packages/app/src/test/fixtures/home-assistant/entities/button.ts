import { makeEntityFixtures, makeHassEntityFixture } from '../shared';

export const buttonEntityFactory = (overrides: Record<string, unknown> = {}) =>
  makeHassEntityFixture({
    entityId: 'button.doorbell_chime',
    state: 'unknown',
    attributes: {
      friendly_name: 'Doorbell Chime',
      device_class: 'restart',
      ...overrides,
    },
  });

export const buttonEntityFixtures = makeEntityFixtures(
  'button',
  'doorbell_chime',
  buttonEntityFactory().attributes
);
