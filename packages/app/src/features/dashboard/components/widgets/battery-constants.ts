/**
 * Battery widget constants and thresholds.
 */

/**
 * Battery level color thresholds (percentage).
 * These define when to show warning colors for low battery.
 */
export const BATTERY_LEVEL_THRESHOLDS = {
  /** Critical: Show red warning */
  CRITICAL: 20,
  /** Low: Show orange warning */
  LOW: 40,
  /** Medium: Show yellow/amber */
  MEDIUM: 60,
  /** High: Show green/good */
  HIGH: 80,
} as const;

/**
 * Battery level colors (hex values).
 * Consider moving to theme tokens for better theming support.
 */
export const BATTERY_LEVEL_COLORS = {
  critical: '#ef4444', // Red-500
  low: '#f97316', // Orange-500
  medium: '#eab308', // Yellow-500
  high: '#22c55e', // Green-500
  full: '#3b82f6', // Blue-500
} as const;

/**
 * Battery charging status thresholds.
 */
export const BATTERY_CHARGING_THRESHOLDS = {
  /** Considered "full" when above this percentage */
  FULL_THRESHOLD: 95,
  /** Considered "low" when below this percentage */
  LOW_THRESHOLD: 20,
} as const;

/**
 * Battery power flow thresholds (Watts).
 */
export const BATTERY_POWER_THRESHOLDS = {
  /** Minimum power to consider as charging */
  CHARGING_MIN_W: 10,
  /** Minimum power to consider as discharging */
  DISCHARGING_MIN_W: 10,
} as const;

/**
 * Display precision for battery metrics.
 */
export const BATTERY_METRIC_DECIMALS = {
  percentage: 0,
  power: 1,
  energy: 2,
} as const;

/**
 * Time-to-full/empty update interval (ms).
 */
export const BATTERY_TIME_ESTIMATE_UPDATE_MS = 60000;
