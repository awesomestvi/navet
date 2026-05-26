import { makeEntityFixtures, makeHassEntityFixture } from '../shared';

export const sensorEntityFactory = (overrides: Record<string, unknown> = {}) =>
  makeHassEntityFixture({
    entityId: 'sensor.kitchen_temperature',
    state: '21.4',
    attributes: {
      friendly_name: 'Kitchen Temperature',
      device_class: 'temperature',
      unit_of_measurement: '°C',
      state_class: 'measurement',
      ...overrides,
    },
  });

export const sensorEntityFixtures = makeEntityFixtures(
  'sensor',
  'kitchen_temperature',
  sensorEntityFactory().attributes
);
