import { mediaPlayerEntityFactory } from '../entities/media-player';

export const googleCastFixtures = {
  player: mediaPlayerEntityFactory({
    friendly_name: 'Living Room Chromecast',
    app_name: 'YouTube',
  }),
};
