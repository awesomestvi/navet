import { mediaPlayerEntityFactory } from '../entities/media-player';

export const sonosFixtures = {
  player: mediaPlayerEntityFactory({
    friendly_name: 'Sonos Kitchen',
    source: 'TV',
    group_members: ['media_player.kitchen', 'media_player.living_room'],
  }),
  joinService: {
    domain: 'sonos',
    service: 'join',
    service_data: {
      entity_id: 'media_player.kitchen',
      master: 'media_player.living_room',
    },
  },
};
