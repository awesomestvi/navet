import type { ReactNode } from 'react';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { navetRadiusTokens, navetSpacingTokens } from '@/app/components/system/tokens';
import { cn } from '@/app/components/ui/utils';
import { useTheme } from '@/app/hooks';

export interface PanelProps {
  as?: 'div' | 'section' | 'article';
  muted?: boolean;
  padded?: boolean;
  className?: string;
  children: ReactNode;
}

// Status: proposed. Surface container primitive for ordinary sections. This is not a business-card abstraction.
// TODO: Reassess whether section-header composition deserves a separate pattern before adding title/subtitle props here.
export function Panel({
  as: Component = 'div',
  muted = false,
  padded = true,
  className,
  children,
}: PanelProps) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <Component
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
