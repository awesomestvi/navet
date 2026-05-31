/**
 * Shared gradient constants for dashboard widgets
 *
 * These gradients are too complex to inline and should be reused
 * across components to maintain consistency.
 */

import type { ThemeType } from '@navet/app/hooks/use-theme';

/**
 * Photo frame widget gradient backgrounds
 */
export const PHOTO_FRAME_GRADIENTS = {
  amber:
    'bg-[radial-gradient(circle_at_top_left,_rgba(251,146,60,0.95),_transparent_42%),radial-gradient(circle_at_bottom_right,_rgba(251,146,60,0.15),_transparent_52%)]',
  ocean:
    'bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.95),_transparent_42%),radial-gradient(circle_at_bottom_right,_rgba(56,189,248,0.15),_transparent_52%)]',
  forest:
    'bg-[radial-gradient(circle_at_top_left,_rgba(34,197,94,0.95),_transparent_42%),radial-gradient(circle_at_bottom_right,_rgba(34,197,94,0.15),_transparent_52%)]',
  sunset:
    'bg-[radial-gradient(circle_at_top_left,_rgba(239,68,68,0.95),_transparent_42%),radial-gradient(circle_at_bottom_right,_rgba(239,68,68,0.15),_transparent_52%)]',
  lavender:
    'bg-[radial-gradient(circle_at_top_left,_rgba(168,85,247,0.95),_transparent_42%),radial-gradient(circle_at_bottom_right,_rgba(168,85,247,0.15),_transparent_52%)]',
  midnight:
    'bg-[radial-gradient(circle_at_top_left,_rgba(99,102,241,0.95),_transparent_42%),radial-gradient(circle_at_bottom_right,_rgba(99,102,241,0.15),_transparent_52%)]',
} as const;

export type PhotoFrameGradient = keyof typeof PHOTO_FRAME_GRADIENTS;

/**
 * Energy widget gradient overlays
 */
export const ENERGY_WIDGET_GRADIENTS = {
  solarHighlight: (accentColor: string, theme: ThemeType) =>
    `radial-gradient(circle at 50% 100%, ${accentColor}${theme === 'light' ? '16' : '26'} 0%, transparent 55%)`,

  gridFlow: (theme: ThemeType) =>
    theme === 'light'
      ? 'linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.03) 100%)'
      : 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',

  batteryFlow: (theme: ThemeType) =>
    theme === 'light'
      ? 'linear-gradient(180deg, rgba(16,185,129,0.15) 0%, rgba(16,185,129,0.05) 100%)'
      : 'linear-gradient(180deg, rgba(16,185,129,0.2) 0%, rgba(16,185,129,0.08) 100%)',
} as const;

/**
 * Media control button gradients
 */
export const MEDIA_CONTROL_GRADIENTS = {
  dpad: (theme: ThemeType, isOn: boolean) =>
    theme === 'light'
      ? 'linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(248,250,252,0.5) 100%)'
      : `linear-gradient(180deg, rgba(255,255,255,${isOn ? '0.08' : '0.04'}) 0%, rgba(255,255,255,${isOn ? '0.04' : '0.02'}) 100%)`,

  controlButton: (theme: ThemeType, isOn: boolean) =>
    theme === 'light'
      ? 'linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(248,250,252,0.5) 100%)'
      : `linear-gradient(180deg, rgba(255,255,255,${isOn ? '0.1' : '0.05'}) 0%, rgba(255,255,255,${isOn ? '0.05' : '0.025'}) 100%)`,
} as const;

/**
 * Note widget lined paper effect
 */
export const NOTE_WIDGET_GRADIENTS = {
  linedPaper: (theme: ThemeType) => {
    const lineColor = theme === 'light' ? 'rgba(15,23,42,0.08)' : 'rgba(255,255,255,0.06)';
    const marginColor = theme === 'light' ? 'rgba(239,68,68,0.3)' : 'rgba(239,68,68,0.2)';

    return `repeating-linear-gradient(transparent, transparent 31px, ${lineColor} 31px, ${lineColor} 32px), linear-gradient(90deg, transparent 0%, transparent 63px, ${marginColor} 63px, ${marginColor} 64px, transparent 64px)`;
  },
} as const;

/**
 * Common control surface gradients
 */
export const CONTROL_SURFACE_GRADIENTS = {
  softButton: (theme: ThemeType) =>
    theme === 'light'
      ? 'linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(248,250,252,0.5) 100%)'
      : 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.04) 100%)',

  panel: (theme: ThemeType) =>
    theme === 'light'
      ? 'linear-gradient(180deg, rgba(255,255,255,0.56) 0%, rgba(248,250,252,0.4) 100%)'
      : 'linear-gradient(180deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.03) 100%)',
} as const;

/**
 * Get photo frame gradient by key
 */
export function getPhotoFrameGradient(key: PhotoFrameGradient): string {
  return PHOTO_FRAME_GRADIENTS[key];
}

/**
 * Validate photo frame gradient key
 */
export function isValidPhotoFrameGradient(key: string): key is PhotoFrameGradient {
  return key in PHOTO_FRAME_GRADIENTS;
}
