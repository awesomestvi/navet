import { weatherEntityFactory } from '../entities/weather';

export const weatherIntegrationFixtures = {
  weather: weatherEntityFactory({
    friendly_name: 'Met.no Home Weather',
  }),
};
