import {
  getThemeSurfaceTokens,
  type ThemeSurfaceTokens,
} from '@navet/app/components/shared/theme/theme-surface-tokens';
import { useTheme } from '@navet/app/hooks';
import { EmptyStatePanel } from '@navet/ui';
import { type LucideIcon, Wand2 } from 'lucide-react';
import type { ReactNode } from 'react';

export interface DashboardEmptyStateProps {
  title: string;
  description: string;
  surface?: ThemeSurfaceTokens;
  accentColor?: string;
  className?: string;
  compact?: boolean;
  variant?: 'default' | 'inline';
  icon?: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: LucideIcon;
  children?: ReactNode;
}

export function DashboardEmptyState({
  title,
  description,
  surface: surfaceOverride,
  accentColor: accentColorOverride,
  className,
  compact = false,
  variant = 'default',
  icon: Icon = Wand2,
  actionLabel,
  onAction,
  actionIcon: ActionIcon = Wand2,
  children,
}: DashboardEmptyStateProps) {
  const { theme, accentColor: themeAccentColor } = useTheme();
  const surface = surfaceOverride ?? getThemeSurfaceTokens(theme);
  const accentColor = accentColorOverride ?? themeAccentColor ?? '#9fb0ff';

  return (
    <EmptyStatePanel
      title={title}
      description={description}
      surface={{
        panelClassName: `${surface.panelMuted} ${surface.cardShadow}`,
        borderClassName: surface.border,
        textPrimaryClassName: surface.textPrimary,
        textSecondaryClassName: surface.textSecondary,
        hoverClassName: surface.hoverBg,
      }}
      accentColor={accentColor}
      className={className}
      compact={compact}
      variant={variant}
      icon={Icon}
      actionLabel={actionLabel}
      onAction={onAction}
      actionIcon={ActionIcon}
    >
      {children}
    </EmptyStatePanel>
  );
}
