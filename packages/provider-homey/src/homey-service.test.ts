import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mapHomeySnapshotToNavetEntities } from './homey-mappers';
import { homeyService, translateHomeyCommand, translateHomeyServiceAction } from './homey-service';

const entity = { externalId: 'lamp', type: 'light' } as const;

describe('Homey normalized command execution', () => {
  beforeEach(() => {
    homeyService.setClient(null);
    homeyService.resetSnapshot();
  });

  it.each(['resolve', 'reject'] as const)(
    'ignores a stale snapshot %s after replacing the client',
    async (outcome) => {
      const pending = Promise.withResolvers<import('./homey-types').HomeySnapshot>();
      homeyService.setClient({ setCapabilityValue: vi.fn(), loadSnapshot: () => pending.promise });
      const settled = homeyService.loadSnapshot().catch(() => undefined);
      homeyService.setClient({ setCapabilityValue: vi.fn() });
      homeyService.replaceSnapshot({ connected: true, devices: {}, zones: {}, error: null });
      const current = homeyService.getSnapshot();
      if (outcome === 'resolve')
        pending.resolve({
          connected: true,
          devices: { old: { id: 'old', name: 'Old lamp' } },
          zones: {},
        });
      else pending.reject(new Error('Old connection failed'));
      await settled;
      expect(homeyService.getSnapshot()).toBe(current);
    }
  );

  it('disconnects the transport and ignores pending snapshots on teardown', async () => {
    const unsubscribe = vi.fn();
    const pending = Promise.withResolvers<import('./homey-types').HomeySnapshot>();
    homeyService.setClient({
      setCapabilityValue: vi.fn(),
      loadSnapshot: () => pending.promise,
      subscribeSnapshot: () => unsubscribe,
    });
    const loading = homeyService.loadSnapshot();
    homeyService.disconnect();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(homeyService.isConfigured()).toBe(false);
    pending.resolve({ connected: true, devices: {}, zones: {} });
    await loading;
    expect(homeyService.getSnapshot().connected).toBe(false);
  });

  it('does not send remaining capability commands to a replacement connection', async () => {
    const pending = Promise.withResolvers<void>();
    const oldSend = vi.fn().mockReturnValue(pending.promise);
    homeyService.setClient({ setCapabilityValue: oldSend });
    const action = homeyService.callService(
      'light',
      'turn_on',
      { brightness_pct: 50 },
      { entityId: 'lamp' }
    );
    const settled = expect(action).rejects.toThrow('connection changed');
    const newSend = vi.fn();
    homeyService.setClient({ setCapabilityValue: newSend });
    pending.resolve();
    await settled;
    expect(oldSend).toHaveBeenCalledTimes(1);
    expect(newSend).not.toHaveBeenCalled();
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
