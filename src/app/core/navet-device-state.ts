import type { NavetDevice } from '@navet/app/internal/compat-models';
import type { NavetEntity } from '@navet/core/types';

interface NavetBaseDeviceState {
  value?: string;
  size?: 'small' | 'medium' | 'large';
}

export interface NavetMediaCapabilities {
  canAnnounce: boolean;
  canBrowseMedia: boolean;
  canClearPlaylist: boolean;
  canEnqueue: boolean;
  canGroup: boolean;
  canMuteVolume: boolean;
  canNextTrack: boolean;
  canPlay: boolean;
  canPlayMedia: boolean;
  canPreviousTrack: boolean;
  canRepeat: boolean;
  canSearchMedia: boolean;
  canSeek: boolean;
  canSelectSoundMode: boolean;
  canSelectSource: boolean;
  canSetVolume: boolean;
  canShuffle: boolean;
  canStop: boolean;
  canTurnOff: boolean;
  canTurnOn: boolean;
  canVolumeStep: boolean;
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
  mediaCapabilities?: NavetMediaCapabilities;
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
  motionDetectionEnabled?: boolean;
  lastChanged?: string;
  lastUpdated?: string;
}

export interface NavetCoverState extends NavetBaseDeviceState {
  position?: number;
  positionMode?: 'position' | 'tilt';
  deviceClass?: string;
  supportedFeatures?: number;
  hasPosition?: boolean;
}

export interface NavetLockState extends NavetBaseDeviceState {
  locked?: boolean;
  deviceClass?: string;
  presentation?: 'vehicle' | 'standard';
}

export interface NavetPersonState extends NavetBaseDeviceState {
  location?: string;
  entityPicture?: string;
  batteryLevel?: number;
  address?: string;
  locationName?: string;
  geocodedLocation?: string;
  zone?: string;
}

export interface NavetSensorState extends NavetBaseDeviceState {
  icon?: string;
  unit?: string;
  entityType?: string;
  deviceClass?: string;
  status?: 'measurement' | 'active' | 'clear' | 'unavailable';
  lastUpdated?: string;
}

type NavetStatefulModel = NavetDevice | NavetEntity;

function readDeviceState<TState extends object>(
  device: NavetStatefulModel | null | undefined
): TState | null {
  if (!device) {
    return null;
  }

  if ('state' in device) {
    if (!device.state || typeof device.state !== 'object') {
      return null;
    }

    return device.state as TState;
  }

  const state =
    device.attributes && typeof device.attributes === 'object' ? device.attributes : null;
  if (!state) {
    return null;
  }

  return {
    ...state,
    value: 'value' in state ? state.value : device.primaryState,
    availability: 'availability' in state ? state.availability : device.availability,
    lastUpdated:
      'lastUpdated' in state
        ? state.lastUpdated
        : 'last_updated' in state
          ? state.last_updated
          : device.lastUpdated,
  } as TState;
}

export function readNavetLightState(
  device: NavetStatefulModel | null | undefined
): NavetLightState | null {
  return readDeviceState<NavetLightState>(device);
}

export function readNavetClimateState(
  device: NavetStatefulModel | null | undefined
): NavetClimateState | null {
  return readDeviceState<NavetClimateState>(device);
}

export function readNavetMediaState(
  device: NavetStatefulModel | null | undefined
): NavetMediaState | null {
  return readDeviceState<NavetMediaState>(device);
}

export function readNavetCameraState(
  device: NavetStatefulModel | null | undefined
): NavetCameraState | null {
  return readDeviceState<NavetCameraState>(device);
}

export function readNavetCoverState(
  device: NavetStatefulModel | null | undefined
): NavetCoverState | null {
  return readDeviceState<NavetCoverState>(device);
}

export function readNavetLockState(
  device: NavetStatefulModel | null | undefined
): NavetLockState | null {
  return readDeviceState<NavetLockState>(device);
}

export function readNavetPersonState(
  device: NavetStatefulModel | null | undefined
): NavetPersonState | null {
  return readDeviceState<NavetPersonState>(device);
}

export function readNavetSensorState(
  device: NavetStatefulModel | null | undefined
): NavetSensorState | null {
  return readDeviceState<NavetSensorState>(device);
}
