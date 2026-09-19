import {
  getSecurityDashboardAlertCount,
  isSecurityDashboardDevice,
} from '@navet/app/features/security/utils/security-camera-dashboard-model';
import {
  getAbsorbedDashboardEntityIds,
  getExpandedHiddenDashboardEntityIds,
  isDashboardEntityHidden,
} from '@navet/app/hooks/use-dashboard-devices';
import type { BaseDevice, DeviceCollection, SecurityKind } from '@navet/app/types/device.types';
import { getDeviceRoomLabel } from '@navet/app/utils/device-location';
import { roomNamesMatch } from '@navet/app/utils/room-name';
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

interface HomeSecurityAlertSnapshot {
  devices: HomeSecurityAlertDevices;
  revision: string;
}

function getSecurityAlertDevicesRevision(devices: HomeSecurityAlertDevices): string {
  return JSON.stringify(devices);
}

function stabilizeSecurityAlertDevices(
  previous: HomeSecurityAlertSnapshot,
  nextDevices: HomeSecurityAlertDevices,
  nextRevision: string
): HomeSecurityAlertSnapshot {
  return previous.revision === nextRevision
    ? previous
    : { devices: nextDevices, revision: nextRevision };
}

/**
 * Selects the visible devices that follow the same security-candidate rules as the Security page.
 */
export function selectHomeSecurityAlertDevices(
  devices: DeviceCollection,
  hiddenEntityIds: string[]
): HomeSecurityAlertDevices {
  const expandedHiddenIds = new Set(getExpandedHiddenDashboardEntityIds(devices, hiddenEntityIds));
  const absorbedIds = new Set(getAbsorbedDashboardEntityIds(devices, []));

  return {
    cameras: devices.cameras.filter(
      (device) => !isDashboardEntityHidden(device, expandedHiddenIds)
    ),
    covers: devices.covers.filter(
      (device) =>
        isSecurityDashboardDevice(device) && !isDashboardEntityHidden(device, expandedHiddenIds)
    ),
    helpers: devices.helpers.filter(
      (device) =>
        !isDashboardEntityHidden(device, expandedHiddenIds) &&
        !absorbedIds.has(device.id) &&
        isSupplementalSecurityAlertDevice(device)
    ),
    locks: devices.locks.filter((device) => !isDashboardEntityHidden(device, expandedHiddenIds)),
    sensors: devices.sensors.filter(
      (device) =>
        !isDashboardEntityHidden(device, expandedHiddenIds) &&
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
    cameras: selectedDevices.cameras.filter((device) =>
      roomNamesMatch(getDeviceRoomLabel(device), room)
    ),
    covers: selectedDevices.covers.filter((device) =>
      roomNamesMatch(getDeviceRoomLabel(device), room)
    ),
    helpers: selectedDevices.helpers.filter((device) =>
      roomNamesMatch(getDeviceRoomLabel(device), room)
    ),
    locks: selectedDevices.locks.filter((device) =>
      roomNamesMatch(getDeviceRoomLabel(device), room)
    ),
    sensors: selectedDevices.sensors.filter((device) =>
      roomNamesMatch(getDeviceRoomLabel(device), room)
    ),
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
  const previousSnapshotRef = useRef<HomeSecurityAlertSnapshot>({
    devices: EMPTY_SECURITY_ALERT_DEVICES,
    revision: getSecurityAlertDevicesRevision(EMPTY_SECURITY_ALERT_DEVICES),
  });
  const selectedDevices = useMemo(() => {
    return enabled
      ? selectHomeSecurityAlertDevices(devices, hiddenEntityIds)
      : EMPTY_SECURITY_ALERT_DEVICES;
  }, [devices, enabled, hiddenEntityIds]);
  const selectedDevicesRevision = getSecurityAlertDevicesRevision(selectedDevices);
  const securityAlertSnapshot = useMemo(
    () =>
      stabilizeSecurityAlertDevices(
        previousSnapshotRef.current,
        selectedDevices,
        selectedDevicesRevision
      ),
    [selectedDevices, selectedDevicesRevision]
  );

  useEffect(() => {
    previousSnapshotRef.current = securityAlertSnapshot;
  }, [securityAlertSnapshot]);

  return useMemo(
    () => (enabled ? getSecurityDashboardAlertCount(securityAlertSnapshot.devices) : 0),
    [enabled, securityAlertSnapshot]
  );
}
