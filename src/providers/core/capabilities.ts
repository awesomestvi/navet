export type NavetCapabilityId =
  | 'toggle'
  | 'brightness'
  | 'color_temperature'
  | 'fan_speed'
  | 'lock'
  | 'position'
  | 'temperature_setpoint'
  | 'media_playback'
  | 'camera_snapshot'
  | 'presence'
  | 'numeric_sensor';

export const NAVET_CAPABILITY_IDS: readonly NavetCapabilityId[] = [
  'toggle',
  'brightness',
  'color_temperature',
  'fan_speed',
  'lock',
  'position',
  'temperature_setpoint',
  'media_playback',
  'camera_snapshot',
  'presence',
  'numeric_sensor',
] as const;
