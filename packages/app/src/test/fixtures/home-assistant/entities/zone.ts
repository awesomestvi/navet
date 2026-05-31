import { makeEntityFixtures, makeHassEntityFixture } from '../shared';

export const zoneEntityFactory = (overrides: Record<string, unknown> = {}) =>
  makeHassEntityFixture({
    entityId: 'zone.home',
    state: '1',
    attributes: {
      friendly_name: 'Home',
      latitude: 59.3293,
      longitude: 18.0686,
      radius: 100,
      passive: false,
      ...overrides,
    },
  });

export const zoneEntityFixtures = makeEntityFixtures(
  'zone',
  'home',
  zoneEntityFactory().attributes
);
