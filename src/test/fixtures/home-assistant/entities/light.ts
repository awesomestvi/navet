import { makeEntityFixtures, makeHassEntityFixture } from '../shared';

export const lightEntityFactory = (overrides: Record<string, unknown> = {}) =>
  makeHassEntityFixture({
    entityId: 'light.kitchen',
    state: 'on',
    attributes: {
      friendly_name: 'Kitchen Light',
      supported_color_modes: ['brightness', 'color_temp'],
      brightness: 180,
      color_temp_kelvin: 4000,
      effect_list: ['rainbow', 'movie'],
      ...overrides,
    },
  });

export const lightEntityFixtures = makeEntityFixtures(
  'light',
  'kitchen',
  lightEntityFactory().attributes,
  {
    relativeUrlValue: '/api/image/serve/light-kitchen/512x512',
  }
);
