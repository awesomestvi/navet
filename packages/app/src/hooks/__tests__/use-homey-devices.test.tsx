import { homeyService } from '@navet/app/services/homey.service';
import { renderHookWithProviders } from '@navet/app/test/render';
import { resetAppStores } from '@navet/app/test/store-reset';
import { describe, expect, it } from 'vitest';
import { useHomeyDevices } from '../use-homey-devices';

describe('useHomeyDevices', () => {
  it('maps Homey lights, switches, fans, and sensor capabilities into provider-scoped devices', async () => {
    await resetAppStores();
    homeyService.replaceSnapshot({
      connected: true,
      zones: {
        living_room: { id: 'living_room', name: 'Living Room' },
        hallway: { id: 'hallway', name: 'Hallway' },
      },
      devices: {
        light_1: {
          id: 'light_1',
          name: 'Sofa Lamp',
          class: 'light',
          zone: 'living_room',
          capabilitiesObj: {
            onoff: { value: true },
            dim: { value: 0.42 },
            light_temperature: { value: 0.5 },
          },
        },
        switch_1: {
          id: 'switch_1',
          name: 'Coffee Machine',
          class: 'socket',
          zone: 'living_room',
          capabilitiesObj: {
            onoff: { value: false },
            measure_power: { value: 1200, units: 'W', title: 'Power' },
          },
        },
        fan_1: {
          id: 'fan_1',
          name: 'Hall Fan',
          class: 'fan',
          zone: 'hallway',
          capabilitiesObj: {
            onoff: { value: true },
            dim: { value: 0.66 },
          },
        },
      },
    });

    const { result } = renderHookWithProviders(() => useHomeyDevices());

    expect(result.current.lights).toEqual([
      expect.objectContaining({
        id: 'homey:light_1',
        providerId: 'homey',
        nativeId: 'light_1',
        canonicalId: 'homey:light_1',
        room: 'Living Room',
        brightness: 42,
        temp: 4600,
        state: true,
      }),
    ]);
    expect(result.current.switches).toEqual([
      expect.objectContaining({
        id: 'homey:switch_1',
        providerId: 'homey',
        room: 'Living Room',
        state: false,
      }),
    ]);
    expect(result.current.fans).toEqual([
      expect.objectContaining({
        id: 'homey:fan_1',
        providerId: 'homey',
        room: 'Hallway',
        percentage: 66,
      }),
    ]);
    expect(result.current.sensors).toEqual([
      expect.objectContaining({
        id: 'homey:switch_1#measure_power',
        providerId: 'homey',
        nativeId: 'switch_1#measure_power',
        canonicalId: 'homey:switch_1#measure_power',
        room: 'Living Room',
        value: '1200',
        unit: 'W',
        status: 'measurement',
      }),
    ]);
  });

  it('preserves unknown zones as unassigned and maps boolean alarm capabilities as active sensors', async () => {
    await resetAppStores();
    homeyService.replaceSnapshot({
      devices: {
        sensor_1: {
          id: 'sensor_1',
          name: 'Front Door',
          class: 'sensor',
          capabilitiesObj: {
            alarm_motion: { value: true, title: 'Motion' },
          },
        },
      },
    });

    const { result } = renderHookWithProviders(() => useHomeyDevices());

    expect(result.current.sensors).toEqual([
      expect.objectContaining({
        id: 'homey:sensor_1#alarm_motion',
        room: 'Unassigned',
        value: 'Detected',
        status: 'active',
      }),
    ]);
  });
});
