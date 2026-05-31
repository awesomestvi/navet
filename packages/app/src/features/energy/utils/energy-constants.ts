/**
 * Energy dashboard constants and thresholds.
 *
 * These values define the behavior of the energy dashboard mode detection
 * and flow visualization.
 */

/**
 * Power threshold (Watts) above which grid import is considered "peak" demand.
 * When import exceeds this value, the dashboard shows peak mode warnings.
 */
export const PEAK_IMPORT_THRESHOLD_W = 1500;

/**
 * Battery discharge threshold (Watts) below which battery saver mode activates.
 * Negative values indicate discharge. When battery discharge exceeds this threshold,
 * the dashboard shows battery saver mode.
 */
export const BATTERY_DISCHARGE_THRESHOLD_W = -1200;

/**
 * Solar renewable ratio threshold (0-1).
 * When solar generation exceeds this fraction of total load, eco mode activates.
 * 0.7 means solar must cover 70% of current load for eco mode.
 */
export const SOLAR_RENEWABLE_RATIO = 0.7;

/**
 * Decimal precision for energy metric display.
 */
export const ENERGY_METRIC_DECIMALS = 1;

/**
 * Battery reserve percentage display precision.
 */
export const BATTERY_PERCENT_DECIMALS = 0;

/**
 * Flow animation speed multiplier for different modes.
 */
export const ENERGY_FLOW_SPEED = {
  peak: 1.5,
  battery_saver: 1.2,
  eco: 0.8,
  normal: 1.0,
} as const;

/**
 * Beam width multiplier for different flow types.
 */
export const ENERGY_BEAM_WIDTH = {
  solar: 1.2,
  battery: 1.0,
  grid: 0.9,
  home: 1.0,
} as const;
