export type NavetCapabilityId =
  | 'number_value'
  | 'select_option'
  | 'text_value'
  | 'datetime_value'
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
  'number_value',
  'select_option',
  'text_value',
  'datetime_value',
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
