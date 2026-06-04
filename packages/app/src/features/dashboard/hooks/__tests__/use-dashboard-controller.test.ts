import type { DeviceWithType } from '@navet/app/types/device.types';
import { describe, expect, it } from 'vitest';
import { getClimateDashboardGroup } from '../use-dashboard-controller';

function createDevice(overrides: Partial<DeviceWithType> & Pick<DeviceWithType, 'id' | 'type'>) {
  return {
    name: overrides.id,
    room: 'Hallway',
    size: 'small',
    ...overrides,
  } as DeviceWithType;
}

describe('getClimateDashboardGroup', () => {
  it('groups fan cards into the dedicated climate fan section', () => {
    expect(
      getClimateDashboardGroup(
        createDevice({
          id: 'fan.hallway',
          type: 'fans',
          name: 'Hallway Fan',
        })
      )
    ).toBe('fans');
  });

  it('keeps humidity sensors in the humidity climate section', () => {
    expect(
      getClimateDashboardGroup(
        createDevice({
          id: 'sensor.hallway_humidity',
          type: 'sensors',
          deviceClass: 'humidity',
        })
      )
    ).toBe('humidity');
  });
});
