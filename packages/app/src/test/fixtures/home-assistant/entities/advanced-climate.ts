import { makeHassEntityFixture } from '../shared';

export const advancedClimateEntityFactory = (
  attributes: Record<string, unknown> = {},
  state = 'cool'
) =>
  makeHassEntityFixture({
    entityId: 'climate.living_room',
    state,
    attributes: {
      friendly_name: 'Living room AC',
      supported_features: 1 | 4 | 8 | 16 | 32 | 512,
      current_temperature: 24,
      temperature: 22,
      temperature_unit: '°C',
      hvac_modes: ['off', 'cool', 'heat', 'dry', 'fan_only'],
      hvac_action: 'cooling',
      preset_mode: 'eco',
      preset_modes: ['none', 'eco', 'sleep'],
      fan_mode: 'auto',
      fan_modes: ['auto', 'quiet', 'high'],
      swing_mode: 'off',
      swing_modes: ['off', 'vertical'],
      swing_horizontal_mode: 'off',
      swing_horizontal_modes: ['off', 'on'],
      humidity: 45,
      current_humidity: 55,
      min_humidity: 30,
      max_humidity: 70,
      target_humidity_step: 5,
      ...attributes,
    },
  });
