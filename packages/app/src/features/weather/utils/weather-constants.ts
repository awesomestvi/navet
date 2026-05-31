/**
 * Weather card constants and configuration.
 */

/**
 * Opacity values for weather card theme variants.
 * These control the intensity of gradient overlays and backgrounds.
 */
export const WEATHER_CARD_OPACITY = {
  light: 0.55,
  dark: 0.28,
  black: 0.18,
} as const;

/**
 * Weather icon size multipliers for different card sizes.
 */
export const WEATHER_ICON_SIZE = {
  small: 32,
  medium: 48,
  large: 64,
  'extra-large': 80,
} as const;

/**
 * Temperature display precision (decimal places).
 */
export const WEATHER_TEMP_DECIMALS = 0;

/**
 * Wind speed display precision.
 */
export const WEATHER_WIND_DECIMALS = 1;

/**
 * Humidity display precision.
 */
export const WEATHER_HUMIDITY_DECIMALS = 0;

/**
 * Forecast days to show for different card sizes.
 */
export const WEATHER_FORECAST_DAYS = {
  small: 3,
  medium: 5,
  large: 7,
} as const;

/**
 * Hourly forecast hours to show.
 */
export const WEATHER_HOURLY_FORECAST_HOURS = 24;
