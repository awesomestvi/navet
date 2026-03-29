import { useMemo } from 'react';
import type { DeviceCollection } from '../types/device.types';
import { getAllRooms } from '../utils/device-location';
import { useHADevices } from './use-ha-devices';

export const useDevices = (): DeviceCollection => useHADevices();

export const useRooms = (devices: DeviceCollection): string[] =>
  useMemo(() => getAllRooms(devices), [devices]);
