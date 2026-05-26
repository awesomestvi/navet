import { mediaPlayerEntityFactory } from '../entities/media-player';

export const jellyfinFixtures = {
  player: mediaPlayerEntityFactory({
    friendly_name: 'Jellyfin TV',
    entity_picture:
      'https://ha.example.test/api/media_player_proxy/media_player.jellyfin_tv?authSig=signed-artwork-token',
    media_content_type: 'episode',
  }),
};
