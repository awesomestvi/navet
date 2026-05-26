import { lightEntityFactory } from '../entities/light';

export const matterFixtures = {
  light: lightEntityFactory({
    friendly_name: 'Matter Lamp',
    supported_color_modes: ['onoff', 'brightness'],
  }),
};
