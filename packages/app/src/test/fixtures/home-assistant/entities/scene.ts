import { makeEntityFixtures, makeHassEntityFixture } from '../shared';

export const sceneEntityFactory = (overrides: Record<string, unknown> = {}) =>
  makeHassEntityFixture({
    entityId: 'scene.movie_night',
    state: 'scening',
    attributes: {
      friendly_name: 'Movie Night',
      icon: 'mdi:movie-open',
      ...overrides,
    },
  });

export const sceneEntityFixtures = makeEntityFixtures(
  'scene',
  'movie_night',
  sceneEntityFactory().attributes
);
