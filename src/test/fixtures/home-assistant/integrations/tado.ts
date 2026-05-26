import { climateEntityFactory } from '../entities/climate';

export const tadoFixtures = {
  climate: climateEntityFactory({
    friendly_name: 'Tado Living Room',
    hvac_action: 'idle',
    preset_mode: 'home',
  }),
};
