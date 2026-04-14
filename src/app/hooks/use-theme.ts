/**
 * Theme hook and derived palette utilities backed by the theme store.
 */

import { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import {
  resolvePrimaryColorToken,
  resolvePrimaryColorValue,
} from '@/app/components/shared/theme/theme-colors';
import { themeSelectors } from '@/app/stores/selectors';
import type { PrimaryColor, ThemeMode as ThemeType } from '../stores/theme-store';
import { useThemeStore } from '../stores/theme-store';
import { useMediaQuery } from './use-media-query';

export type { PrimaryColor, ThemeType };

export interface ThemeColors {
  light: {
    gradient: string;
    border: string;
    iconBg: string;
    glow: string;
  };
  hvac: {
    heating: { gradient: string; border: string; iconBg: string; accent: string; glow: string };
    cooling: { gradient: string; border: string; iconBg: string; accent: string; glow: string };
    off: { gradient: string; border: string; iconBg: string; accent: string; glow: string };
  };
  media: {
    gradient: string;
    border: string;
    off: { gradient: string; border: string };
  };
  switch: {
    on: { gradient: string; border: string; iconBg: string; accent: string; glow: string };
    off: { gradient: string; border: string; iconBg: string; accent: string; glow: string };
  };
  cover: {
    open: { gradient: string; border: string; iconBg: string; accent: string; glow: string };
    closed: { gradient: string; border: string; iconBg: string; accent: string; glow: string };
  };
  lock: {
    locked: { gradient: string; border: string; iconBg: string; accent: string; glow: string };
    unlocked: { gradient: string; border: string; iconBg: string; accent: string; glow: string };
  };
  person: {
    home: { gradient: string; border: string; iconBg: string; accent: string; glow: string };
    away: { gradient: string; border: string; iconBg: string; accent: string; glow: string };
  };
  sensor: {
    gradient: string;
    border: string;
    iconBg: string;
    accent: string;
    glow: string;
  };
  vacuum: {
    cleaning: { gradient: string; border: string; iconBg: string; accent: string; glow: string };
    returning: { gradient: string; border: string; iconBg: string; accent: string; glow: string };
    docked: { gradient: string; border: string; iconBg: string; accent: string; glow: string };
    paused: { gradient: string; border: string; iconBg: string; accent: string; glow: string };
    error: { gradient: string; border: string; iconBg: string; accent: string; glow: string };
  };
  rss: {
    gradient: string;
    border: string;
    glow: string;
  };
  calendar: {
    gradient: string;
    border: string;
    glow: string;
  };
}

interface ThemeValue {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  followSystemTheme: boolean;
  setFollowSystemTheme: (follow: boolean) => void;
  colors: ThemeColors;
  primaryColor: PrimaryColor;
  setPrimaryColor: (color: PrimaryColor) => void;
  customPrimaryColor: string | null;
  setCustomPrimaryColor: (color: string | null) => void;
  accentColor: string;
  wallpaper: string | null;
  setWallpaper: (wallpaper: string | null) => void;
}

const getInactiveThemeTone = (themeType: ThemeType) => {
  if (themeType === 'light') {
    return {
      gradient: 'from-gray-100 to-gray-200',
      border: 'border-gray-200',
      iconBg: 'bg-gray-300',
      accent: 'text-gray-500',
      glow: 'transparent',
    };
  }

  if (themeType === 'glass') {
    return {
      gradient: 'from-white/18 via-white/08 to-white/03',
      border: 'border-white/22',
      iconBg: 'bg-white/12',
      accent: 'text-white/80',
      glow: 'transparent',
    };
  }

  if (themeType === 'black') {
    return {
      gradient: 'from-black via-black to-black',
      border: 'border-white/6',
      iconBg: 'bg-zinc-900',
      accent: 'text-gray-300',
      glow: 'transparent',
    };
  }

  return {
    gradient: 'from-zinc-900 to-zinc-950',
    border: 'border-zinc-700',
    iconBg: 'bg-zinc-800',
    accent: 'text-gray-300',
    glow: 'transparent',
  };
};

export const generateThemeColors = (
  themeType: ThemeType,
  primaryColor: PrimaryColor,
  customPrimaryColor: string | null
): ThemeColors => {
  const color = resolvePrimaryColorToken(primaryColor, customPrimaryColor);
  const inactiveTone = getInactiveThemeTone(themeType);

  if (themeType === 'dark') {
    return {
      light: {
        gradient: `from-${color}-900/90 to-${color}-950/95`,
        border: `border-${color}-700/30`,
        iconBg: `bg-${color}-500/20`,
        glow: `from-${color}-500/10`,
      },
      hvac: {
        heating: {
          gradient: 'from-orange-900 to-orange-950',
          border: 'border-orange-700',
          iconBg: 'bg-orange-500',
          accent: 'text-orange-400',
          glow: 'transparent',
        },
        cooling: {
          gradient: 'from-cyan-900 to-cyan-950',
          border: 'border-cyan-700',
          iconBg: 'bg-cyan-500',
          accent: 'text-cyan-400',
          glow: 'transparent',
        },
        off: inactiveTone,
      },
      media: {
        gradient: 'from-pink-900 to-pink-950',
        border: 'border-pink-700',
        off: {
          gradient: inactiveTone.gradient,
          border: inactiveTone.border,
        },
      },
      switch: {
        on: {
          gradient: `from-${color}-900 to-${color}-950`,
          border: `border-${color}-700`,
          iconBg: `bg-${color}-500`,
          accent: `text-${color}-400`,
          glow: 'transparent',
        },
        off: inactiveTone,
      },
      cover: {
        open: {
          gradient: `from-${color}-900/90 to-${color}-950/95`,
          border: `border-${color}-700/30`,
          iconBg: `bg-${color}-500/20`,
          accent: `text-${color}-400`,
          glow: `from-${color}-500/10`,
        },
        closed: inactiveTone,
      },
      lock: {
        locked: {
          gradient: `from-${color}-900/90 to-${color}-950/95`,
          border: `border-${color}-700/30`,
          iconBg: `bg-${color}-500/20`,
          accent: `text-${color}-400`,
          glow: `from-${color}-500/10`,
        },
        unlocked: {
          gradient: 'from-red-900/90 to-red-950/95',
          border: 'border-red-700/30',
          iconBg: 'bg-red-500/20',
          accent: 'text-red-400',
          glow: 'from-red-500/10',
        },
      },
      person: {
        home: {
          gradient: `from-${color}-900/90 to-${color}-950/95`,
          border: `border-${color}-700/30`,
          iconBg: `bg-${color}-500/20`,
          accent: `text-${color}-400`,
          glow: `from-${color}-500/10`,
        },
        away: inactiveTone,
      },
      sensor: {
        gradient: `from-${color}-900/90 to-${color}-950/95`,
        border: `border-${color}-700/30`,
        iconBg: `bg-${color}-500/20`,
        accent: `text-${color}-400`,
        glow: `from-${color}-500/10`,
      },
      vacuum: {
        cleaning: {
          gradient: `from-${color}-900 to-${color}-950`,
          border: `border-${color}-700`,
          iconBg: `bg-${color}-500`,
          accent: `text-${color}-400`,
          glow: 'transparent',
        },
        returning: {
          gradient: 'from-purple-900 to-purple-950',
          border: 'border-purple-700',
          iconBg: 'bg-purple-500',
          accent: 'text-purple-400',
          glow: 'transparent',
        },
        docked: inactiveTone,
        paused: {
          gradient: 'from-yellow-900 to-yellow-950',
          border: 'border-yellow-700',
          iconBg: 'bg-yellow-500',
          accent: 'text-yellow-400',
          glow: 'transparent',
        },
        error: {
          gradient: 'from-red-900 to-red-950',
          border: 'border-red-700',
          iconBg: 'bg-red-500',
          accent: 'text-red-400',
          glow: 'transparent',
        },
      },
      rss: {
        gradient: 'from-orange-900/90 via-red-950/95 to-red-950/95',
        border: 'border-orange-700/30',
        glow: 'from-orange-500/10',
      },
      calendar: {
        gradient: 'from-indigo-900/90 via-purple-950/95 to-purple-950/95',
        border: 'border-indigo-700/30',
        glow: 'from-indigo-500/10',
      },
    };
  }

  if (themeType === 'light') {
    return {
      light: {
        gradient: `from-${color}-100/90 to-${color}-200/80`,
        border: `border-${color}-300/60`,
        iconBg: `bg-${color}-400/40`,
        glow: `from-${color}-300/30`,
      },
      hvac: {
        heating: {
          gradient: 'from-orange-200 to-orange-100',
          border: 'border-orange-300',
          iconBg: 'bg-orange-400',
          accent: 'text-orange-600',
          glow: 'transparent',
        },
        cooling: {
          gradient: 'from-cyan-200 to-cyan-100',
          border: 'border-cyan-300',
          iconBg: 'bg-cyan-400',
          accent: 'text-cyan-600',
          glow: 'transparent',
        },
        off: inactiveTone,
      },
      media: {
        gradient: 'from-pink-200 to-pink-100',
        border: 'border-pink-300',
        off: {
          gradient: inactiveTone.gradient,
          border: inactiveTone.border,
        },
      },
      switch: {
        on: {
          gradient: `from-${color}-200 to-${color}-100`,
          border: `border-${color}-300`,
          iconBg: `bg-${color}-400`,
          accent: `text-${color}-600`,
          glow: 'transparent',
        },
        off: inactiveTone,
      },
      cover: {
        open: {
          gradient: `from-${color}-200/95 to-${color}-100/90`,
          border: `border-${color}-300/60`,
          iconBg: `bg-${color}-400/50`,
          accent: `text-${color}-600`,
          glow: `from-${color}-300/30`,
        },
        closed: inactiveTone,
      },
      lock: {
        locked: {
          gradient: `from-${color}-200/95 to-${color}-100/90`,
          border: `border-${color}-300/60`,
          iconBg: `bg-${color}-400/50`,
          accent: `text-${color}-600`,
          glow: `from-${color}-300/30`,
        },
        unlocked: {
          gradient: 'from-red-200/95 to-red-100/90',
          border: 'border-red-300/60',
          iconBg: 'bg-red-400/50',
          accent: 'text-red-600',
          glow: 'from-red-300/30',
        },
      },
      person: {
        home: {
          gradient: `from-${color}-200/95 to-${color}-100/90`,
          border: `border-${color}-300/60`,
          iconBg: `bg-${color}-400/50`,
          accent: `text-${color}-600`,
          glow: `from-${color}-300/30`,
        },
        away: inactiveTone,
      },
      sensor: {
        gradient: `from-${color}-200/95 to-${color}-100/90`,
        border: `border-${color}-300/60`,
        iconBg: `bg-${color}-400/50`,
        accent: `text-${color}-600`,
        glow: `from-${color}-300/30`,
      },
      vacuum: {
        cleaning: {
          gradient: `from-${color}-200 to-${color}-100`,
          border: `border-${color}-300`,
          iconBg: `bg-${color}-400`,
          accent: `text-${color}-600`,
          glow: 'transparent',
        },
        returning: {
          gradient: 'from-purple-200 to-purple-100',
          border: 'border-purple-300',
          iconBg: 'bg-purple-400',
          accent: 'text-purple-600',
          glow: 'transparent',
        },
        docked: inactiveTone,
        paused: {
          gradient: 'from-yellow-200 to-yellow-100',
          border: 'border-yellow-300',
          iconBg: 'bg-yellow-400',
          accent: 'text-yellow-600',
          glow: 'transparent',
        },
        error: {
          gradient: 'from-red-200 to-red-100',
          border: 'border-red-300',
          iconBg: 'bg-red-400',
          accent: 'text-red-600',
          glow: 'transparent',
        },
      },
      rss: {
        gradient: 'from-orange-200/95 via-red-100/90 to-red-100/85',
        border: 'border-orange-300/60',
        glow: 'from-orange-300/30',
      },
      calendar: {
        gradient: 'from-indigo-200/95 via-purple-100/90 to-purple-100/85',
        border: 'border-indigo-300/60',
        glow: 'from-indigo-300/30',
      },
    };
  }

  if (themeType === 'glass') {
    return {
      light: {
        gradient: `from-white/30 via-${color}-200/20 to-white/08`,
        border: `border-white/24`,
        iconBg: `bg-${color}-300/20`,
        glow: `from-${color}-300/22`,
      },
      hvac: {
        heating: {
          gradient: 'from-white/28 via-orange-200/22 to-white/08',
          border: 'border-white/24',
          iconBg: 'bg-orange-300/24',
          accent: 'text-orange-200',
          glow: 'from-orange-300/22',
        },
        cooling: {
          gradient: 'from-white/28 via-cyan-200/22 to-white/08',
          border: 'border-white/24',
          iconBg: 'bg-cyan-300/24',
          accent: 'text-cyan-200',
          glow: 'from-cyan-300/22',
        },
        off: inactiveTone,
      },
      media: {
        gradient: 'from-white/22 via-pink-200/18 to-white/06',
        border: 'border-white/24',
        off: {
          gradient: inactiveTone.gradient,
          border: inactiveTone.border,
        },
      },
      switch: {
        on: {
          gradient: `from-white/28 via-${color}-200/20 to-white/08`,
          border: 'border-white/24',
          iconBg: `bg-${color}-300/22`,
          accent: 'text-white',
          glow: `from-${color}-300/22`,
        },
        off: inactiveTone,
      },
      cover: {
        open: {
          gradient: `from-white/28 via-${color}-200/20 to-white/08`,
          border: 'border-white/24',
          iconBg: `bg-${color}-300/22`,
          accent: 'text-white',
          glow: `from-${color}-300/22`,
        },
        closed: inactiveTone,
      },
      lock: {
        locked: {
          gradient: `from-white/28 via-${color}-200/20 to-white/08`,
          border: 'border-white/24',
          iconBg: `bg-${color}-300/22`,
          accent: 'text-white',
          glow: `from-${color}-300/22`,
        },
        unlocked: {
          gradient: 'from-white/28 via-red-200/20 to-white/08',
          border: 'border-white/24',
          iconBg: 'bg-red-300/22',
          accent: 'text-white',
          glow: 'from-red-300/22',
        },
      },
      person: {
        home: {
          gradient: `from-white/28 via-${color}-200/20 to-white/08`,
          border: 'border-white/24',
          iconBg: `bg-${color}-300/22`,
          accent: 'text-white',
          glow: `from-${color}-300/22`,
        },
        away: inactiveTone,
      },
      sensor: {
        gradient: `from-white/24 via-${color}-200/18 to-white/10`,
        border: 'border-white/22',
        iconBg: `bg-${color}-300/20`,
        accent: 'text-white',
        glow: `from-${color}-300/18`,
      },
      vacuum: {
        cleaning: {
          gradient: `from-white/24 via-${color}-200/18 to-white/10`,
          border: 'border-white/22',
          iconBg: `bg-${color}-300/20`,
          accent: 'text-white',
          glow: `from-${color}-300/18`,
        },
        returning: {
          gradient: 'from-white/24 via-purple-200/18 to-white/10',
          border: 'border-white/22',
          iconBg: 'bg-purple-300/20',
          accent: 'text-white',
          glow: 'from-purple-300/18',
        },
        docked: inactiveTone,
        paused: {
          gradient: 'from-white/24 via-yellow-200/18 to-white/10',
          border: 'border-white/22',
          iconBg: 'bg-yellow-300/20',
          accent: 'text-white',
          glow: 'from-yellow-300/18',
        },
        error: {
          gradient: 'from-white/24 via-red-200/18 to-white/10',
          border: 'border-white/22',
          iconBg: 'bg-red-300/20',
          accent: 'text-white',
          glow: 'from-red-300/18',
        },
      },
      rss: {
        gradient: 'from-white/24 via-orange-200/18 to-white/10',
        border: 'border-white/22',
        glow: 'from-orange-300/18',
      },
      calendar: {
        gradient: 'from-white/24 via-indigo-200/18 to-white/10',
        border: 'border-white/22',
        glow: 'from-indigo-300/18',
      },
    };
  }

  if (themeType === 'black') {
    return {
      light: {
        gradient: `from-black via-black to-${color}-950`,
        border: `border-${color}-400/28`,
        iconBg: `bg-${color}-500/30`,
        glow: `from-${color}-400/18`,
      },
      hvac: {
        heating: {
          gradient: 'from-black via-black to-orange-950',
          border: 'border-orange-400/28',
          iconBg: 'bg-orange-500/30',
          accent: 'text-orange-300',
          glow: 'from-orange-400/18',
        },
        cooling: {
          gradient: 'from-black via-black to-cyan-950',
          border: 'border-cyan-400/28',
          iconBg: 'bg-cyan-500/30',
          accent: 'text-cyan-300',
          glow: 'from-cyan-400/18',
        },
        off: inactiveTone,
      },
      media: {
        gradient: 'from-pink-400/18',
        border: 'border-pink-400/45',
        off: {
          gradient: inactiveTone.gradient,
          border: inactiveTone.border,
        },
      },
      switch: {
        on: {
          gradient: `from-black via-black to-${color}-950`,
          border: `border-${color}-400/28`,
          iconBg: `bg-${color}-500/30`,
          accent: `text-${color}-300`,
          glow: `from-${color}-400/18`,
        },
        off: inactiveTone,
      },
      cover: {
        open: {
          gradient: `from-black via-black to-${color}-950`,
          border: `border-${color}-400/28`,
          iconBg: `bg-${color}-500/30`,
          accent: `text-${color}-300`,
          glow: `from-${color}-400/18`,
        },
        closed: inactiveTone,
      },
      lock: {
        locked: {
          gradient: `from-black via-black to-${color}-950`,
          border: `border-${color}-400/28`,
          iconBg: `bg-${color}-500/30`,
          accent: `text-${color}-300`,
          glow: `from-${color}-400/18`,
        },
        unlocked: {
          gradient: 'from-black via-black to-red-950',
          border: 'border-red-400/28',
          iconBg: 'bg-red-500/30',
          accent: 'text-red-300',
          glow: 'from-red-400/18',
        },
      },
      person: {
        home: {
          gradient: `from-black via-black to-${color}-950`,
          border: `border-${color}-400/28`,
          iconBg: `bg-${color}-500/30`,
          accent: `text-${color}-300`,
          glow: `from-${color}-400/18`,
        },
        away: inactiveTone,
      },
      sensor: {
        gradient: `from-black via-black to-${color}-950`,
        border: `border-${color}-400/28`,
        iconBg: `bg-${color}-500/30`,
        accent: `text-${color}-300`,
        glow: `from-${color}-400/18`,
      },
      vacuum: {
        cleaning: {
          gradient: `from-black via-black to-${color}-950`,
          border: `border-${color}-400/28`,
          iconBg: `bg-${color}-500/30`,
          accent: `text-${color}-300`,
          glow: `from-${color}-400/18`,
        },
        returning: {
          gradient: 'from-black via-black to-purple-950',
          border: 'border-purple-400/28',
          iconBg: 'bg-purple-500/30',
          accent: 'text-purple-300',
          glow: 'from-purple-400/18',
        },
        docked: inactiveTone,
        paused: {
          gradient: 'from-black via-black to-yellow-950',
          border: 'border-yellow-400/28',
          iconBg: 'bg-yellow-500/30',
          accent: 'text-yellow-300',
          glow: 'from-yellow-400/18',
        },
        error: {
          gradient: 'from-black via-black to-red-950',
          border: 'border-red-400/28',
          iconBg: 'bg-red-500/30',
          accent: 'text-red-300',
          glow: 'from-red-400/18',
        },
      },
      rss: {
        gradient: 'from-black via-orange-950 to-red-900',
        border: 'border-orange-400/28',
        glow: 'from-orange-400/18',
      },
      calendar: {
        gradient: 'from-black via-black to-indigo-950',
        border: 'border-indigo-400/28',
        glow: 'from-indigo-400/18',
      },
    };
  }

  return {
    light: {
      gradient: `from-black via-${color}-950 to-${color}-900`,
      border: `border-${color}-400/80`,
      iconBg: `bg-${color}-500/30`,
      glow: `from-${color}-400/20`,
    },
    hvac: {
      heating: {
        gradient: 'from-black via-orange-950 to-orange-900',
        border: 'border-orange-400/80',
        iconBg: 'bg-orange-500/30',
        accent: 'text-orange-300',
        glow: 'transparent',
      },
      cooling: {
        gradient: 'from-black via-cyan-950 to-cyan-900',
        border: 'border-cyan-400/80',
        iconBg: 'bg-cyan-500/30',
        accent: 'text-cyan-300',
        glow: 'transparent',
      },
      off: inactiveTone,
    },
    media: {
      gradient: 'from-pink-950 via-black to-black',
      border: 'border-pink-700',
      off: {
        gradient: inactiveTone.gradient,
        border: inactiveTone.border,
      },
    },
    switch: {
      on: {
        gradient: `from-black via-${color}-950 to-${color}-900`,
        border: `border-${color}-400/80`,
        iconBg: `bg-${color}-500/30`,
        accent: `text-${color}-300`,
        glow: 'transparent',
      },
      off: inactiveTone,
    },
    cover: {
      open: {
        gradient: `from-black via-${color}-950 to-${color}-900`,
        border: `border-${color}-400/80`,
        iconBg: `bg-${color}-500/30`,
        accent: `text-${color}-300`,
        glow: `from-${color}-400/20`,
      },
      closed: inactiveTone,
    },
    lock: {
      locked: {
        gradient: `from-black via-${color}-950 to-${color}-900`,
        border: `border-${color}-400/80`,
        iconBg: `bg-${color}-500/30`,
        accent: `text-${color}-300`,
        glow: `from-${color}-400/20`,
      },
      unlocked: {
        gradient: 'from-black via-red-950 to-red-900',
        border: 'border-red-400/80',
        iconBg: 'bg-red-500/30',
        accent: 'text-red-300',
        glow: 'from-red-400/20',
      },
    },
    person: {
      home: {
        gradient: `from-black via-${color}-950 to-${color}-900`,
        border: `border-${color}-400/80`,
        iconBg: `bg-${color}-500/30`,
        accent: `text-${color}-300`,
        glow: `from-${color}-400/20`,
      },
      away: inactiveTone,
    },
    sensor: {
      gradient: `from-black via-${color}-950 to-${color}-900`,
      border: `border-${color}-400/80`,
      iconBg: `bg-${color}-500/30`,
      accent: `text-${color}-300`,
      glow: `from-${color}-400/20`,
    },
    vacuum: {
      cleaning: {
        gradient: `from-black via-${color}-950 to-${color}-900`,
        border: `border-${color}-400/80`,
        iconBg: `bg-${color}-500/30`,
        accent: `text-${color}-300`,
        glow: 'transparent',
      },
      returning: {
        gradient: 'from-black via-purple-950 to-purple-900',
        border: 'border-purple-400/80',
        iconBg: 'bg-purple-500/30',
        accent: 'text-purple-300',
        glow: 'transparent',
      },
      docked: inactiveTone,
      paused: {
        gradient: 'from-black via-yellow-950 to-yellow-900',
        border: 'border-yellow-400/80',
        iconBg: 'bg-yellow-500/30',
        accent: 'text-yellow-300',
        glow: 'transparent',
      },
      error: {
        gradient: 'from-black via-red-950 to-red-900',
        border: 'border-red-400/80',
        iconBg: 'bg-red-500/30',
        accent: 'text-red-300',
        glow: 'transparent',
      },
    },
    rss: {
      gradient: 'from-black via-orange-950 to-red-900',
      border: 'border-orange-400/80',
      glow: 'from-orange-400/20',
    },
    calendar: {
      gradient: 'from-black via-indigo-950 to-purple-900',
      border: 'border-indigo-400/80',
      glow: 'from-indigo-400/20',
    },
  };
};

export function useTheme(): ThemeValue {
  const { theme, followSystemTheme, primaryColor, customPrimaryColor, wallpaper } = useThemeStore(
    useShallow(themeSelectors.allValues)
  );
  const { setTheme, setFollowSystemTheme, setPrimaryColor, setCustomPrimaryColor, setWallpaper } =
    useThemeStore(useShallow(themeSelectors.allActions));
  const sysDark = useMediaQuery('(prefers-color-scheme: dark)');
  const effectiveTheme: ThemeType = followSystemTheme ? (sysDark ? 'dark' : 'light') : theme;
  const accentColor = useMemo(
    () => resolvePrimaryColorValue(primaryColor, customPrimaryColor),
    [customPrimaryColor, primaryColor]
  );
  const colors = useMemo(
    () => generateThemeColors(effectiveTheme, primaryColor, customPrimaryColor),
    [customPrimaryColor, primaryColor, effectiveTheme]
  );

  return useMemo(
    () => ({
      theme: effectiveTheme,
      setTheme,
      followSystemTheme,
      setFollowSystemTheme,
      colors,
      primaryColor,
      setPrimaryColor,
      customPrimaryColor,
      setCustomPrimaryColor,
      accentColor,
      wallpaper,
      setWallpaper,
    }),
    [
      effectiveTheme,
      setTheme,
      followSystemTheme,
      setFollowSystemTheme,
      colors,
      primaryColor,
      setPrimaryColor,
      customPrimaryColor,
      setCustomPrimaryColor,
      accentColor,
      wallpaper,
      setWallpaper,
    ]
  );
}
