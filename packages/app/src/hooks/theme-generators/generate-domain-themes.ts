/**
 * Domain-specific theme generators
 * Each function generates colors for a specific device domain
 */

import {
  type AccentThemeTone,
  getAccentDecorativeSurface,
  getAccentThemeTone,
  type PresetPrimaryColor,
} from '@navet/app/components/shared/theme/theme-colors';
import type { ThemeMode as ThemeType } from '@navet/app/stores/theme-store';
import type { InactiveThemeTone } from './get-inactive-tone';

interface DomainTheme {
  gradient: string;
  border: string;
  iconBg: string;
  accent: string;
  glow: string;
}

export function generateLightTheme(themeType: ThemeType, color: PresetPrimaryColor): DomainTheme {
  if (themeType === 'glass') {
    return getAccentThemeTone(themeType, color, 'solid');
  }

  return getAccentThemeTone(themeType, color, 'soft');
}

export function generateClimateTheme(
  themeType: ThemeType,
  inactiveTone: InactiveThemeTone
): {
  heating: DomainTheme;
  cooling: DomainTheme;
  off: InactiveThemeTone;
} {
  const heatingTone: DomainTheme =
    themeType === 'light'
      ? {
          gradient: 'from-orange-100 to-orange-200',
          border: 'border-orange-300',
          iconBg: 'bg-orange-400',
          accent: 'text-orange-600',
          glow: 'transparent',
        }
      : themeType === 'black'
        ? {
            gradient: 'from-orange-950 to-orange-900',
            border: 'border-orange-800',
            iconBg: 'bg-orange-700',
            accent: 'text-orange-500',
            glow: 'transparent',
          }
        : themeType === 'glass'
          ? {
              gradient: 'from-orange-800/80 to-orange-900/90',
              border: 'border-orange-600/25',
              iconBg: 'bg-orange-400/15',
              accent: 'text-orange-400',
              glow: 'transparent',
            }
          : {
              gradient: 'from-orange-900 to-orange-950',
              border: 'border-orange-700',
              iconBg: 'bg-orange-500',
              accent: 'text-orange-400',
              glow: 'transparent',
            };

  const coolingTone: DomainTheme =
    themeType === 'light'
      ? {
          gradient: 'from-cyan-100 to-cyan-200',
          border: 'border-cyan-300',
          iconBg: 'bg-cyan-400',
          accent: 'text-cyan-600',
          glow: 'transparent',
        }
      : themeType === 'black'
        ? {
            gradient: 'from-cyan-950 to-cyan-900',
            border: 'border-cyan-800',
            iconBg: 'bg-cyan-700',
            accent: 'text-cyan-500',
            glow: 'transparent',
          }
        : themeType === 'glass'
          ? {
              gradient: 'from-cyan-800/80 to-cyan-900/90',
              border: 'border-cyan-600/25',
              iconBg: 'bg-cyan-400/15',
              accent: 'text-cyan-400',
              glow: 'transparent',
            }
          : {
              gradient: 'from-cyan-900 to-cyan-950',
              border: 'border-cyan-700',
              iconBg: 'bg-cyan-500',
              accent: 'text-cyan-400',
              glow: 'transparent',
            };

  return {
    heating: heatingTone,
    cooling: coolingTone,
    off: inactiveTone,
  };
}

/** @deprecated Use generateClimateTheme. */
export const generateHvacTheme = generateClimateTheme;

export function generateMediaTheme(
  themeType: ThemeType,
  color: PresetPrimaryColor,
  inactiveTone: InactiveThemeTone
): {
  gradient: string;
  border: string;
  off: {
    gradient: string;
    border: string;
  };
} {
  const accentDecorativeSurface = getAccentDecorativeSurface(themeType, color);

  return {
    gradient: accentDecorativeSurface.gradient,
    border: accentDecorativeSurface.border,
    off: {
      gradient: inactiveTone.gradient,
      border: inactiveTone.border,
    },
  };
}

export function generateSwitchTheme(
  themeType: ThemeType,
  color: PresetPrimaryColor,
  inactiveTone: InactiveThemeTone
): {
  on: AccentThemeTone;
  off: InactiveThemeTone;
} {
  const accentSolidTone = getAccentThemeTone(themeType, color, 'solid');
  const accentSoftTone = getAccentThemeTone(themeType, color, 'soft');

  return {
    on:
      themeType === 'dark'
        ? {
            ...accentSolidTone,
            border: accentSoftTone.border,
            iconBg: accentSoftTone.iconBg,
            glow: accentSoftTone.glow,
          }
        : accentSolidTone,
    off: inactiveTone,
  };
}

export function generateCoverTheme(
  themeType: ThemeType,
  color: PresetPrimaryColor,
  inactiveTone: InactiveThemeTone
): {
  open: AccentThemeTone;
  closed: InactiveThemeTone;
} {
  const accentSoftTone = getAccentThemeTone(themeType, color, 'soft');

  return {
    open: accentSoftTone,
    closed: inactiveTone,
  };
}

export function generateLockTheme(themeType: ThemeType): {
  locked: DomainTheme;
  unlocked: DomainTheme;
} {
  if (themeType === 'light') {
    return {
      locked: {
        gradient: 'from-emerald-100/90 to-green-200/80',
        border: 'border-emerald-300/60',
        iconBg: 'bg-emerald-400/40',
        accent: 'text-emerald-700',
        glow: 'from-emerald-300/30',
      },
      unlocked: {
        gradient: 'from-red-100/90 to-red-200/80',
        border: 'border-red-300/60',
        iconBg: 'bg-red-400/40',
        accent: 'text-red-600',
        glow: 'from-red-300/30',
      },
    };
  }

  if (themeType === 'black') {
    return {
      locked: {
        gradient: 'from-emerald-950/90 to-green-900/95',
        border: 'border-emerald-800/30',
        iconBg: 'bg-emerald-700/20',
        accent: 'text-emerald-500',
        glow: 'from-emerald-600/10',
      },
      unlocked: {
        gradient: 'from-red-950/90 to-red-900/95',
        border: 'border-red-800/30',
        iconBg: 'bg-red-700/20',
        accent: 'text-red-500',
        glow: 'from-red-600/10',
      },
    };
  }

  if (themeType === 'glass') {
    return {
      locked: {
        gradient: 'from-emerald-800/70 to-green-900/85',
        border: 'border-emerald-600/20',
        iconBg: 'bg-emerald-400/12',
        accent: 'text-emerald-400',
        glow: 'from-emerald-400/6',
      },
      unlocked: {
        gradient: 'from-red-800/70 to-red-900/85',
        border: 'border-red-600/20',
        iconBg: 'bg-red-400/12',
        accent: 'text-red-400',
        glow: 'from-red-400/6',
      },
    };
  }

  // Dark theme
  return {
    locked: {
      gradient: 'from-emerald-900/90 to-green-950/95',
      border: 'border-emerald-700/30',
      iconBg: 'bg-emerald-500/20',
      accent: 'text-emerald-400',
      glow: 'from-emerald-500/10',
    },
    unlocked: {
      gradient: 'from-red-900/90 to-red-950/95',
      border: 'border-red-700/30',
      iconBg: 'bg-red-500/20',
      accent: 'text-red-400',
      glow: 'from-red-500/10',
    },
  };
}

export function generatePersonTheme(
  themeType: ThemeType,
  color: PresetPrimaryColor,
  inactiveTone: InactiveThemeTone
): {
  home: AccentThemeTone;
  away: InactiveThemeTone;
} {
  const accentSoftTone = getAccentThemeTone(themeType, color, 'soft');

  return {
    home: accentSoftTone,
    away: inactiveTone,
  };
}

export function generateSensorTheme(themeType: ThemeType, color: PresetPrimaryColor): DomainTheme {
  return getAccentThemeTone(themeType, color, 'soft');
}

export function generateVacuumTheme(
  themeType: ThemeType,
  color: PresetPrimaryColor,
  inactiveTone: InactiveThemeTone
): {
  cleaning: AccentThemeTone;
  returning: DomainTheme;
  docked: InactiveThemeTone;
  paused: DomainTheme;
  error: DomainTheme;
} {
  const accentSolidTone = getAccentThemeTone(themeType, color, 'solid');

  const getReturningTone = (): DomainTheme => {
    if (themeType === 'light') {
      return {
        gradient: 'from-purple-100 to-purple-200',
        border: 'border-purple-300',
        iconBg: 'bg-purple-400',
        accent: 'text-purple-600',
        glow: 'transparent',
      };
    }

    if (themeType === 'black') {
      return {
        gradient: 'from-purple-950 to-purple-900',
        border: 'border-purple-800',
        iconBg: 'bg-purple-700',
        accent: 'text-purple-500',
        glow: 'transparent',
      };
    }

    if (themeType === 'glass') {
      return {
        gradient: 'from-purple-800/80 to-purple-900/90',
        border: 'border-purple-600/25',
        iconBg: 'bg-purple-400/15',
        accent: 'text-purple-400',
        glow: 'transparent',
      };
    }

    return {
      gradient: 'from-purple-900 to-purple-950',
      border: 'border-purple-700',
      iconBg: 'bg-purple-500',
      accent: 'text-purple-400',
      glow: 'transparent',
    };
  };

  const getStateTone = (baseColor: string): DomainTheme => {
    const suffix =
      themeType === 'light'
        ? '100 to-'
        : themeType === 'black'
          ? '950 to-'
          : themeType === 'glass'
            ? '800/80 to-'
            : '900 to-';
    const borderSuffix =
      themeType === 'light'
        ? '300'
        : themeType === 'black'
          ? '800'
          : themeType === 'glass'
            ? '600/25'
            : '700';
    const iconBgSuffix =
      themeType === 'light'
        ? '400'
        : themeType === 'black'
          ? '700'
          : themeType === 'glass'
            ? '400/15'
            : '500';
    const accentSuffix = themeType === 'light' ? '600' : themeType === 'black' ? '500' : '400';

    return {
      gradient: `from-${baseColor}-${suffix}${baseColor}-${themeType === 'light' ? '200' : themeType === 'black' ? '900' : themeType === 'glass' ? '900/90' : '950'}`,
      border: `border-${baseColor}-${borderSuffix}`,
      iconBg: `bg-${baseColor}-${iconBgSuffix}`,
      accent: `text-${baseColor}-${accentSuffix}`,
      glow: 'transparent',
    };
  };

  return {
    cleaning: accentSolidTone,
    returning: getReturningTone(),
    docked: inactiveTone,
    paused: getStateTone('yellow'),
    error: getStateTone('red'),
  };
}

export function generateRssTheme(
  themeType: ThemeType,
  color: PresetPrimaryColor
): {
  gradient: string;
  border: string;
  glow: string;
} {
  return getAccentDecorativeSurface(themeType, color);
}

export function generateCalendarTheme(
  themeType: ThemeType,
  color: PresetPrimaryColor
): {
  gradient: string;
  border: string;
  glow: string;
} {
  return getAccentDecorativeSurface(themeType, color);
}
