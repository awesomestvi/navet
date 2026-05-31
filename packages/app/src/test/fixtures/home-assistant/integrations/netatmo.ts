import { climateEntityFactory } from '../entities/climate';
import { weatherEntityFactory } from '../entities/weather';

export const netatmoFixtures = {
  climate: climateEntityFactory({
    friendly_name: 'Netatmo Thermostat',
  }),
  weather: weatherEntityFactory({
    friendly_name: 'Netatmo Outdoor',
  }),
};
