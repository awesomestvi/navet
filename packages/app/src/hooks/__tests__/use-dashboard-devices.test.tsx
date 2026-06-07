import { createEmptyDeviceCollection } from '@navet/app/core/navet-device-collections';
import type { DeviceCollection } from '@navet/app/types/device.types';
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  buildDashboardVisibilityResult,
  getAbsorbedDashboardEntityIds,
  getExpandedHiddenDashboardEntityIds,
  useDashboardDevices,
} from '../use-dashboard-devices';

describe('useDashboardDevices', () => {
  it('keeps sensors hidden until explicitly shown', () => {
    const devices: DeviceCollection = {
      ...createEmptyDeviceCollection(),
      lights: [
        {
          id: 'light.kitchen',
          name: 'Kitchen',
          room: 'Kitchen',
          size: 'small',
          state: true,
          brightness: 100,
          temp: 3000,
        },
      ],
      sensors: [
        {
          id: 'sensor.kitchen_temperature',
          name: 'Kitchen Temperature',
          room: 'Kitchen',
          value: '21.4',
          unit: '°C',
          size: 'small',
        },
        {
          id: 'binary_sensor.front_window',
          name: 'Front Window',
          room: 'Hallway',
          value: 'Closed',
          unit: '',
          size: 'small',
        },
      ],
    };

    const { result, rerender } = renderHook(
      ({ shownSensorEntityIds }) => useDashboardDevices(devices, [], shownSensorEntityIds),
      { initialProps: { shownSensorEntityIds: [] as string[] } }
    );

    expect(result.current.lights).toHaveLength(1);
    expect(result.current.sensors).toEqual([]);

    rerender({ shownSensorEntityIds: ['sensor.kitchen_temperature'] });

    expect(result.current.sensors).toEqual([
      expect.objectContaining({ id: 'sensor.kitchen_temperature' }),
    ]);
  });

  it('preserves the original device collection reference when no visibility filters apply', () => {
    const devices: DeviceCollection = {
      ...createEmptyDeviceCollection(),
      lights: [
        {
          id: 'light.kitchen',
          name: 'Kitchen',
          room: 'Kitchen',
          size: 'small',
          state: true,
          brightness: 100,
          temp: 3000,
        },
      ],
    };

    const { result } = renderHook(() => useDashboardDevices(devices, [], ['sensor.none']));

    expect(result.current).toBe(devices);
    expect(result.current.lights).toBe(devices.lights);
  });

  it('absorbs security child entities when a visible parent card already represents the device', () => {
    const devices: DeviceCollection = {
      ...createEmptyDeviceCollection(),
      locks: [
        {
          id: 'lock.front_door',
          name: 'Front Door Lock',
          room: 'Hallway',
          size: 'small',
          state: true,
          securityKind: 'lock',
          securitySeverity: 'normal',
          underlyingDeviceId: 'device-front-door',
        },
      ],
      sensors: [
        {
          id: 'binary_sensor.front_door_contact',
          name: 'Front Door Contact',
          room: 'Hallway',
          value: 'Open',
          unit: '',
          size: 'small',
          securityKind: 'door',
          securitySeverity: 'warning',
          underlyingDeviceId: 'device-front-door',
        },
      ],
      helpers: [
        {
          id: 'button.front_door_chime',
          name: 'Front Door Chime',
          room: 'Hallway',
          size: 'small',
          state: false,
          entityType: 'Button',
          serviceDomain: 'button',
          serviceAction: 'press',
          securityKind: 'button',
          securitySeverity: 'normal',
          underlyingDeviceId: 'device-front-door',
        },
      ],
    };

    const { result } = renderHook(() =>
      useDashboardDevices(devices, [], ['binary_sensor.front_door_contact'])
    );
    const visibility = buildDashboardVisibilityResult(
      devices,
      [],
      ['binary_sensor.front_door_contact']
    );

    expect(result.current.locks).toHaveLength(1);
    expect(result.current.sensors).toEqual([]);
    expect(result.current.helpers).toEqual([]);
    expect(getAbsorbedDashboardEntityIds(devices, [])).toEqual([
      'button.front_door_chime',
      'binary_sensor.front_door_contact',
    ]);
    expect(visibility.availableDevices.sensors).toEqual([]);
    expect(visibility.availableDevices.helpers).toEqual([]);
  });

  it('allows a child security entity to surface again when its parent card is hidden', () => {
    const devices: DeviceCollection = {
      ...createEmptyDeviceCollection(),
      locks: [
        {
          id: 'lock.front_door',
          name: 'Front Door Lock',
          room: 'Hallway',
          size: 'small',
          state: true,
          securityKind: 'lock',
          securitySeverity: 'normal',
          underlyingDeviceId: 'device-front-door',
        },
      ],
      sensors: [
        {
          id: 'binary_sensor.front_door_contact',
          name: 'Front Door Contact',
          room: 'Hallway',
          value: 'Open',
          unit: '',
          size: 'small',
          securityKind: 'door',
          securitySeverity: 'warning',
          underlyingDeviceId: 'device-front-door',
        },
      ],
    };

    const { result } = renderHook(() =>
      useDashboardDevices(devices, ['lock.front_door'], ['binary_sensor.front_door_contact'])
    );

    expect(result.current.locks).toEqual([]);
    expect(result.current.sensors).toEqual([
      expect.objectContaining({ id: 'binary_sensor.front_door_contact' }),
    ]);
    expect(getAbsorbedDashboardEntityIds(devices, ['lock.front_door'])).toEqual([]);
  });

  it('always hides standalone security button helpers from home and room dashboards', () => {
    const devices: DeviceCollection = {
      ...createEmptyDeviceCollection(),
      helpers: [
        {
          id: 'button.identity',
          name: 'Identity',
          room: 'Office',
          size: 'small',
          state: false,
          entityType: 'Button',
          serviceDomain: 'button',
          serviceAction: 'press',
          securityKind: 'button',
          securitySeverity: 'normal',
        },
      ],
    };

    const { result } = renderHook(() => useDashboardDevices(devices, []));
    const visibility = buildDashboardVisibilityResult(devices, []);

    expect(result.current.helpers).toEqual([]);
    expect(getAbsorbedDashboardEntityIds(devices, [])).toEqual(['button.identity']);
    expect(visibility.availableDevices.helpers).toEqual([]);
  });

  it('expands hidden camera variants so sibling security cameras stay hidden everywhere', () => {
    const devices: DeviceCollection = {
      ...createEmptyDeviceCollection(),
      cameras: [
        {
          id: 'camera.garage',
          name: 'Garage Camera',
          room: 'Garage',
          size: 'medium',
          providerId: 'home_assistant',
          sourceDeviceId: 'device-garage',
          state: 'idle',
          securityKind: 'camera',
          securitySeverity: 'normal',
        },
        {
          id: 'camera.garage_2',
          name: 'Garage Camera',
          room: 'Garage',
          size: 'medium',
          providerId: 'home_assistant',
          sourceDeviceId: 'device-garage',
          state: 'idle',
          securityKind: 'camera',
          securitySeverity: 'warning',
        },
      ],
    };

    expect(getExpandedHiddenDashboardEntityIds(devices, ['camera.garage'])).toEqual([
      'camera.garage',
      'camera.garage_2',
    ]);

    const visibility = buildDashboardVisibilityResult(devices, ['camera.garage']);

    expect(visibility.visibleDevices.cameras).toEqual([]);
  });
});
