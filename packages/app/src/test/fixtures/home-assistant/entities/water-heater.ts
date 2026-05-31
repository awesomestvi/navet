import { makeEntityFixtures, makeHassEntityFixture } from '../shared';

export const waterHeaterEntityFactory = (overrides: Record<string, unknown> = {}) =>
  makeHassEntityFixture({
    entityId: 'water_heater.boiler',
    state: 'eco',
    attributes: {
      friendly_name: 'Boiler',
      current_temperature: 48,
      temperature: 55,
      operation_list: ['eco', 'performance', 'off'],
      ...overrides,
    },
  });

export const waterHeaterEntityFixtures = makeEntityFixtures(
  'water_heater',
  'boiler',
  waterHeaterEntityFactory().attributes
);
