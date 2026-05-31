import {
  fanEntityFactory,
  fanEntityFixtures,
} from '@navet/app/test/fixtures/home-assistant/entities/fan';
import { describe, expect, it } from 'vitest';
import { mapFanDevice } from '../map-fan-device';

describe('mapFanDevice', () => {
  it('maps documented Home Assistant fan control fields', () => {
    const entity = fanEntityFactory({
      percentage: 66,
      preset_mode: 'auto',
      preset_modes: ['auto', 'sleep'],
    });

    const device = mapFanDevice(entity.entity_id, entity, 'Hallway Fan', 'Hallway');

    expect(device).toEqual(
      expect.objectContaining({
        id: entity.entity_id,
        state: true,
        percentage: 66,
        presetMode: 'auto',
        presetModes: ['auto', 'sleep'],
      })
    );
  });

  it('treats unavailable fans as off without crashing on missing optional attributes', () => {
    const entity = fanEntityFixtures.unavailable;

    const device = mapFanDevice(entity.entity_id, entity, 'Bedroom Fan', 'Bedroom');

    expect(device).toMatchObject({
      state: false,
      percentage: 66,
      presetMode: undefined,
      presetModes: ['auto', 'sleep'],
    });
  });

  it('filters malformed preset mode arrays and clamps out-of-range percentages', () => {
    const entity = fanEntityFactory({
      percentage: 140,
      preset_mode: 42,
      preset_modes: ['auto', 1, 'sleep', null],
    });

    const device = mapFanDevice(entity.entity_id, entity, 'Bedroom Fan', 'Bedroom');

    expect(device).toMatchObject({
      percentage: 100,
      presetMode: undefined,
      presetModes: ['auto', 'sleep'],
    });
  });

  it('falls back safely when optional percentage and preset attributes are absent', () => {
    const entity = fanEntityFixtures.missingOptionalAttributes;

    const device = mapFanDevice(entity.entity_id, entity, 'Bedroom Fan', 'Bedroom');

    expect(device).toMatchObject({
      percentage: 0,
      presetMode: undefined,
      presetModes: undefined,
    });
  });
});
