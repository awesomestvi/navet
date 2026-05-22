import type { HassEntity } from 'home-assistant-js-websocket';
import { describe, expect, it } from 'vitest';
import { mapFanDevice } from '../map-fan-device';

function createEntity(
  entityId: string,
  state: string,
  attributes: Record<string, unknown> = {}
): HassEntity {
  return {
    entity_id: entityId,
    state,
    attributes,
    last_changed: '2026-05-17T00:00:00.000Z',
    last_updated: '2026-05-17T00:00:00.000Z',
    context: { id: 'ctx', parent_id: null, user_id: null },
  } as HassEntity;
}

describe('mapFanDevice', () => {
  it('maps Home Assistant fan control fields', () => {
    const device = mapFanDevice(
      'fan.hallway',
      createEntity('fan.hallway', 'on', {
        percentage: 66,
        preset_mode: 'auto',
        preset_modes: ['auto', 'sleep'],
      }),
      'Hallway Fan',
      'Hallway'
    );

    expect(device).toEqual(
      expect.objectContaining({
        id: 'fan.hallway',
        state: true,
        percentage: 66,
        presetMode: 'auto',
        presetModes: ['auto', 'sleep'],
      })
    );
  });
});
