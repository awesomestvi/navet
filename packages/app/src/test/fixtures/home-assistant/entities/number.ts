import { makeEntityFixtures, makeHassEntityFixture } from '../shared';

export const numberEntityFactory = (overrides: Record<string, unknown> = {}) =>
  makeHassEntityFixture({
    entityId: 'number.thermostat_offset',
    state: '1',
    attributes: {
      friendly_name: 'Thermostat Offset',
      min: -5,
      max: 5,
      step: 0.5,
      unit_of_measurement: '°C',
      ...overrides,
    },
  });

export const numberEntityFixtures = makeEntityFixtures(
  'number',
  'thermostat_offset',
  numberEntityFactory().attributes
);
