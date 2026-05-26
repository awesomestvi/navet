import { makeEntityFixtures, makeHassEntityFixture } from '../shared';

export const imageEntityFactory = (overrides: Record<string, unknown> = {}) =>
  makeHassEntityFixture({
    entityId: 'image.front_porch_event',
    state: '2026-05-17T20:00:00.000Z',
    attributes: {
      friendly_name: 'Front Porch Event',
      entity_picture: '/api/image/serve/front-porch-event/512x512',
      content_type: 'image/jpeg',
      ...overrides,
    },
  });

export const imageEntityFixtures = makeEntityFixtures(
  'image',
  'front_porch_event',
  imageEntityFactory().attributes,
  {
    relativeUrlValue: '/api/image/serve/front-porch-event/512x512',
    externalOrSignedUrlValue:
      'https://ha.example.test/api/image/serve/front-porch-event/512x512?authSig=signed-image-token',
  }
);
