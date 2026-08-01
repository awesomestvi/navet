import type { CSSProperties } from 'react';

export function getNavetAccentWashStyle(accentColor: string): CSSProperties {
  return {
    background: `radial-gradient(circle at top left, ${accentColor}30, transparent 34%), radial-gradient(circle at bottom right, ${accentColor}14, transparent 28%)`,
  };
}
