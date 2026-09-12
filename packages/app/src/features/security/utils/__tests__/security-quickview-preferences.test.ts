import type { DeviceWithType } from '@navet/app/types/device.types';
import { describe, expect, it } from 'vitest';
import {
  getAutomaticSecurityQuickviewEntityIds,
  normalizeSecurityQuickviewPreference,
  placeSecurityQuickviewEntity,
  resolveSecurityQuickviewEntities,
} from '../security-quickview-preferences';

function entity(id: string, type: DeviceWithType['type']): DeviceWithType {
  return {
    id,
    name: id,
    room: 'Home',
    size: 'small',
    type,
  } as DeviceWithType;
}

describe('security quickview preferences', () => {
  it('automatically prioritizes the first two cameras', () => {
    const entities = [
      entity('lock.front', 'locks'),
      entity('camera.front', 'cameras'),
      entity('camera.garden', 'cameras'),
      entity('camera.side', 'cameras'),
    ];

    expect(getAutomaticSecurityQuickviewEntityIds(entities)).toEqual([
      'camera.front',
      'camera.garden',
    ]);
  });

  it('falls back to two security entities when cameras are unavailable', () => {
    const entities = [entity('lock.front', 'locks'), entity('sensor.smoke', 'sensors')];

    expect(getAutomaticSecurityQuickviewEntityIds(entities)).toEqual([
      'lock.front',
      'sensor.smoke',
    ]);
  });

  it('preserves a custom mixed-entity order and ignores unavailable IDs', () => {
    const entities = [
      entity('camera.front', 'cameras'),
      entity('lock.front', 'locks'),
      entity('sensor.smoke', 'sensors'),
    ];

    expect(
      resolveSecurityQuickviewEntities(
        {
          mode: 'custom',
          entityIds: ['lock.front', 'missing.entity', 'sensor.smoke', 'camera.front'],
        },
        entities
      ).map((item) => item.id)
    ).toEqual(['lock.front', 'sensor.smoke', 'camera.front']);
  });

  it('normalizes malformed and duplicate stored preferences', () => {
    expect(normalizeSecurityQuickviewPreference(null)).toEqual({ mode: 'auto', entityIds: [] });
    expect(
      normalizeSecurityQuickviewPreference({
        mode: 'custom',
        entityIds: ['camera.front', 'camera.front', 42],
      })
    ).toEqual({ mode: 'custom', entityIds: ['camera.front'] });
  });

  it('keeps quickview empty when every saved entity is unavailable', () => {
    const entities = [entity('camera.front', 'cameras'), entity('lock.front', 'locks')];

    expect(
      resolveSecurityQuickviewEntities(
        { mode: 'custom', entityIds: ['missing.entity'] },
        entities
      ).map((item) => item.id)
    ).toEqual([]);
  });
  it('pins a new entity and moves existing entities in either direction without duplicates', () => {
    expect(placeSecurityQuickviewEntity(['camera.front'], 'lock.front').entityIds).toEqual([
      'camera.front',
      'lock.front',
    ]);
    expect(
      placeSecurityQuickviewEntity(['camera.front', 'lock.front'], 'camera.front', 'lock.front')
        .entityIds
    ).toEqual(['lock.front', 'camera.front']);
    expect(
      placeSecurityQuickviewEntity(['lock.front', 'camera.front'], 'camera.front', 'lock.front')
        .entityIds
    ).toEqual(['camera.front', 'lock.front']);
    expect(
      placeSecurityQuickviewEntity(['camera.front'], 'camera.front', 'camera.front').entityIds
    ).toEqual(['camera.front']);
  });

  it('preserves an intentionally empty quickview after removing the last card', () => {
    expect(
      resolveSecurityQuickviewEntities({ mode: 'custom', entityIds: [] }, [
        entity('camera.front', 'cameras'),
      ])
    ).toEqual([]);
  });
});
