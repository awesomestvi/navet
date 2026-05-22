import type { HassEntity } from 'home-assistant-js-websocket';
import { describe, expect, it } from 'vitest';
import { mapCoverDevice } from '../map-cover-device';

function createCoverEntity(attributes: Record<string, unknown>, state = 'open'): HassEntity {
  return {
    attributes,
    context: { id: 'context-id', parent_id: null, user_id: null },
    entity_id: 'cover.living_room_blind',
    last_changed: '2026-05-20T00:00:00.000Z',
    last_updated: '2026-05-20T00:00:00.000Z',
    state,
  };
}

describe('mapCoverDevice', () => {
  it('parses Home Assistant cover position and supported feature attributes', () => {
    const device = mapCoverDevice(
      'cover.living_room_blind',
      createCoverEntity({ current_position: '73.6', supported_features: '15' }),
      'Living Room Blind',
      'Living Room'
    );

    expect(device.position).toBe(74);
    expect(device.supportedFeatures).toBe(15);
    expect(device.hasPosition).toBe(true);
  });

  it('clamps invalid cover positions without inventing position support', () => {
    const device = mapCoverDevice(
      'cover.living_room_blind',
      createCoverEntity({ current_position: 130, supported_features: 3 }),
      'Living Room Blind',
      'Living Room'
    );

    expect(device.position).toBe(100);
    expect(device.supportedFeatures).toBe(3);
    expect(device.hasPosition).toBe(true);
  });

  it('derives position and device class from state for covers without position support', () => {
    const device = mapCoverDevice(
      'cover.garage_door',
      createCoverEntity({ device_class: 'garage', supported_features: 11 }, 'open'),
      'Garage Door',
      'Garage'
    );

    expect(device.position).toBe(100);
    expect(device.deviceClass).toBe('garage');
    expect(device.hasPosition).toBe(false);
  });

  it('maps tilt-only covers as position-capable tilt controls', () => {
    const device = mapCoverDevice(
      'cover.pergola_roof',
      createCoverEntity({
        current_tilt_position: 35,
        device_class: 'awning',
        supported_features: 240,
      }),
      'Pergola Roof',
      'Patio'
    );

    expect(device.position).toBe(35);
    expect(device.positionMode).toBe('tilt');
    expect(device.deviceClass).toBe('awning');
    expect(device.hasPosition).toBe(true);
  });
});
