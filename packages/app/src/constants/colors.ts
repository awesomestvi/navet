/**
 * Centralized color constants for the application
 * Avoid hardcoded color values throughout the codebase
 */

/** Default color for custom light entities when no color is specified */
export const DEFAULT_LIGHT_CUSTOM_COLOR = '#FFA500';

/** Storybook accent color (purple) */
export const STORYBOOK_ACCENT_PURPLE = '#7c3aed';

/** Common accent colors */
export const ACCENT_COLORS = {
  purple: '#7c3aed',
  blue: '#3b82f6',
  green: '#22c55e',
  orange: '#f97316',
  red: '#ef4444',
  pink: '#ec4899',
  indigo: '#6366f1',
  teal: '#14b8a6',
} as const;

/** Domain-specific default colors */
export const DOMAIN_COLORS = {
  light: '#fbbf24',
  switch: '#22c55e',
  cover: '#64748b',
  climate: '#f97316',
  media_player: '#8b5cf6',
  vacuum: '#06b6d4',
  camera: '#ef4444',
  alarm_control_panel: '#dc2626',
} as const;
