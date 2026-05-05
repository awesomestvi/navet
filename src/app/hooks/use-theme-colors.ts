/**
 * Theme color generation utilities
 * Separated from use-theme.ts for better maintainability
 */

import {
  getAccentDecorativeSurface,
  getAccentThemeTone,
  resolvePrimaryColorToken,
} from '@/app/components/shared/theme/theme-colors';
import type { PrimaryColor, ThemeMode as ThemeType } from '../stores/theme-store';

export interface ThemeColors {
  light: {
    gradient: string;
    border: string;
    iconBg: string;
    glow: string;
  };
  hvac: {
    heating: {
      gradient: string;
      border: string;
      iconBg: string;
      accent: string;
      glow: string;
    };
    cooling: {
      gradient: string;
      border: string;
      iconBg: string;
      accent: string;
      glow: string;
    };
    off: {
      gradient: string;
      border: string;
      iconBg: string;
      accent: string;
      glow: string;
    };
  };
  media: {
    gradient: string;
    border: string;
    off: {
      gradient: string;
      border: string;
    };
  };
  switch: {
    on: {
      gradient: string;
      border: string;
      iconBg: string;
      accent: string;
      glow: string;
    };
    off: {
      gradient: string;
      border: string;
      iconBg: string;
      accent: string;
      glow: string;
    };
  };
  cover: {
    open: {
      gradient: string;
      border: string;
      iconBg: string;
      accent: string;
      glow: string;
    };
    closed: {
      gradient: string;
      border: string;
      iconBg: string;
      accent: string;
      glow: string;
    };
  };
  lock: {
    locked: {
      gradient: string;
      border: string;
      iconBg: string;
      accent: string;
      glow: string;
    };
    unlocked: {
      gradient: string;
      border: string;
      iconBg: string;
      accent: string;
      glow: string;
    };
  };
  person: {
    home: {
      gradient: string;
      border: string;
      iconBg: string;
      accent: string;
      glow: string;
    };
    away: {
      gradient: string;
      border: string;
      iconBg: string;
      accent: string;
      glow: string;
    };
  };
  sensor: {
    gradient: string;
    border: string;
    iconBg: string;
    accent: string;
    glow: string;
  };
  vacuum: {
    cleaning: {
      gradient: string;
      border: string;
      iconBg: string;
      accent: string;
      glow: string;
    };
    returning: {
      gradient: string;
      border: string;
      iconBg: string;
      accent: string;
      glow: string;
    };
    docked: {
      gradient: string;
      border: string;
      iconBg: string;
      accent: string;
      glow: string;
    };
    paused: {
      gradient: string;
      border: string;
      iconBg: string;
      accent: string;
      glow: string;
    };
    error: {
      gradient: string;
      border: string;
      iconBg: string;
      accent: string;
      glow: string;
    };
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

  return {
    gradient: 'from-gray-800 to-gray-900',
    border: 'border-gray-700',
    iconBg: 'bg-gray-600',
    accent: 'text-gray-400',
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
  const accentSoftTone = getAccentThemeTone(themeType, color, 'soft');
  const accentSolidTone = getAccentThemeTone(themeType, color, 'solid');
  const accentDecorativeSurface = getAccentDecorativeSurface(themeType, color);

  if (themeType === 'dark') {
    return {
      light: {
        gradient: accentSoftTone.gradient,
        border: accentSoftTone.border,
        iconBg: accentSoftTone.iconBg,
        glow: accentSoftTone.glow,
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
        gradient: accentDecorativeSurface.gradient,
        border: accentDecorativeSurface.border,
        off: {
          gradient: inactiveTone.gradient,
          border: inactiveTone.border,
        },
      },
      switch: {
        on: accentSolidTone,
        off: inactiveTone,
      },
      cover: {
        open: accentSoftTone,
        closed: inactiveTone,
      },
      lock: {
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
      },
      person: {
        home: accentSoftTone,
        away: inactiveTone,
      },
      sensor: accentSoftTone,
      vacuum: {
        cleaning: accentSolidTone,
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
        gradient: accentDecorativeSurface.gradient,
        border: accentDecorativeSurface.border,
        glow: accentDecorativeSurface.glow,
      },
      calendar: {
        gradient: accentDecorativeSurface.gradient,
        border: accentDecorativeSurface.border,
        glow: accentDecorativeSurface.glow,
      },
    };
  }

  if (themeType === 'light') {
    return {
      light: {
        gradient: accentSoftTone.gradient,
        border: accentSoftTone.border,
        iconBg: accentSoftTone.iconBg,
        glow: accentSoftTone.glow,
      },
      hvac: {
        heating: {
          gradient: 'from-orange-100 to-orange-200',
          border: 'border-orange-300',
          iconBg: 'bg-orange-400',
          accent: 'text-orange-600',
          glow: 'transparent',
        },
        cooling: {
          gradient: 'from-cyan-100 to-cyan-200',
          border: 'border-cyan-300',
          iconBg: 'bg-cyan-400',
          accent: 'text-cyan-600',
          glow: 'transparent',
        },
        off: inactiveTone,
      },
      media: {
        gradient: accentDecorativeSurface.gradient,
        border: accentDecorativeSurface.border,
        off: {
          gradient: inactiveTone.gradient,
          border: inactiveTone.border,
        },
      },
      switch: {
        on: accentSolidTone,
        off: inactiveTone,
      },
      cover: {
        open: accentSoftTone,
        closed: inactiveTone,
      },
      lock: {
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
      },
      person: {
        home: accentSoftTone,
        away: inactiveTone,
      },
      sensor: accentSoftTone,
      vacuum: {
        cleaning: accentSolidTone,
        returning: {
          gradient: 'from-purple-100 to-purple-200',
          border: 'border-purple-300',
          iconBg: 'bg-purple-400',
          accent: 'text-purple-600',
          glow: 'transparent',
        },
        docked: inactiveTone,
        paused: {
          gradient: 'from-yellow-100 to-yellow-200',
          border: 'border-yellow-300',
          iconBg: 'bg-yellow-400',
          accent: 'text-yellow-600',
          glow: 'transparent',
        },
        error: {
          gradient: 'from-red-100 to-red-200',
          border: 'border-red-300',
          iconBg: 'bg-red-400',
          accent: 'text-red-600',
          glow: 'transparent',
        },
      },
      rss: {
        gradient: accentDecorativeSurface.gradient,
        border: accentDecorativeSurface.border,
        glow: accentDecorativeSurface.glow,
      },
      calendar: {
        gradient: accentDecorativeSurface.gradient,
        border: accentDecorativeSurface.border,
        glow: accentDecorativeSurface.glow,
      },
    };
  }

  if (themeType === 'black') {
    return {
      light: {
        gradient: accentSoftTone.gradient,
        border: accentSoftTone.border,
        iconBg: accentSoftTone.iconBg,
        glow: accentSoftTone.glow,
      },
      hvac: {
        heating: {
          gradient: 'from-orange-950 to-orange-900',
          border: 'border-orange-800',
          iconBg: 'bg-orange-700',
          accent: 'text-orange-500',
          glow: 'transparent',
        },
        cooling: {
          gradient: 'from-cyan-950 to-cyan-900',
          border: 'border-cyan-800',
          iconBg: 'bg-cyan-700',
          accent: 'text-cyan-500',
          glow: 'transparent',
        },
        off: inactiveTone,
      },
      media: {
        gradient: accentDecorativeSurface.gradient,
        border: accentDecorativeSurface.border,
        off: {
          gradient: inactiveTone.gradient,
          border: inactiveTone.border,
        },
      },
      switch: {
        on: accentSolidTone,
        off: inactiveTone,
      },
      cover: {
        open: accentSoftTone,
        closed: inactiveTone,
      },
      lock: {
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
      },
      person: {
        home: accentSoftTone,
        away: inactiveTone,
      },
      sensor: accentSoftTone,
      vacuum: {
        cleaning: accentSolidTone,
        returning: {
          gradient: 'from-purple-950 to-purple-900',
          border: 'border-purple-800',
          iconBg: 'bg-purple-700',
          accent: 'text-purple-500',
          glow: 'transparent',
        },
        docked: inactiveTone,
        paused: {
          gradient: 'from-yellow-950 to-yellow-900',
          border: 'border-yellow-800',
          iconBg: 'bg-yellow-700',
          accent: 'text-yellow-500',
          glow: 'transparent',
        },
        error: {
          gradient: 'from-red-950 to-red-900',
          border: 'border-red-800',
          iconBg: 'bg-red-700',
          accent: 'text-red-500',
          glow: 'transparent',
        },
      },
      rss: {
        gradient: accentDecorativeSurface.gradient,
        border: accentDecorativeSurface.border,
        glow: accentDecorativeSurface.glow,
      },
      calendar: {
        gradient: accentDecorativeSurface.gradient,
        border: accentDecorativeSurface.border,
        glow: accentDecorativeSurface.glow,
      },
    };
  }

  // Glass theme (default)
  return {
    light: {
      gradient: accentSoftTone.gradient,
      border: accentSoftTone.border,
      iconBg: accentSoftTone.iconBg,
      glow: accentSoftTone.glow,
    },
    hvac: {
      heating: {
        gradient: 'from-orange-800/80 to-orange-900/90',
        border: 'border-orange-600/25',
        iconBg: 'bg-orange-400/15',
        accent: 'text-orange-400',
        glow: 'transparent',
      },
      cooling: {
        gradient: 'from-cyan-800/80 to-cyan-900/90',
        border: 'border-cyan-600/25',
        iconBg: 'bg-cyan-400/15',
        accent: 'text-cyan-400',
        glow: 'transparent',
      },
      off: inactiveTone,
    },
    media: {
      gradient: accentDecorativeSurface.gradient,
      border: accentDecorativeSurface.border,
      off: {
        gradient: inactiveTone.gradient,
        border: inactiveTone.border,
      },
    },
    switch: {
      on: accentSolidTone,
      off: inactiveTone,
    },
    cover: {
      open: accentSoftTone,
      closed: inactiveTone,
    },
    lock: {
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
    },
    person: {
      home: accentSoftTone,
      away: inactiveTone,
    },
    sensor: accentSoftTone,
    vacuum: {
      cleaning: accentSolidTone,
      returning: {
        gradient: 'from-purple-800/80 to-purple-900/90',
        border: 'border-purple-600/25',
        iconBg: 'bg-purple-400/15',
        accent: 'text-purple-400',
        glow: 'transparent',
      },
      docked: inactiveTone,
      paused: {
        gradient: 'from-yellow-800/80 to-yellow-900/90',
        border: 'border-yellow-600/25',
        iconBg: 'bg-yellow-400/15',
        accent: 'text-yellow-400',
        glow: 'transparent',
      },
      error: {
        gradient: 'from-red-800/80 to-red-900/90',
        border: 'border-red-600/25',
        iconBg: 'bg-red-400/15',
        accent: 'text-red-400',
        glow: 'transparent',
      },
    },
    rss: {
      gradient: accentDecorativeSurface.gradient,
      border: accentDecorativeSurface.border,
      glow: accentDecorativeSurface.glow,
    },
    calendar: {
      gradient: accentDecorativeSurface.gradient,
      border: accentDecorativeSurface.border,
      glow: accentDecorativeSurface.glow,
    },
  };
};
