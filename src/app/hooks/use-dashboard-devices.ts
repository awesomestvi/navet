import { useMemo } from 'react';
import type { DeviceCollection } from '../types/device.types';

export const useDashboardDevices = (
  devices: DeviceCollection,
  hiddenEntityIds: string[]
): DeviceCollection => {
  return useMemo(() => {
    const hiddenIds = new Set(hiddenEntityIds);

    return {
      lights: devices.lights.filter((device) => !hiddenIds.has(device.id)),
      hvac: devices.hvac.filter((device) => !hiddenIds.has(device.id)),
      climate: devices.climate.filter((device) => !hiddenIds.has(device.id)),
      media: devices.media.filter((device) => !hiddenIds.has(device.id)),
      weather: devices.weather.filter((device) => !hiddenIds.has(device.id)),
      switches: devices.switches.filter((device) => !hiddenIds.has(device.id)),
      helpers: devices.helpers.filter((device) => !hiddenIds.has(device.id)),
      covers: devices.covers.filter((device) => !hiddenIds.has(device.id)),
      locks: devices.locks.filter((device) => !hiddenIds.has(device.id)),
      scenes: devices.scenes.filter((device) => !hiddenIds.has(device.id)),
      persons: devices.persons.filter((device) => !hiddenIds.has(device.id)),
      sensors: devices.sensors.filter((device) => !hiddenIds.has(device.id)),
      vacuums: devices.vacuums.filter((device) => !hiddenIds.has(device.id)),
      calendars: devices.calendars.filter((device) => !hiddenIds.has(device.id)),
      cameras: devices.cameras.filter((device) => !hiddenIds.has(device.id)),
      'grouped-sensors': devices['grouped-sensors'].filter((device) => !hiddenIds.has(device.id)),
    };
  }, [devices, hiddenEntityIds]);
};
