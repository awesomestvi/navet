import { makeEntityFixtures, makeHassEntityFixture } from '../shared';

export const coverEntityFactory = (overrides: Record<string, unknown> = {}) =>
  makeHassEntityFixture({
    entityId: 'cover.living_room_blinds',
    state: 'open',
    attributes: {
      friendly_name: 'Living Room Blinds',
      current_position: 100,
      supported_features: 15,
      ...overrides,
    },
  });

export const coverEntityFixtures = makeEntityFixtures(
  'cover',
  'living_room_blinds',
  coverEntityFactory().attributes
);
