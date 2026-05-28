import type { NavetDevice } from './navet';

interface NavetBaseDeviceState {
  value?: string;
  size?: 'small' | 'medium' | 'large';
}

export interface NavetLightState extends NavetBaseDeviceState {
  brightnessPct?: number;
  colorTemperatureKelvin?: number;
  deviceClass?: string;
  entityType?: string;
  lastChanged?: string;
  lastUpdated?: string;
}

export interface NavetClimateState extends NavetBaseDeviceState {
  temperature?: number;
  currentTemperature?: number;
  temperatureUnit?: 'celsius' | 'fahrenheit';
  mode?: string;
  action?: string;
  supportedHvacModes?: string[];
  serviceDomain?: string;
}

export interface NavetMediaState extends NavetBaseDeviceState {
  title?: string;
  artist?: string;
  deviceClass?: string;
  source?: string;
  sourceList?: string[];
  entityPicture?: string;
  volume?: number;
  isMuted?: boolean;
  elapsedSeconds?: number;
  durationSeconds?: number;
  positionUpdatedAt?: string;
  supportsGrouping?: boolean;
  supportsPreviousTrack?: boolean;
  supportsNextTrack?: boolean;
  supportedFeatures?: number;
  groupMembers?: string[];
}

export interface NavetCameraState extends NavetBaseDeviceState {
  entityPicture?: string;
  supportedFeatures?: number;
  isStreamCapable?: boolean;
  isStillImageOnly?: boolean;
  lastChanged?: string;
  lastUpdated?: string;
}

function readDeviceState<TState extends object>(
  device: NavetDevice | null | undefined
): TState | null {
  if (!device?.state || typeof device.state !== 'object') {
    return null;
  }

  return device.state as TState;
}

export function readNavetLightState(
  device: NavetDevice | null | undefined
): NavetLightState | null {
  return readDeviceState<NavetLightState>(device);
}

export function readNavetClimateState(
  device: NavetDevice | null | undefined
): NavetClimateState | null {
  return readDeviceState<NavetClimateState>(device);
}

export function readNavetMediaState(
  device: NavetDevice | null | undefined
): NavetMediaState | null {
  return readDeviceState<NavetMediaState>(device);
}

export function readNavetCameraState(
  device: NavetDevice | null | undefined
): NavetCameraState | null {
  return readDeviceState<NavetCameraState>(device);
}
