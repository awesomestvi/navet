import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { cn } from '@navet/app/components/ui/utils';
import { getAppReleaseBadgeLabel } from '@navet/app/constants/app-build-metadata';
import { APP_VERSION } from '@navet/app/constants/app-version';
import { useTheme } from '@navet/app/hooks';

interface AppReleaseBadgeProps {
  className?: string;
}

export function AppReleaseBadge({ className = '' }: AppReleaseBadgeProps) {
  const { theme, primaryColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const badgeLabel =
    getAppReleaseBadgeLabel() ??
    (APP_VERSION.includes('-beta') || APP_VERSION.includes('-rc') ? 'Beta' : null);

  if (!badgeLabel) {
    return null;
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.14em]',
        surface.textPrimary,
        className
      )}
      style={{
        borderColor: `${primaryColor}55`,
        backgroundColor: `${primaryColor}1f`,
      }}
    >
      {badgeLabel}
    </span>
  );
}
