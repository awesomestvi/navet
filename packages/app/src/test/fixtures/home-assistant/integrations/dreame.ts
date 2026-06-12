import { vacuumEntityFactory } from '../entities/vacuum';

export const dreameFixtures = {
  vacuum: vacuumEntityFactory({
    friendly_name: 'Dreame L20',
    supported_features: 32700,
    water_tank: 'installed',
  }),
  areas: [
    { area_id: 'area_living_room', name: 'Living Room' },
    { area_id: 'area_kitchen', name: 'Kitchen' },
    { area_id: 'area_bedroom', name: 'Bedroom' },
  ],
  entityRegistry: [
    {
      entity_id: 'vacuum.downstairs',
      options: {
        vacuum: {
          area_mapping: {
            area_living_room: ['seg_101'],
            area_kitchen: ['seg_102'],
            area_bedroom: ['seg_103'],
          },
          last_seen_segments: [
            { id: 'seg_101', name: 'Living Room' },
            { id: 'seg_102', name: 'Kitchen' },
            { id: 'seg_103', name: 'Bedroom' },
          ],
        },
      },
    },
  ],
};
