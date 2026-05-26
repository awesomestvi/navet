import { mediaPlayerEntityFactory } from '../entities/media-player';

export const spotifyFixtures = {
  player: mediaPlayerEntityFactory({
    friendly_name: 'Spotify Connect',
    entity_picture: '/api/media_player_proxy/media_player.spotify_connect',
    media_title: 'Breathe',
    media_artist: 'Telepopmusik',
  }),
};
