/**
 * ThemeColors type definition
 * Shared across theme generation modules
 */

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
