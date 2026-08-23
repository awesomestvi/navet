import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { navetRadiusTokens, navetSpacingTokens } from '@navet/app/components/system/tokens';
import { cn } from '@navet/app/components/ui/utils';
import { useTheme } from '@navet/app/hooks';
import type { HTMLAttributes, ReactNode } from 'react';

export interface PanelProps extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
  as?: 'div' | 'section' | 'article';
  muted?: boolean;
  padded?: boolean;
  children: ReactNode;
}

// Status: proposed. Surface container primitive for ordinary sections. This is not a business-card abstraction.
// TODO: Reassess whether section-header composition deserves a separate pattern before adding title/subtitle props here.
export function Panel({
  as: Component = 'div',
  muted = false,
  padded = true,
  className,
  style,
  children,
  ...props
}: PanelProps) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <Component
      {...props}
      style={style}
      className={cn(
        'border backdrop-blur-xl',
        navetRadiusTokens.panel,
        muted ? surface.panelMuted : surface.panel,
        surface.border,
        padded ? navetSpacingTokens.inset.md : '',
        className
      )}
    >
      {children}
    </Component>
  );
}
