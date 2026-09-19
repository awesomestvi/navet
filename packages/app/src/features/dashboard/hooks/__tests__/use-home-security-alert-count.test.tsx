import { createEmptyDeviceCollection } from '@navet/app/core/navet-device-collections';
import * as securityDashboardModel from '@navet/app/features/security/utils/security-camera-dashboard-model';
import type {
  CameraDevice,
  CoverDevice,
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

/** Creates an ordinary cover fixture that is open but is not a security candidate. */
function cover(overrides: Partial<CoverDevice> = {}): CoverDevice {
  return {
    id: 'cover.living_room_blind',
    name: 'Living Room Blind',
    room: 'Living Room',
    size: 'small',
    position: 100,
    deviceClass: 'blind',
    ...overrides,
  };
}

/** Runs the Home security alert hook against a supplied device collection. */
function useFixtureHomeSecurityAlertCount({ devices }: { devices: DeviceCollection }) {
  return useHomeSecurityAlertCount({
    devices,
    enabled: true,
    hiddenEntityIds: EMPTY_HIDDEN_ENTITY_IDS,
  });
}

/** Verifies that ordinary open covers cannot inflate Home or room security alert counts. */
function verifyOrdinaryOpenCoversAreExcluded() {
  const openDoor = sensor({
    id: 'binary_sensor.front_door',
    name: 'Front Door',
    unit: '',
    value: 'Open',
    status: 'active',
    securityKind: 'door',
    securitySeverity: 'warning',
  });
  const devices: DeviceCollection = {
    ...createEmptyDeviceCollection(),
    covers: [
      cover({ id: 'cover.blind_1', name: 'Blind 1' }),
      cover({ id: 'cover.blind_2', name: 'Blind 2' }),
      cover({ id: 'cover.blind_3', name: 'Blind 3' }),
      cover({ id: 'cover.blind_4', name: 'Blind 4' }),
      cover({ id: 'cover.blind_5', name: 'Blind 5' }),
      cover({ id: 'cover.blind_6', name: 'Blind 6' }),
    ],
    sensors: [openDoor],
  };

  const { result } = renderHook(useFixtureHomeSecurityAlertCount, {
    initialProps: { devices },
  });

  expect(result.current).toBe(1);
  expect(getRoomSecurityAlertCount(devices, [], 'Living Room')).toBe(0);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useHomeSecurityAlertCount', () => {
  it('removes cleared hazards from both Home and room alert counts as their status updates', () => {
    const devices = {
      ...createEmptyDeviceCollection(),
      sensors: Array.from({ length: 6 }, (_, index) =>
        sensor({
          id: `binary_sensor.leak_${index}`,
          unit: '',
          value: 'Detected',
          status: 'active',
          securityKind: 'waterLeak',
          securitySeverity: 'warning',
        })
      ),
    };
    const { result, rerender } = renderHook(
      ({ devices }: { devices: DeviceCollection }) =>
        useHomeSecurityAlertCount({ devices, enabled: true, hiddenEntityIds: [] }),
      { initialProps: { devices } }
    );
    expect(result.current).toBe(6);
    expect(getRoomSecurityAlertCount(devices, [], 'Hallway')).toBe(6);

    const clearedDevices: DeviceCollection = {
      ...devices,
      sensors: devices.sensors.map((device) => ({ ...device, status: 'clear', value: 'Clear' })),
    };
    rerender({ devices: clearedDevices });
    expect(result.current).toBe(0);
    expect(getRoomSecurityAlertCount(clearedDevices, [], 'Hallway')).toBe(0);
  });

  it(
    'does not count ordinary open covers that the Security dashboard excludes',
    verifyOrdinaryOpenCoversAreExcluded
  );

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

  it('refreshes a stale Home alert when a selected device changes without a new object', () => {
    const warningLock = lock();
    const devices: DeviceCollection = {
      ...createEmptyDeviceCollection(),
      locks: [warningLock],
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

    warningLock.state = true;
    warningLock.securitySeverity = 'normal';
    rerender({ currentDevices: { ...devices } });

    expect(result.current).toBe(0);
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

  it('excludes a directly hidden active security sensor from the home alert count', () => {
    const activeDoor = sensor({
      id: 'binary_sensor.side_door',
      name: 'Side Door',
      unit: '',
      value: 'Open',
      securityKind: 'door',
      securitySeverity: 'warning',
      status: 'active',
    });
    const devices: DeviceCollection = {
      ...createEmptyDeviceCollection(),
      sensors: [activeDoor],
    };
    const { result } = renderHook(() =>
      useHomeSecurityAlertCount({
        devices,
        enabled: true,
        hiddenEntityIds: [activeDoor.id],
      })
    );

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
