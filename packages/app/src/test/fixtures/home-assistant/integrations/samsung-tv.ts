import { mediaPlayerEntityFactory } from '../entities/media-player';

export const samsungTvFixtures = {
  player: mediaPlayerEntityFactory({
    friendly_name: 'Samsung TV',
    source_list: ['HDMI 1', 'HDMI 2', 'Netflix'],
  }),
};
