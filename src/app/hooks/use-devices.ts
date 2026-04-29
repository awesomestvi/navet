import { useMemo } from 'react';
import type { DeviceCollection } from '../types/device.types';
import { getAllRooms } from '../utils/device-location';
import { useCalendarDevices, useHADevices, useWeatherDevices } from './use-ha-devices';

export const useDevices = (): DeviceCollection => useHADevices();
export const useCalendarDevicesCollection = () => useCalendarDevices();
export const useWeatherDevicesCollection = () => useWeatherDevices();

export const useRooms = (devices: DeviceCollection): string[] =>
  useMemo(() => getAllRooms(devices), [devices]);
