import { mediaPlayerEntityFactory } from '../entities/media-player';

export const plexFixtures = {
  player: mediaPlayerEntityFactory({
    friendly_name: 'Plex Theater',
    entity_picture: 'https://ha.example.test/api/media_player_proxy/media_player.plex_theater',
    media_content_type: 'movie',
  }),
};
