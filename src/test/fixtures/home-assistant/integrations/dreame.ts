import { vacuumEntityFactory } from '../entities/vacuum';

export const dreameFixtures = {
  vacuum: vacuumEntityFactory({
    friendly_name: 'Dreame L20',
    water_tank: 'installed',
  }),
};
