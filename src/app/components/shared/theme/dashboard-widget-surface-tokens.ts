import type { CSSProperties } from 'react';
import { getCardShellSurfaceTokens } from '@/app/components/shared/theme/card-shell-surface-tokens';
import { getCustomCardTintSurface } from '@/app/components/shared/theme/custom-card-tint-surface';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import type { ThemeType } from '@/app/hooks/use-theme';

export interface DashboardWidgetSurfaceTokens {
  panelClassName: string;
  panelStyle?: CSSProperties;
  glowStyle?: CSSProperties;
  overlayClassName?: string | null;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  borderClassName: string;
  outerFrameClassName: string;
  innerFrameClassName: string;
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
  const outerBorderColorClassName = theme === 'light' ? 'border-gray-200/50' : surface.border;

  return {
    panelClassName: `${hasTintSurface ? '' : theme === 'light' ? 'bg-white/70' : theme === 'black' ? 'bg-black/50' : surface.panel} ${cardShell.backdropClassName} relative overflow-hidden rounded-2xl p-4 border ${outerBorderColorClassName}`,
    panelStyle: tintSurface.panelStyle,
    glowStyle: tintSurface.glowStyle,
    overlayClassName: tintSurface.overlayClassName,
    textPrimary: surface.textPrimary,
    textSecondary: surface.textSecondary,
    textMuted: surface.textMuted,
    borderClassName: outerBorderColorClassName,
    outerFrameClassName: '',
    innerFrameClassName: 'absolute inset-0 rounded-[28px]',
    dividerClassName: theme === 'light' ? 'border-gray-200' : surface.border,
    dialogBackdrop: surface.dialogBackdrop,
    subtleFill:
      tintSurface.subtleFill ??
      (theme === 'light'
        ? '#f3f4f6'
        : theme === 'black'
          ? 'rgba(255,255,255,0.05)'
          : 'rgba(255,255,255,0.08)'),
  };
}
