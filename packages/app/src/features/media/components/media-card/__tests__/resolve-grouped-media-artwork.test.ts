import { describe, expect, it } from 'vitest';
import { resolveGroupedMediaArtwork } from '../resolve-grouped-media-artwork';

describe('resolveGroupedMediaArtwork', () => {
  it('keeps the current entity artwork when it already exists', () => {
    expect(
      resolveGroupedMediaArtwork({
        entityId: 'media_player.homepod_group',
        currentPicture: '/api/media_player_proxy/media_player.homepod_group',
        groupMembers: ['media_player.homepod_group', 'media_player.office_homepod'],
        mediaPlayerEntities: {
          'media_player.office_homepod': {
            entityId: 'media_player.office_homepod',
            state: 'playing',
            attributes: {
              entity_picture: '/api/media_player_proxy/media_player.office_homepod',
            },
          },
        },
      })
    ).toBe('/api/media_player_proxy/media_player.homepod_group');
  });

  it('inherits artwork from a playing group member when the group entity has none', () => {
    expect(
      resolveGroupedMediaArtwork({
        entityId: 'home_assistant:media_player.homepod_group',
        groupMembers: [
          'media_player.homepod_group',
          'media_player.office_homepod',
          'media_player.living_room',
        ],
        mediaPlayerEntities: {
          'media_player.office_homepod': {
            entityId: 'media_player.office_homepod',
            state: 'playing',
            attributes: {
              entity_picture_local: '/api/media_player_proxy/media_player.office_homepod_local',
            },
          },
          'media_player.living_room': {
            entityId: 'media_player.living_room',
            state: 'idle',
            attributes: {
              entity_picture: '/api/media_player_proxy/media_player.living_room',
            },
          },
        },
      })
    ).toBe('/api/media_player_proxy/media_player.office_homepod_local');
  });

  it('falls back to the first member artwork when no member is actively playing', () => {
    expect(
      resolveGroupedMediaArtwork({
        entityId: 'media_player.homepod_group',
        groupMembers: ['media_player.homepod_group', 'media_player.office_homepod'],
        mediaPlayerEntities: {
          'media_player.office_homepod': {
            entityId: 'media_player.office_homepod',
            state: 'idle',
            attributes: {
              media_image_url: 'https://cdn.example.test/homepod-artwork.jpg',
            },
          },
        },
      })
    ).toBe('https://cdn.example.test/homepod-artwork.jpg');
  });
});
