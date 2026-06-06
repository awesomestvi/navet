import { useMemo } from 'react';
import type { DeviceCollection } from '../types/device.types';

const EMPTY_DEVICES: [] = [];

function filterVisibleDevices<T extends { id: string }>(devices: T[], hiddenIds: Set<string>): T[] {
  if (devices.length === 0 || hiddenIds.size === 0) {
    return devices;
  }

  const visibleDevices = devices.filter((device) => !hiddenIds.has(device.id));
  return visibleDevices.length === devices.length ? devices : visibleDevices;
}

function filterVisibleSensors<T extends { id: string }>(
  devices: T[],
  hiddenIds: Set<string>,
  shownSensorIds: Set<string>
): T[] {
  if (devices.length === 0) {
    return devices;
  }

  if (shownSensorIds.size === 0) {
    return EMPTY_DEVICES;
  }

  const visibleSensors = devices.filter(
    (device) => shownSensorIds.has(device.id) && !hiddenIds.has(device.id)
  );
  return visibleSensors.length === devices.length ? devices : visibleSensors;
}

export const useDashboardDevices = (
  devices: DeviceCollection,
  hiddenEntityIds: string[],
  shownSensorEntityIds: string[] = []
): DeviceCollection => {
  return useMemo(() => {
    const hiddenIds = new Set(hiddenEntityIds);
    const shownSensorIds = new Set(shownSensorEntityIds);
    const nextDevices: DeviceCollection = {
      lights: filterVisibleDevices(devices.lights, hiddenIds),
      fans: filterVisibleDevices(devices.fans, hiddenIds),
      hvac: filterVisibleDevices(devices.hvac, hiddenIds),
      climate: filterVisibleDevices(devices.climate, hiddenIds),
      media: filterVisibleDevices(devices.media, hiddenIds),
      weather: filterVisibleDevices(devices.weather, hiddenIds),
      switches: filterVisibleDevices(devices.switches, hiddenIds),
      helpers: filterVisibleDevices(devices.helpers, hiddenIds),
      covers: filterVisibleDevices(devices.covers, hiddenIds),
      locks: filterVisibleDevices(devices.locks, hiddenIds),
      scenes: filterVisibleDevices(devices.scenes, hiddenIds),
      persons: filterVisibleDevices(devices.persons, hiddenIds),
      sensors: filterVisibleSensors(devices.sensors, hiddenIds, shownSensorIds),
      vacuums: filterVisibleDevices(devices.vacuums, hiddenIds),
      calendars: filterVisibleDevices(devices.calendars, hiddenIds),
      cameras: filterVisibleDevices(devices.cameras, hiddenIds),
      'grouped-sensors': filterVisibleDevices(devices['grouped-sensors'], hiddenIds),
    };

    const unchanged =
      nextDevices.lights === devices.lights &&
      nextDevices.fans === devices.fans &&
      nextDevices.hvac === devices.hvac &&
      nextDevices.climate === devices.climate &&
      nextDevices.media === devices.media &&
      nextDevices.weather === devices.weather &&
      nextDevices.switches === devices.switches &&
      nextDevices.helpers === devices.helpers &&
      nextDevices.covers === devices.covers &&
      nextDevices.locks === devices.locks &&
      nextDevices.scenes === devices.scenes &&
      nextDevices.persons === devices.persons &&
      nextDevices.sensors === devices.sensors &&
      nextDevices.vacuums === devices.vacuums &&
      nextDevices.calendars === devices.calendars &&
      nextDevices.cameras === devices.cameras &&
      nextDevices['grouped-sensors'] === devices['grouped-sensors'];

    return unchanged ? devices : nextDevices;
  }, [devices, hiddenEntityIds, shownSensorEntityIds]);
};
