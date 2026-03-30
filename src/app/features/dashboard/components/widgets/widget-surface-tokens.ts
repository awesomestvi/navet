import type { CSSProperties } from 'react';
import { getCardShellSurfaceTokens } from '@/app/components/shared/theme/card-shell-surface-tokens';
import { getCustomCardTintSurface } from '@/app/components/shared/theme/custom-card-tint-surface';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import type { ThemeType } from '@/app/hooks/use-theme';

interface DashboardWidgetSurfaceTokens {
  panelClassName: string;
  panelStyle?: CSSProperties;
  glowStyle?: CSSProperties;
  overlayClassName?: string | null;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  borderClassName: string;
  dividerClassName: string;
  subtleFill: string;
  dialogBackdrop: string;
}

export function getDashboardWidgetSurfaceTokens(
  theme: ThemeType,
  tintColor?: string
): DashboardWidgetSurfaceTokens {
  const surface = getThemeSurfaceTokens(theme);
  const cardShell = getCardShellSurfaceTokens(theme);
  const tintSurface = getCustomCardTintSurface(theme, tintColor);
  const hasTintSurface = Boolean(tintSurface.panelStyle);

  return {
    panelClassName: `${hasTintSurface ? '' : theme === 'light' ? 'bg-white/70' : theme === 'contrast' ? 'bg-black/50' : surface.panel} ${cardShell.backdropClassName} relative overflow-hidden rounded-2xl p-4 border ${theme === 'light' ? 'border-gray-200/50' : surface.border}`,
    panelStyle: tintSurface.panelStyle,
    glowStyle: tintSurface.glowStyle,
    overlayClassName: tintSurface.overlayClassName,
    textPrimary: surface.textPrimary,
    textSecondary: surface.textSecondary,
    textMuted: surface.textMuted,
    borderClassName: theme === 'light' ? 'border-gray-200/50' : surface.border,
    dividerClassName: theme === 'light' ? 'border-gray-200' : surface.border,
    dialogBackdrop: surface.dialogBackdrop,
    subtleFill:
      tintSurface.subtleFill ??
      (theme === 'light'
        ? '#f3f4f6'
        : theme === 'contrast'
          ? 'rgba(255,255,255,0.05)'
          : 'rgba(255,255,255,0.08)'),
  };
}
