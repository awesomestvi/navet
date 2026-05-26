import { makeEntityFixtures, makeHassEntityFixture } from '../shared';

export const mediaPlayerEntityFactory = (overrides: Record<string, unknown> = {}) =>
  makeHassEntityFixture({
    entityId: 'media_player.living_room',
    state: 'playing',
    attributes: {
      friendly_name: 'Living Room Speaker',
      media_title: 'Track Title',
      media_artist: 'Artist Name',
      media_album_name: 'Album Name',
      media_content_id: 'track-1',
      entity_picture: '/api/media_player_proxy/media_player.living_room',
      supported_features: 65981,
      source: 'Spotify',
      volume_level: 0.42,
      ...overrides,
    },
  });

export const mediaPlayerEntityFixtures = makeEntityFixtures(
  'media_player',
  'living_room',
  mediaPlayerEntityFactory().attributes,
  {
    relativeUrlValue: '/api/media_player_proxy/media_player.living_room',
    ingressPathValue:
      '/api/hassio_ingress/navet_dev/__navet_ha_proxy__/api/media_player_proxy/media_player.living_room',
    externalOrSignedUrlValue:
      'https://ha.example.test/api/media_player_proxy/media_player.living_room?authSig=signed-artwork-token',
  }
);
