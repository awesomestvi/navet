import { describe, expect, it } from 'vitest';
import { mediaPlayerEntityFactory } from '@/test/fixtures/home-assistant/entities/media-player';
import { useMediaDisplayFields } from '../use-media-display-fields';

const baseParams = {
  entityName: 'Kitchen',
  initialTitle: 'Kitchen',
  initialArtist: '',
  playbackState: 'playing' as const,
  nothingPlayingLabel: 'Nothing playing',
  nothingPlayingDescription: 'No media selected',
  readyToPlayLabel: 'Ready to play',
};

describe('useMediaDisplayFields', () => {
  it('includes changing media metadata in the artwork key for stable content ids', () => {
    const firstEntity = mediaPlayerEntityFactory({
      entity_picture: '/api/media_player_proxy/media_player.kitchen',
      media_content_id: 'spotify:context:playlist:daily-mix',
      media_title: 'First song',
      media_artist: 'First artist',
      media_album_name: 'First album',
    });
    const secondEntity = mediaPlayerEntityFactory({
      entity_picture: '/api/media_player_proxy/media_player.kitchen',
      media_content_id: 'spotify:context:playlist:daily-mix',
      media_title: 'Second song',
      media_artist: 'Second artist',
      media_album_name: 'Second album',
    });
    const first = useMediaDisplayFields({
      ...baseParams,
      liveAttrs: firstEntity.attributes,
    });
    const second = useMediaDisplayFields({
      ...baseParams,
      liveAttrs: secondEntity.attributes,
    });

    expect(first.liveArtworkKey).not.toBe(second.liveArtworkKey);
  });

  it('uses entity_picture_local as live artwork when entity_picture is unavailable', () => {
    const entity = mediaPlayerEntityFactory({
      entity_picture_local: '/api/media_player_proxy/media_player.kitchen_local',
      entity_picture: undefined,
      media_title: 'Local artwork song',
    });
    const fields = useMediaDisplayFields({
      ...baseParams,
      entityPicture: '/api/media_player_proxy/media_player.fallback',
      liveAttrs: entity.attributes,
    });

    expect(fields.liveEntityPicture).toBe('/api/media_player_proxy/media_player.kitchen_local');
    expect(fields.liveArtworkKey).toContain('/api/media_player_proxy/media_player.kitchen_local');
  });

  it('uses media_image_url as live artwork when proxy picture attributes are unavailable', () => {
    const entity = mediaPlayerEntityFactory({
      entity_picture: undefined,
      media_image_url: 'https://cdn.example.test/album.jpg',
      media_title: 'Remote artwork song',
    });
    const fields = useMediaDisplayFields({
      ...baseParams,
      entityPicture: '/api/media_player_proxy/media_player.fallback',
      liveAttrs: entity.attributes,
    });

    expect(fields.liveEntityPicture).toBe('https://cdn.example.test/album.jpg');
    expect(fields.liveArtworkKey).toContain('https://cdn.example.test/album.jpg');
  });

  it('shows the player name for an available player with no media metadata', () => {
    const fields = useMediaDisplayFields({
      ...baseParams,
      liveAttrs: {},
      playbackState: 'idle',
    });

    expect(fields.displayTitle).toBe('Kitchen');
    expect(fields.displayArtist).toBe('Ready to play');
  });

  it('keeps the empty playback fallback for an off player with no media metadata', () => {
    const fields = useMediaDisplayFields({
      ...baseParams,
      liveAttrs: {},
      playbackState: 'off',
    });

    expect(fields.displayTitle).toBe('Nothing playing');
    expect(fields.displayArtist).toBe('No media selected');
  });
});
