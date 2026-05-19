import { describe, expect, it } from 'vitest';
import { useMediaDisplayFields } from '../use-media-display-fields';

const baseParams = {
  entityName: 'Kitchen',
  initialTitle: 'Kitchen',
  initialArtist: '',
  nothingPlayingLabel: 'Nothing playing',
  nothingPlayingDescription: 'No media selected',
};

describe('useMediaDisplayFields', () => {
  it('includes changing media metadata in the artwork key for stable content ids', () => {
    const first = useMediaDisplayFields({
      ...baseParams,
      liveAttrs: {
        entity_picture: '/api/media_player_proxy/media_player.kitchen',
        media_content_id: 'spotify:context:playlist:daily-mix',
        media_title: 'First song',
        media_artist: 'First artist',
        media_album_name: 'First album',
      },
    });
    const second = useMediaDisplayFields({
      ...baseParams,
      liveAttrs: {
        entity_picture: '/api/media_player_proxy/media_player.kitchen',
        media_content_id: 'spotify:context:playlist:daily-mix',
        media_title: 'Second song',
        media_artist: 'Second artist',
        media_album_name: 'Second album',
      },
    });

    expect(first.liveArtworkKey).not.toBe(second.liveArtworkKey);
  });

  it('uses entity_picture_local as live artwork when entity_picture is unavailable', () => {
    const fields = useMediaDisplayFields({
      ...baseParams,
      entityPicture: '/api/media_player_proxy/media_player.fallback',
      liveAttrs: {
        entity_picture_local: '/api/media_player_proxy/media_player.kitchen_local',
        media_title: 'Local artwork song',
      },
    });

    expect(fields.liveEntityPicture).toBe('/api/media_player_proxy/media_player.kitchen_local');
    expect(fields.liveArtworkKey).toContain('/api/media_player_proxy/media_player.kitchen_local');
  });

  it('uses media_image_url as live artwork when proxy picture attributes are unavailable', () => {
    const fields = useMediaDisplayFields({
      ...baseParams,
      entityPicture: '/api/media_player_proxy/media_player.fallback',
      liveAttrs: {
        media_image_url: 'https://cdn.example.test/album.jpg',
        media_title: 'Remote artwork song',
      },
    });

    expect(fields.liveEntityPicture).toBe('https://cdn.example.test/album.jpg');
    expect(fields.liveArtworkKey).toContain('https://cdn.example.test/album.jpg');
  });
});
