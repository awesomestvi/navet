import { useCallback, useMemo, useRef } from 'react';
import type { DeviceCollection, DeviceWithType } from '../types/device.types';

function areDevicesEqual(a: DeviceWithType, b: DeviceWithType): boolean {
  const aRaw = a as Record<string, unknown>;
  const bRaw = b as Record<string, unknown>;
  const aKeys = Object.keys(aRaw);
  const bKeys = Object.keys(bRaw);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    const av = aRaw[key];
    const bv = bRaw[key];
    if (av === bv) continue;
    if (Array.isArray(av) && Array.isArray(bv)) {
      if (av.length !== bv.length) return false;
      if (JSON.stringify(av) !== JSON.stringify(bv)) return false;
      continue;
    }
    return false;
  }
  return true;
}

export const useDeviceMap = (devices: DeviceCollection) => {
  const {
    lights,
    hvac,
    climate,
    power,
    media,
    weather,
    switches,
    helpers,
    covers,
    locks,
    scenes,
    persons,
    sensors,
    vacuums,
    calendars,
    cameras,
    'grouped-sensors': groupedSensors,
  } = devices;

  const prevMapRef = useRef<Map<string, DeviceWithType>>(new Map());

  const deviceMap = useMemo(() => {
    const prev = prevMapRef.current;
    const map = new Map<string, DeviceWithType>();
    const groups = [
      ['lights', lights],
      ['hvac', hvac],
      ['climate', climate],
      ['power', power],
      ['media', media],
      ['weather', weather],
      ['switches', switches],
      ['helpers', helpers],
      ['covers', covers],
      ['locks', locks],
      ['scenes', scenes],
      ['persons', persons],
      ['sensors', sensors],
      ['vacuums', vacuums],
      ['calendars', calendars],
      ['cameras', cameras],
      ['grouped-sensors', groupedSensors],
    ] as const;

    let changed = false;

    for (const [type, arr] of groups) {
      for (const device of arr) {
        const newDevice = { ...device, type } as DeviceWithType;
        const prevDevice = prev.get(device.id);
        if (prevDevice !== undefined && areDevicesEqual(prevDevice, newDevice)) {
          map.set(device.id, prevDevice);
        } else {
          map.set(device.id, newDevice);
          changed = true;
        }
      }
    }

    if (!changed && prev.size === map.size) {
      return prev;
    }

    prevMapRef.current = map;
    return map;
  }, [
    calendars,
    cameras,
    climate,
    covers,
    groupedSensors,
    helpers,
    hvac,
    lights,
    locks,
    scenes,
    media,
    persons,
    power,
    sensors,
    switches,
    vacuums,
    weather,
  ]);

  const getDevice = useCallback(
    (id: string): DeviceWithType | undefined => deviceMap.get(id),
    [deviceMap]
  );

  return { deviceMap, getDevice };
};
