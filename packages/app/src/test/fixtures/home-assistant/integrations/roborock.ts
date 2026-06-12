import { vacuumEntityFactory } from '../entities/vacuum';

export const roborockFixtures = {
  vacuum: vacuumEntityFactory({
    friendly_name: 'Roborock S8',
    supported_features: 32700,
    fan_speed: 'turbo',
    status: 'segment_cleaning',
  }),
  areas: [
    { area_id: 'area_kitchen', name: 'Kitchen' },
    { area_id: 'area_hallway', name: 'Hallway' },
    { area_id: 'area_living_room', name: 'Living Room' },
  ],
  entityRegistry: [
    {
      entity_id: 'vacuum.downstairs',
      options: {
        vacuum: {
          area_mapping: {
            area_kitchen: ['0_16'],
            area_hallway: ['0_17'],
            area_living_room: ['0_18'],
          },
          last_seen_segments: [
            { id: '0_16', name: 'Kitchen' },
            { id: '0_17', name: 'Hallway' },
            { id: '0_18', name: 'Living Room' },
          ],
        },
      },
    },
  ],
};
