import { lightEntityFactory } from '../entities/light';

export const ikeaDirigeraFixtures = {
  light: lightEntityFactory({
    friendly_name: 'Dirigera Lamp',
    supported_color_modes: ['color_temp'],
    color_temp_kelvin: 2700,
  }),
};
