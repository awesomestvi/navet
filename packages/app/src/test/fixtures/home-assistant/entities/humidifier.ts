import { makeEntityFixtures, makeHassEntityFixture } from '../shared';

export const humidifierEntityFactory = (overrides: Record<string, unknown> = {}) =>
  makeHassEntityFixture({
    entityId: 'humidifier.basement',
    state: 'on',
    attributes: {
      friendly_name: 'Basement Dehumidifier',
      device_class: 'dehumidifier',
      current_humidity: 58,
      humidity: 50,
      mode: 'auto',
      available_modes: ['auto', 'sleep'],
      action: 'drying',
      ...overrides,
    },
  });

export const humidifierEntityFixtures = makeEntityFixtures(
  'humidifier',
  'basement',
  humidifierEntityFactory().attributes
);
