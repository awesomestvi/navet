import { getSecurityDashboardAlertCount } from '@navet/app/features/security/utils/security-camera-dashboard-model';
import {
  getAbsorbedDashboardEntityIds,
  getExpandedHiddenDashboardEntityIds,
} from '@navet/app/hooks/use-dashboard-devices';
import type { BaseDevice, DeviceCollection, SecurityKind } from '@navet/app/types/device.types';
import { getDeviceRoomLabel } from '@navet/app/utils/device-location';
import { useEffect, useMemo, useRef } from 'react';

type HomeSecurityAlertDevices = Pick<
  DeviceCollection,
  'cameras' | 'covers' | 'helpers' | 'locks' | 'sensors'
>;

const EMPTY_SECURITY_ALERT_DEVICES: HomeSecurityAlertDevices = {
  cameras: [],
  covers: [],
  helpers: [],
  locks: [],
  sensors: [],
};
const NON_ALERT_SECURITY_KINDS = new Set<SecurityKind>([
  'button',
  'deviceTracker',
  'event',
  'person',
]);

function isSupplementalSecurityAlertDevice(device: Pick<BaseDevice, 'securityKind'>) {
  return Boolean(device.securityKind && !NON_ALERT_SECURITY_KINDS.has(device.securityKind));
}

function areDeviceArraysEqual<T>(left: T[], right: T[]) {
  return left.length === right.length && left.every((device, index) => device === right[index]);
}

function stabilizeSecurityAlertDevices(
  previous: HomeSecurityAlertDevices,
  next: HomeSecurityAlertDevices
): HomeSecurityAlertDevices {
  const cameras = areDeviceArraysEqual(previous.cameras, next.cameras)
    ? previous.cameras
    : next.cameras;
  const covers = areDeviceArraysEqual(previous.covers, next.covers) ? previous.covers : next.covers;
  const helpers = areDeviceArraysEqual(previous.helpers, next.helpers)
    ? previous.helpers
    : next.helpers;
  const locks = areDeviceArraysEqual(previous.locks, next.locks) ? previous.locks : next.locks;
  const sensors = areDeviceArraysEqual(previous.sensors, next.sensors)
    ? previous.sensors
    : next.sensors;

  if (
    cameras === previous.cameras &&
    covers === previous.covers &&
    helpers === previous.helpers &&
    locks === previous.locks &&
    sensors === previous.sensors
  ) {
    return previous;
  }

  return { cameras, covers, helpers, locks, sensors };
}

export function selectHomeSecurityAlertDevices(
  devices: DeviceCollection,
  hiddenEntityIds: string[]
): HomeSecurityAlertDevices {
  const expandedHiddenIds = new Set(getExpandedHiddenDashboardEntityIds(devices, hiddenEntityIds));
  const absorbedIds = new Set(getAbsorbedDashboardEntityIds(devices, []));

  return {
    cameras: devices.cameras.filter((device) => !expandedHiddenIds.has(device.id)),
    covers: devices.covers.filter((device) => !expandedHiddenIds.has(device.id)),
    helpers: devices.helpers.filter(
      (device) =>
        !expandedHiddenIds.has(device.id) &&
        !absorbedIds.has(device.id) &&
        isSupplementalSecurityAlertDevice(device)
    ),
    locks: devices.locks.filter((device) => !expandedHiddenIds.has(device.id)),
    sensors: devices.sensors.filter(
      (device) =>
        !expandedHiddenIds.has(device.id) &&
        !absorbedIds.has(device.id) &&
        isSupplementalSecurityAlertDevice(device)
    ),
  };
}

export function getRoomSecurityAlertCount(
  devices: DeviceCollection,
  hiddenEntityIds: string[],
  room: string
) {
  const selectedDevices = selectHomeSecurityAlertDevices(devices, hiddenEntityIds);
  return getSecurityDashboardAlertCount({
    cameras: selectedDevices.cameras.filter((device) => getDeviceRoomLabel(device) === room),
    covers: selectedDevices.covers.filter((device) => getDeviceRoomLabel(device) === room),
    helpers: selectedDevices.helpers.filter((device) => getDeviceRoomLabel(device) === room),
    locks: selectedDevices.locks.filter((device) => getDeviceRoomLabel(device) === room),
    sensors: selectedDevices.sensors.filter((device) => getDeviceRoomLabel(device) === room),
  });
}

export function useHomeSecurityAlertCount({
  devices,
  enabled,
  hiddenEntityIds,
}: {
  devices: DeviceCollection;
  enabled: boolean;
  hiddenEntityIds: string[];
}) {
  const previousDevicesRef = useRef<HomeSecurityAlertDevices>(EMPTY_SECURITY_ALERT_DEVICES);
  const selectedDevices = useMemo(() => {
    return enabled
      ? selectHomeSecurityAlertDevices(devices, hiddenEntityIds)
      : EMPTY_SECURITY_ALERT_DEVICES;
  }, [devices, enabled, hiddenEntityIds]);
  const securityAlertDevices = useMemo(
    () => stabilizeSecurityAlertDevices(previousDevicesRef.current, selectedDevices),
    [selectedDevices]
  );

  useEffect(() => {
    previousDevicesRef.current = securityAlertDevices;
  }, [securityAlertDevices]);

  return useMemo(
    () => (enabled ? getSecurityDashboardAlertCount(securityAlertDevices) : 0),
    [enabled, securityAlertDevices]
  );
}
