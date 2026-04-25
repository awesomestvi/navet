import type { CSSProperties, ReactNode } from 'react';
import { BaseCard } from '@/app/components/primitives';
import type { CardSize } from '@/app/components/shared/card-size-selector';
import { getCardShellSurfaceTokens } from '@/app/components/shared/theme/card-shell-surface-tokens';
import { getCardStateSurfaceTokens } from '@/app/components/shared/theme/card-state-surface-tokens';
import { getCustomCardTintSurface } from '@/app/components/shared/theme/custom-card-tint-surface';
import {
  getThemeSurfaceTokens,
  type ThemeSurfaceTokens,
} from '@/app/components/shared/theme/theme-surface-tokens';
import { cn } from '@/app/components/ui/utils';
import type { ThemeType } from '@/app/hooks/use-theme';

interface DashboardCustomCardShellRenderProps {
  baseSurface: ThemeSurfaceTokens;
  stateSurface: ReturnType<typeof getCardStateSurfaceTokens>;
  subtleFill: string;
}

interface DashboardCustomCardShellProps {
  theme: ThemeType;
  size?: CardSize;
  tintColor?: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode | ((tokens: DashboardCustomCardShellRenderProps) => ReactNode);
}

function getFallbackSubtleFill(theme: ThemeType) {
  if (theme === 'light') {
    return '#f1f5f9';
  }

  if (theme === 'black') {
    return 'rgba(255,255,255,0.05)';
  }

  return 'rgba(255,255,255,0.08)';
}

export function DashboardCustomCardShell({
  theme,
  size = 'large',
  tintColor,
  className,
  style,
  children,
}: DashboardCustomCardShellProps) {
  const baseSurface = getThemeSurfaceTokens(theme);
  const stateSurface = getCardStateSurfaceTokens(theme, false);
  const cardShell = getCardShellSurfaceTokens(theme);
  const tintSurface = getCustomCardTintSurface(theme, tintColor);
  const content =
    typeof children === 'function'
      ? children({
          baseSurface,
          stateSurface,
          subtleFill: tintSurface.subtleFill ?? getFallbackSubtleFill(theme),
        })
      : children;

  return (
    <BaseCard
      size={size}
      fullBleed
      className={cn('transition-all duration-500', className)}
      frameClassName={cn(baseSurface.shellPanel, stateSurface.containerClassName)}
      style={tintSurface.panelStyle ?? style}
      disableDefaultSheen={!cardShell.sheenOverlayClassName}
      overlay={
        <>
          {tintSurface.glowStyle ? (
            <div className="pointer-events-none absolute inset-0" style={tintSurface.glowStyle} />
          ) : null}
          {stateSurface.overlayClassName ? (
            <div
              className={`pointer-events-none absolute inset-0 ${stateSurface.overlayClassName}`}
            />
          ) : null}
          {tintSurface.overlayClassName ? (
            <div
              className={`pointer-events-none absolute inset-0 ${tintSurface.overlayClassName}`}
            />
          ) : null}
        </>
      }
      contentClassName="h-full"
    >
      {content}
    </BaseCard>
  );
}
