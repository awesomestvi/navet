import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { APP_VERSION } from '@/app/constants/app-version';
import { useTheme } from '@/app/hooks';
import { cn } from '@/app/utils/cn';

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
        'inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]',
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
