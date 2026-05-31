/**
 * Centralized entity ID constants for the application
 * Avoid hardcoded entity IDs throughout the codebase
 */

/** Sun entity ID */
export const SUN_ENTITY_ID = 'sun.sun' as const;

/** Entity domains */
export const ENTITY_DOMAINS = {
  person: 'person' as const,
  sun: 'sun' as const,
  calendar: 'calendar' as const,
  light: 'light' as const,
  switch: 'switch' as const,
  cover: 'cover' as const,
  climate: 'climate' as const,
  media_player: 'media_player' as const,
  vacuum: 'vacuum' as const,
  camera: 'camera' as const,
  alarm_control_panel: 'alarm_control_panel' as const,
  sensor: 'sensor' as const,
  binary_sensor: 'binary_sensor' as const,
  device_tracker: 'device_tracker' as const,
  scene: 'scene' as const,
  script: 'script' as const,
  automation: 'automation' as const,
  button: 'button' as const,
  input_boolean: 'input_boolean' as const,
  input_select: 'input_select' as const,
  input_number: 'input_number' as const,
  input_datetime: 'input_datetime' as const,
  input_text: 'input_text' as const,
  weather: 'weather' as const,
} as const;

/** Entity categories */
export const ENTITY_CATEGORIES = {
  config: 'config' as const,
  diagnostic: 'diagnostic' as const,
} as const;

/** Device classes */
export const DEVICE_CLASSES = {
  battery: 'battery' as const,
  battery_charging: 'battery_charging' as const,
  carbon_monoxide: 'carbon_monoxide' as const,
  carbon_dioxide: 'carbon_dioxide' as const,
  cold: 'cold' as const,
  connectivity: 'connectivity' as const,
  door: 'door' as const,
  garage_door: 'garage_door' as const,
  gas: 'gas' as const,
  heat: 'heat' as const,
  light: 'light' as const,
  lock: 'lock' as const,
  moisture: 'moisture' as const,
  motion: 'motion' as const,
  moving: 'moving' as const,
  occupancy: 'occupancy' as const,
  opening: 'opening' as const,
  plug: 'plug' as const,
  power: 'power' as const,
  presence: 'presence' as const,
  problem: 'problem' as const,
  running: 'running' as const,
  safety: 'safety' as const,
  smoke: 'smoke' as const,
  sound: 'sound' as const,
  tamper: 'tamper' as const,
  temperature: 'temperature' as const,
  timestamp: 'timestamp' as const,
  update: 'update' as const,
  vibration: 'vibration' as const,
  window: 'window' as const,
} as const;
