import { makeEntityFixtures, makeHassEntityFixture } from '../shared';

export const climateEntityFactory = (overrides: Record<string, unknown> = {}) =>
  makeHassEntityFixture({
    entityId: 'climate.hallway',
    state: 'heat',
    attributes: {
      friendly_name: 'Hallway Thermostat',
      current_temperature: 20.5,
      temperature: 21,
      hvac_modes: ['heat', 'cool', 'heat_cool', 'off'],
      hvac_action: 'heating',
      fan_modes: ['auto', 'low', 'high'],
      ...overrides,
    },
  });

export const climateEntityFixtures = makeEntityFixtures(
  'climate',
  'hallway',
  climateEntityFactory().attributes
);
