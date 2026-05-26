import { makeEntityFixtures, makeHassEntityFixture } from '../shared';

export const deviceTrackerEntityFactory = (overrides: Record<string, unknown> = {}) =>
  makeHassEntityFixture({
    entityId: 'device_tracker.pixel',
    state: 'home',
    attributes: {
      friendly_name: 'Pixel Phone',
      source_type: 'gps',
      latitude: 59.3293,
      longitude: 18.0686,
      battery_level: 67,
      ...overrides,
    },
  });

export const deviceTrackerEntityFixtures = makeEntityFixtures(
  'device_tracker',
  'pixel',
  deviceTrackerEntityFactory().attributes
);
