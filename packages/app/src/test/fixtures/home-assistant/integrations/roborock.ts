import { vacuumEntityFactory } from '../entities/vacuum';

export const roborockFixtures = {
  vacuum: vacuumEntityFactory({
    friendly_name: 'Roborock S8',
    fan_speed: 'turbo',
    status: 'segment_cleaning',
  }),
};
