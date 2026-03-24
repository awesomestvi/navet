import { useMemo } from 'react';
import { DEVICES } from '../data/mock-devices';
import { homeAssistantSelectors } from '../stores/selectors';
import type { DeviceCollection } from '../types/device.types';
import { getAllRooms } from '../utils/device-location';
import { useHADevices } from './use-ha-devices';
import { useHomeAssistant } from './use-home-assistant';

/**
 * Custom hook for managing devices
 * Uses Home Assistant live entities when connected and falls back to bundled
 * mock data when disconnected.
 */
export const useDevices = (): DeviceCollection => {
  const connected = useHomeAssistant(homeAssistantSelectors.connected);
  const haDevices = useHADevices();
  const fallbackDevices = useMemo(
    () => ({
      ...DEVICES,
      ...haDevices,
    }),
    [haDevices]
  );

  const devices = useMemo(
    () => (connected ? haDevices : fallbackDevices),
    [connected, fallbackDevices, haDevices]
  );

  return devices;
};

/**
 * Hook for getting list of all rooms
 * Extracts unique rooms from devices
 */
export const useRooms = (devices: DeviceCollection): string[] =>
  useMemo(() => getAllRooms(devices), [devices]);
