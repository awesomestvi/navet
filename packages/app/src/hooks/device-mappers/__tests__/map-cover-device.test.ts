import {
  coverEntityFactory,
  coverEntityFixtures,
} from '@navet/app/test/fixtures/home-assistant/entities/cover';
import { describe, expect, it } from 'vitest';
import { mapCoverDevice } from '../map-cover-device';

describe('mapCoverDevice', () => {
  it('parses documented cover position and supported feature attributes', () => {
    const entity = coverEntityFactory({
      current_position: '73.6',
      supported_features: '15',
    });

    const device = mapCoverDevice(entity.entity_id, entity, 'Living Room Blind', 'Living Room');

    expect(device).toMatchObject({
      id: entity.entity_id,
      position: 74,
      supportedFeatures: 15,
      hasPosition: true,
      positionMode: 'position',
    });
  });

  it('clamps malformed but plausible position values without dropping position support', () => {
    const entity = coverEntityFactory({
      current_position: 130,
      supported_features: 3,
    });

    const device = mapCoverDevice(entity.entity_id, entity, 'Living Room Blind', 'Living Room');

    expect(device).toMatchObject({
      position: 100,
      supportedFeatures: 3,
      hasPosition: true,
    });
  });

  it('falls back to documented state semantics when position attributes are missing', () => {
    const entity = coverEntityFixtures.missingOptionalAttributes;
    entity.state = 'opening';

    const device = mapCoverDevice(entity.entity_id, entity, 'Garage Door', 'Garage');

    expect(device).toMatchObject({
      position: 100,
      hasPosition: false,
      positionMode: undefined,
      supportedFeatures: undefined,
      deviceClass: undefined,
    });
  });

  it('maps tilt-only covers as tilt controls and preserves supported device classes', () => {
    const entity = coverEntityFactory({
      current_position: undefined,
      current_tilt_position: 35,
      device_class: 'awning',
      supported_features: 240,
    });

    const device = mapCoverDevice(entity.entity_id, entity, 'Pergola Roof', 'Patio');

    expect(device).toMatchObject({
      position: 35,
      positionMode: 'tilt',
      deviceClass: 'awning',
      supportedFeatures: 240,
      hasPosition: true,
    });
  });
});
