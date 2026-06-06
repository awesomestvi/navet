import type { TranslateFn } from '@navet/app/hooks';
import type { DeviceWithType } from '@navet/app/types/device.types';
import { describe, expect, it } from 'vitest';
import { buildPreparedDashboardDevices } from './prepared-dashboard-devices';

function createDevice(
  overrides: Partial<DeviceWithType> & Pick<DeviceWithType, 'id' | 'type'>
): DeviceWithType {
  return {
    name: overrides.id,
    room: 'Kitchen',
    size: 'small',
    ...overrides,
  } as DeviceWithType;
}

describe('buildPreparedDashboardDevices', () => {
  it('builds reusable room, label, and search metadata for dashboard consumers', () => {
    const deviceMap = new Map<string, DeviceWithType>([
      [
        'home_assistant:light.kitchen',
        createDevice({
          id: 'home_assistant:light.kitchen',
          type: 'lights',
          name: 'Kitchen Light',
          room: 'Kitchen',
        }),
      ],
    ]);

    const result = buildPreparedDashboardDevices(
      deviceMap,
      ((key: string) => key) as TranslateFn,
      1
    );

    expect(result).toEqual([
      expect.objectContaining({
        id: 'home_assistant:light.kitchen',
        name: 'Kitchen Light',
        room: 'Kitchen',
        searchText: expect.stringContaining('kitchen light'),
      }),
    ]);
  });
});
