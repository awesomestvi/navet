import type { HomeySnapshot } from '@navet/app/types/homey';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { homeyService, translateHomeyServiceAction } from '../homey.service';

describe('homey.service', () => {
  beforeEach(() => {
    homeyService.setClient(null);
  });

  it('translates switch on actions to the onoff capability', () => {
    expect(translateHomeyServiceAction('switch', 'turn_on', {}, { entityId: 'device-1' })).toEqual([
      {
        deviceId: 'device-1',
        capabilityId: 'onoff',
        value: true,
      },
    ]);
  });

  it('translates Home Assistant brightness percentages to Homey dim values', () => {
    expect(
      translateHomeyServiceAction(
        'light',
        'turn_on',
        { brightness_pct: 25 },
        { entityId: 'device-1' }
      )
    ).toEqual([
      {
        deviceId: 'device-1',
        capabilityId: 'onoff',
        value: true,
      },
      {
        deviceId: 'device-1',
        capabilityId: 'dim',
        value: 0.25,
      },
    ]);
  });

  it('treats 1 percent brightness as 0.01 dim instead of full brightness', () => {
    expect(
      translateHomeyServiceAction(
        'light',
        'turn_on',
        { brightness_pct: 1 },
        { entityId: 'device-1' }
      )
    ).toEqual([
      {
        deviceId: 'device-1',
        capabilityId: 'onoff',
        value: true,
      },
      {
        deviceId: 'device-1',
        capabilityId: 'dim',
        value: 0.01,
      },
    ]);
  });

  it('translates Home Assistant 0-255 brightness values to Homey dim values', () => {
    expect(
      translateHomeyServiceAction('light', 'turn_on', { brightness: 128 }, { entityId: 'device-1' })
    ).toEqual([
      {
        deviceId: 'device-1',
        capabilityId: 'onoff',
        value: true,
      },
      {
        deviceId: 'device-1',
        capabilityId: 'dim',
        value: 128 / 255,
      },
    ]);
  });

  it('translates Kelvin light temperature values to Homey light_temperature capability values', () => {
    expect(
      translateHomeyServiceAction('light', 'turn_on', { kelvin: 4600 }, { entityId: 'device-1' })
    ).toEqual([
      {
        deviceId: 'device-1',
        capabilityId: 'onoff',
        value: true,
      },
      {
        deviceId: 'device-1',
        capabilityId: 'light_temperature',
        value: 0.5,
      },
    ]);
  });

  it('translates fan percentages to coupled onoff and dim commands', () => {
    expect(
      translateHomeyServiceAction(
        'fan',
        'set_percentage',
        { percentage: 60 },
        { entityId: ['device-1', 'device-2'] }
      )
    ).toEqual([
      {
        deviceId: 'device-1',
        capabilityId: 'onoff',
        value: true,
      },
      {
        deviceId: 'device-2',
        capabilityId: 'onoff',
        value: true,
      },
      {
        deviceId: 'device-1',
        capabilityId: 'dim',
        value: 0.6,
      },
      {
        deviceId: 'device-2',
        capabilityId: 'dim',
        value: 0.6,
      },
    ]);
  });

  it('treats 1 percent fan speed as 0.01 dim instead of full speed', () => {
    expect(
      translateHomeyServiceAction(
        'fan',
        'set_percentage',
        { percentage: 1 },
        { entityId: 'device-1' }
      )
    ).toEqual([
      {
        deviceId: 'device-1',
        capabilityId: 'onoff',
        value: true,
      },
      {
        deviceId: 'device-1',
        capabilityId: 'dim',
        value: 0.01,
      },
    ]);
  });

  it('fails when a Homey action has no target device', () => {
    expect(() => translateHomeyServiceAction('switch', 'turn_on')).toThrow(
      'Homey actions require a target device id'
    );
  });

  it('fails when the Homey service is not configured', async () => {
    await expect(
      homeyService.callService('switch', 'turn_on', {}, { entityId: 'device-1' })
    ).rejects.toThrow('Homey integration is not configured yet');
  });

  it('forwards translated commands to the configured Homey client', async () => {
    const setCapabilityValue = vi.fn().mockResolvedValue(undefined);
    homeyService.setClient({ setCapabilityValue });

    await homeyService.callService('switch', 'turn_off', {}, { entityId: 'device-1' });

    expect(setCapabilityValue).toHaveBeenCalledWith({
      deviceId: 'device-1',
      capabilityId: 'onoff',
      value: false,
    });
  });

  it('updates the local Homey snapshot after successful capability writes', async () => {
    homeyService.replaceSnapshot({
      connected: true,
      devices: {
        light_1: {
          id: 'light_1',
          name: 'Lamp',
          class: 'light',
          capabilitiesObj: {
            onoff: { value: false },
            dim: { value: 0.2 },
          },
        },
      },
      zones: {},
    });
    homeyService.setClient({
      setCapabilityValue: vi.fn().mockResolvedValue(undefined),
    });

    await homeyService.callService(
      'light',
      'turn_on',
      { brightness_pct: 75 },
      { entityId: 'light_1' }
    );

    expect(homeyService.getSnapshot().devices.light_1?.capabilitiesObj).toMatchObject({
      onoff: { value: true },
      dim: { value: 0.75 },
    });
  });

  it('loads and stores a Homey snapshot from the configured client', async () => {
    const loadSnapshot = vi.fn().mockResolvedValue({
      connected: true,
      devices: {
        light_1: {
          id: 'light_1',
          name: 'Lamp',
        },
      },
      zones: {
        zone_1: {
          id: 'zone_1',
          name: 'Living Room',
        },
      },
    });
    homeyService.setClient({
      setCapabilityValue: vi.fn(),
      loadSnapshot,
    });

    await expect(homeyService.loadSnapshot()).resolves.toMatchObject({
      connected: true,
      devices: {
        light_1: {
          name: 'Lamp',
        },
      },
    });
    expect(homeyService.getSnapshot()).toMatchObject({
      connected: true,
      zones: {
        zone_1: {
          name: 'Living Room',
        },
      },
    });
  });

  it('applies realtime Homey snapshot updates from the configured client', async () => {
    const snapshotListeners: Array<(snapshot: HomeySnapshot) => void> = [];
    homeyService.setClient({
      setCapabilityValue: vi.fn(),
      subscribeSnapshot(listener) {
        snapshotListeners.push(listener);
        return () => {
          const listenerIndex = snapshotListeners.indexOf(listener);
          if (listenerIndex !== -1) {
            snapshotListeners.splice(listenerIndex, 1);
          }
        };
      },
    });

    snapshotListeners[0]?.({
      connected: true,
      devices: {
        switch_1: {
          id: 'switch_1',
          name: 'Coffee Machine',
        },
      },
      zones: {},
    });

    expect(homeyService.getSnapshot()).toMatchObject({
      connected: true,
      devices: {
        switch_1: {
          name: 'Coffee Machine',
        },
      },
    });
  });
});
