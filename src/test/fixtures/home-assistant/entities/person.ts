import { makeEntityFixtures, makeHassEntityFixture } from '../shared';

export const personEntityFactory = (overrides: Record<string, unknown> = {}) =>
  makeHassEntityFixture({
    entityId: 'person.vishal',
    state: 'home',
    attributes: {
      friendly_name: 'Vishal',
      latitude: 59.3293,
      longitude: 18.0686,
      entity_picture: '/api/image/serve/person-vishal/512x512',
      source: 'device_tracker.pixel',
      ...overrides,
    },
  });

export const personEntityFixtures = makeEntityFixtures(
  'person',
  'vishal',
  personEntityFactory().attributes,
  {
    relativeUrlValue: '/api/image/serve/person-vishal/512x512',
    externalOrSignedUrlValue:
      'https://ha.example.test/api/image/serve/person-vishal/512x512?authSig=signed-person-token',
  }
);
