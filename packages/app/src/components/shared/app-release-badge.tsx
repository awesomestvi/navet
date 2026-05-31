import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { cn } from '@navet/app/components/ui/utils';
import { APP_VERSION } from '@navet/app/constants/app-version';
import { useTheme } from '@navet/app/hooks';

interface AppReleaseBadgeProps {
  className?: string;
}

export function AppReleaseBadge({ className = '' }: AppReleaseBadgeProps) {
  const { theme, primaryColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const isBeta = APP_VERSION.includes('-beta');

  if (!isBeta) {
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
      Beta
    </span>
  );
}
