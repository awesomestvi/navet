import type { DeviceWithType } from '@navet/app/types/device.types';
import { describe, expect, it } from 'vitest';
import {
  getAutomaticSecurityOverviewEntityIds,
  normalizeSecurityOverviewPreference,
  resolveSecurityOverviewEntities,
} from '../security-overview-preferences';

function entity(id: string, type: DeviceWithType['type']): DeviceWithType {
  return {
    id,
    name: id,
    room: 'Home',
    size: 'small',
    type,
  } as DeviceWithType;
}

describe('security overview preferences', () => {
  it('automatically prioritizes the first two cameras', () => {
    const entities = [
      entity('lock.front', 'locks'),
      entity('camera.front', 'cameras'),
      entity('camera.garden', 'cameras'),
      entity('camera.side', 'cameras'),
    ];

    expect(getAutomaticSecurityOverviewEntityIds(entities)).toEqual([
      'camera.front',
      'camera.garden',
    ]);
  });

  it('falls back to two security entities when cameras are unavailable', () => {
    const entities = [entity('lock.front', 'locks'), entity('sensor.smoke', 'sensors')];

    expect(getAutomaticSecurityOverviewEntityIds(entities)).toEqual(['lock.front', 'sensor.smoke']);
  });

  it('preserves a custom mixed-entity order and ignores unavailable IDs', () => {
    const entities = [
      entity('camera.front', 'cameras'),
      entity('lock.front', 'locks'),
      entity('sensor.smoke', 'sensors'),
    ];

    expect(
      resolveSecurityOverviewEntities(
        {
          mode: 'custom',
          entityIds: ['lock.front', 'missing.entity', 'sensor.smoke', 'camera.front'],
        },
        entities
      ).map((item) => item.id)
    ).toEqual(['lock.front', 'sensor.smoke', 'camera.front']);
  });

  it('normalizes malformed and duplicate stored preferences', () => {
    expect(normalizeSecurityOverviewPreference(null)).toEqual({ mode: 'auto', entityIds: [] });
    expect(
      normalizeSecurityOverviewPreference({
        mode: 'custom',
        entityIds: ['camera.front', 'camera.front', 42],
      })
    ).toEqual({ mode: 'custom', entityIds: ['camera.front'] });
  });

  it('falls back to automatic entities when every custom entity is unavailable', () => {
    const entities = [entity('camera.front', 'cameras'), entity('lock.front', 'locks')];

    expect(
      resolveSecurityOverviewEntities(
        { mode: 'custom', entityIds: ['missing.entity'] },
        entities
      ).map((item) => item.id)
    ).toEqual(['camera.front']);
  });
});
