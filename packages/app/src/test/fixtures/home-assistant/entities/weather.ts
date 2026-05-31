import { makeEntityFixtures, makeHassEntityFixture } from '../shared';

export const weatherEntityFactory = (overrides: Record<string, unknown> = {}) =>
  makeHassEntityFixture({
    entityId: 'weather.home',
    state: 'sunny',
    attributes: {
      friendly_name: 'Home Weather',
      temperature: 18,
      humidity: 54,
      wind_speed: 5,
      forecast: [{ datetime: '2026-05-18T12:00:00+00:00', condition: 'rainy', temperature: 16 }],
      ...overrides,
    },
  });

export const weatherEntityFixtures = makeEntityFixtures(
  'weather',
  'home',
  weatherEntityFactory().attributes
);
