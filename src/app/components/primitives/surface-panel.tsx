import type { HTMLAttributes, ReactNode } from 'react';
import { getCardShellSurfaceTokens } from '@/app/components/shared/theme/card-shell-surface-tokens';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import {
  getUiKitPanelSurfaceClassName,
  navetUiKitRadiusTokens,
  type UiKitPanelVariant,
} from '@/app/components/system/tokens/ui-kit-surfaces';
import { cn } from '@/app/components/ui/utils';
import { useTheme } from '@/app/hooks';

export interface SurfacePanelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  radius?: keyof typeof navetUiKitRadiusTokens;
  variant?: UiKitPanelVariant;
  withSheen?: boolean;
  withLightOverlay?: boolean;
  contentClassName?: string;
}

const paddingClassNames = {
  none: '',
  sm: 'p-3',
  md: 'p-4 md:p-5',
  lg: 'p-5 md:p-6',
} as const;

export function SurfacePanel({
  children,
  className,
  contentClassName,
  padding = 'md',
  radius = 'panel',
  variant = 'default',
  withSheen = false,
  withLightOverlay = false,
  ...props
}: SurfacePanelProps) {
  const { theme } = useTheme();
  const cardShell = getCardShellSurfaceTokens(theme);
  const surface = getThemeSurfaceTokens(theme);

  return (
    <div
      {...props}
      className={cn(
        'relative overflow-hidden',
        navetUiKitRadiusTokens[radius],
        getUiKitPanelSurfaceClassName(theme, variant),
        className
      )}
    >
      {withSheen && cardShell.sheenOverlayClassName ? (
        <div
          className={cn('pointer-events-none absolute inset-0', cardShell.sheenOverlayClassName)}
        />
      ) : null}
      {withLightOverlay && surface.lightOverlay ? (
        <div className={cn('pointer-events-none absolute inset-0', surface.lightOverlay)} />
      ) : null}
      <div className={cn('relative', paddingClassNames[padding], contentClassName)}>{children}</div>
    </div>
  );
}
