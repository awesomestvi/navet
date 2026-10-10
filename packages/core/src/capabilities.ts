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
  | 'climate_preset'
  | 'climate_fan_mode'
  | 'climate_swing_mode'
  | 'climate_swing_horizontal_mode'
  | 'climate_target_humidity'
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
  'climate_preset',
  'climate_fan_mode',
  'climate_swing_mode',
  'climate_swing_horizontal_mode',
  'climate_target_humidity',
  'media_playback',
  'camera_snapshot',
  'presence',
  'numeric_sensor',
] as const;
