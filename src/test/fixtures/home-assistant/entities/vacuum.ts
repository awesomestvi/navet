import { makeEntityFixtures, makeHassEntityFixture } from '../shared';

export const vacuumEntityFactory = (overrides: Record<string, unknown> = {}) =>
  makeHassEntityFixture({
    entityId: 'vacuum.downstairs',
    state: 'cleaning',
    attributes: {
      friendly_name: 'Downstairs Vacuum',
      battery_level: 76,
      fan_speed: 'balanced',
      fan_speed_list: ['quiet', 'balanced', 'turbo'],
      supported_features: 127,
      ...overrides,
    },
  });

export const vacuumEntityFixtures = makeEntityFixtures(
  'vacuum',
  'downstairs',
  vacuumEntityFactory().attributes
);
