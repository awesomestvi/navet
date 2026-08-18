import { createEmptyDeviceCollection } from '@navet/app/core/navet-device-collections';
import * as securityDashboardModel from '@navet/app/features/security/utils/security-camera-dashboard-model';
import type {
  CameraDevice,
  DeviceCollection,
  LockDevice,
  SensorDevice,
} from '@navet/app/types/device.types';
import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getRoomSecurityAlertCount,
  useHomeSecurityAlertCount,
} from '../use-home-security-alert-count';

const EMPTY_HIDDEN_ENTITY_IDS: string[] = [];

function lock(overrides: Partial<LockDevice> = {}): LockDevice {
  return {
    id: 'lock.front_door',
    name: 'Front Door Lock',
    room: 'Hallway',
    size: 'small',
    state: false,
    securityKind: 'lock',
    securitySeverity: 'warning',
    ...overrides,
  };
}

function sensor(overrides: Partial<SensorDevice> = {}): SensorDevice {
  return {
    id: 'sensor.hall_temperature',
    name: 'Hall Temperature',
    room: 'Hallway',
    size: 'small',
    unit: '°C',
    value: '21',
    ...overrides,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useHomeSecurityAlertCount', () => {
  it('does not recompute security alerts when an unrelated sensor updates', () => {
    const alertCountSpy = vi.spyOn(securityDashboardModel, 'getSecurityDashboardAlertCount');
    const fullModelSpy = vi.spyOn(securityDashboardModel, 'buildSecurityCameraDashboardModel');
    const warningLock = lock();
    const temperatureSensor = sensor();
    const devices: DeviceCollection = {
      ...createEmptyDeviceCollection(),
      locks: [warningLock],
      sensors: [temperatureSensor],
    };
    const { result, rerender } = renderHook(
      ({ currentDevices }: { currentDevices: DeviceCollection }) =>
        useHomeSecurityAlertCount({
          devices: currentDevices,
          enabled: true,
          hiddenEntityIds: EMPTY_HIDDEN_ENTITY_IDS,
        }),
      { initialProps: { currentDevices: devices } }
    );

    expect(result.current).toBe(1);
    expect(alertCountSpy).toHaveBeenCalledTimes(1);
    expect(fullModelSpy).not.toHaveBeenCalled();

    rerender({
      currentDevices: {
        ...devices,
        sensors: [{ ...temperatureSensor, value: '22' }],
      },
    });

    expect(result.current).toBe(1);
    expect(alertCountSpy).toHaveBeenCalledTimes(1);
    expect(fullModelSpy).not.toHaveBeenCalled();

    rerender({
      currentDevices: {
        ...devices,
        locks: [lock({ securitySeverity: 'normal', state: true })],
      },
    });

    expect(result.current).toBe(0);
    expect(alertCountSpy).toHaveBeenCalledTimes(2);
    expect(fullModelSpy).not.toHaveBeenCalled();
  });

  it('keeps an absorbed child hidden when its parent card is hidden', () => {
    const parentLock = lock({
      securitySeverity: 'normal',
      state: true,
      underlyingDeviceId: 'front-door-device',
    });
    const childContact = sensor({
      id: 'binary_sensor.front_door_contact',
      name: 'Front Door Contact',
      unit: '',
      value: 'Open',
      securityKind: 'door',
      securitySeverity: 'warning',
      status: 'active',
      underlyingDeviceId: 'front-door-device',
    });
    const devices: DeviceCollection = {
      ...createEmptyDeviceCollection(),
      locks: [parentLock],
      sensors: [childContact],
    };
    const { result, rerender } = renderHook(
      ({ hiddenEntityIds }: { hiddenEntityIds: string[] }) =>
        useHomeSecurityAlertCount({
          devices,
          enabled: true,
          hiddenEntityIds,
        }),
      { initialProps: { hiddenEntityIds: EMPTY_HIDDEN_ENTITY_IDS } }
    );

    expect(result.current).toBe(0);

    rerender({ hiddenEntityIds: [parentLock.id] });

    expect(result.current).toBe(0);
  });

  it('excludes a hidden unavailable camera from its room alert count', () => {
    const unavailableCamera: CameraDevice = {
      id: 'camera.bedroom',
      name: 'Bedroom Camera',
      room: 'Bedroom',
      size: 'medium',
      state: 'unavailable',
      securitySeverity: 'unknown',
      supportedFeatures: 2,
      isStreamCapable: true,
      isStillImageOnly: false,
    };
    const devices: DeviceCollection = {
      ...createEmptyDeviceCollection(),
      cameras: [unavailableCamera],
    };

    expect(getRoomSecurityAlertCount(devices, [], 'Bedroom')).toBe(1);
    expect(getRoomSecurityAlertCount(devices, [unavailableCamera.id], 'Bedroom')).toBe(0);
  });
});
