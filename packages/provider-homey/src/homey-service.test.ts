import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mapHomeySnapshotToNavetEntities } from './homey-mappers';
import { homeyService, translateHomeyCommand, translateHomeyServiceAction } from './homey-service';

const entity = { externalId: 'lamp', type: 'light' } as const;

describe('Homey normalized command execution', () => {
  beforeEach(() => {
    homeyService.setClient(null);
    homeyService.resetSnapshot();
  });

  it('uses identical capability values for normalized and compatibility brightness actions', () => {
    expect(
      translateHomeyCommand(entity, {
        type: 'set_brightness',
        entityId: 'homey:lamp',
        brightness: 25,
      })
    ).toEqual(
      translateHomeyServiceAction('light', 'turn_on', { brightness_pct: 25 }, { entityId: 'lamp' })
    );
  });

  it('converts Kelvin and fan speed without provider service payloads', () => {
    expect(
      translateHomeyCommand(entity, {
        type: 'set_color_temperature',
        entityId: 'homey:lamp',
        kelvin: 4600,
      })
    ).toEqual([
      { deviceId: 'lamp', capabilityId: 'onoff', value: true },
      { deviceId: 'lamp', capabilityId: 'light_temperature', value: 0.5 },
    ]);
    expect(
      translateHomeyCommand(
        { ...entity, type: 'fan' },
        { type: 'set_fan_speed', entityId: 'homey:lamp', percentage: 0 }
      )
    ).toEqual([
      { deviceId: 'lamp', capabilityId: 'onoff', value: false },
      { deviceId: 'lamp', capabilityId: 'dim', value: 0 },
    ]);
  });

  it('rejects unsupported commands before touching transport', () => {
    expect(() => translateHomeyCommand(entity, { type: 'lock', entityId: 'homey:lamp' })).toThrow();
  });

  it('updates snapshot only after transport succeeds', async () => {
    homeyService.replaceSnapshot({
      connected: true,
      devices: {
        lamp: {
          id: 'lamp',
          name: 'Lamp',
          class: 'light',
          capabilities: ['onoff', 'dim'],
          capabilitiesObj: { onoff: { value: true }, dim: { value: 1 } },
        },
      },
    });
    const mapped = mapHomeySnapshotToNavetEntities(homeyService.getSnapshot())[0];
    if (!mapped) throw new Error('Fixture must contain a mapped lamp');
    const setCapabilityValue = vi.fn().mockRejectedValueOnce(new Error('offline'));
    homeyService.setClient({ setCapabilityValue });
    await expect(
      homeyService.executeCommand(mapped, {
        type: 'set_brightness',
        entityId: mapped.id,
        brightness: 50,
      })
    ).rejects.toThrow('offline');
    expect(homeyService.getSnapshot().devices.lamp?.capabilitiesObj?.dim?.value).toBe(1);
    setCapabilityValue.mockResolvedValue(undefined);
    await homeyService.executeCommand(mapped, {
      type: 'set_brightness',
      entityId: mapped.id,
      brightness: 50,
    });
    expect(homeyService.getSnapshot().devices.lamp?.capabilitiesObj?.dim?.value).toBe(0.5);
  });
});
