import { makeEntityFixtures, makeHassEntityFixture } from '../shared';

export const cameraEntityFactory = (overrides: Record<string, unknown> = {}) =>
  makeHassEntityFixture({
    entityId: 'camera.front_door',
    state: 'streaming',
    attributes: {
      friendly_name: 'Front Door Camera',
      entity_picture: '/api/camera_proxy/camera.front_door',
      access_token: 'legacy-camera-token',
      frontend_stream_type: 'hls',
      supported_features: 2,
      ...overrides,
    },
  });

export const cameraEntityFixtures = makeEntityFixtures(
  'camera',
  'front_door',
  cameraEntityFactory().attributes,
  {
    relativeUrlValue: '/api/camera_proxy/camera.front_door',
    ingressPathValue:
      '/api/hassio_ingress/navet_dev/__navet_ha_proxy__/api/camera_proxy/camera.front_door',
    externalOrSignedUrlValue:
      'https://ha.example.test/api/camera_proxy/camera.front_door?authSig=signed-camera-token',
  }
);
