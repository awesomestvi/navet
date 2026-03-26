import type { LucideIcon } from 'lucide-react';
import { memo } from 'react';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { DashboardEmptyState } from '@/app/features/dashboard';
import { useTheme } from '@/app/hooks';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionIcon?: LucideIcon;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState = memo(function EmptyState({
  icon: Icon,
  title,
  description,
  actionIcon: ActionIcon,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const { theme, accentColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <div className="flex h-full items-center justify-center p-6">
      <DashboardEmptyState
        title={title}
        description={description}
        surface={surface}
        accentColor={accentColor}
        icon={Icon}
        actionIcon={ActionIcon}
        actionLabel={actionLabel}
        onAction={onAction}
        className="w-full max-w-md"
      />
    </div>
  );
});
