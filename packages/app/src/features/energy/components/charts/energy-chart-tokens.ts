import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import type { ThemeMode } from '@navet/app/stores/theme-store';

export function getEnergyChartTokens(theme: ThemeMode, accentColor: string) {
  const surface = getThemeSurfaceTokens(theme);
  const isLight = theme === 'light';

  return {
    surface,
    track: isLight ? 'rgba(148, 163, 184, 0.14)' : 'rgba(255, 255, 255, 0.08)',
    trackStrong: isLight ? 'rgba(148, 163, 184, 0.22)' : 'rgba(255, 255, 255, 0.12)',
    grid: isLight ? 'rgba(100, 116, 139, 0.12)' : 'rgba(255, 255, 255, 0.06)',
    gridStrong: isLight ? 'rgba(100, 116, 139, 0.18)' : 'rgba(255, 255, 255, 0.1)',
    label: isLight ? 'rgba(15, 23, 42, 0.8)' : 'rgba(255, 255, 255, 0.82)',
    labelMuted: isLight ? 'rgba(71, 85, 105, 0.72)' : 'rgba(255, 255, 255, 0.44)',
    labelSubtle: isLight ? 'rgba(100, 116, 139, 0.56)' : 'rgba(255, 255, 255, 0.28)',
    accent: accentColor,
    accentSoft: `${accentColor}33`,
    accentGlow: `${accentColor}1a`,
    good: isLight ? '#0f766e' : '#5eead4',
    warn: isLight ? '#c2410c' : '#fdba74',
    alert: isLight ? '#dc2626' : '#fda4af',
  };
}
