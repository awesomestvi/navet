import { getThemeColorValue } from '@navet/app/components/shared/theme/theme-colors';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import {
  navetIconSizeTokens,
  navetSpacingTokens,
  navetTypographyTokens,
} from '@navet/app/components/system/tokens';
import { useTheme } from '@navet/app/hooks/use-theme';
import { useI18n } from '@navet/app/i18n';
import { memo, type ReactNode } from 'react';

export interface LoadingSpinnerProps {
  message?: string;
  fullScreen?: boolean;
  action?: ReactNode;
}

export const LoadingSpinner = memo(function LoadingSpinner({
  message,
  fullScreen = false,
  action,
}: LoadingSpinnerProps) {
  const { theme, primaryColor } = useTheme();
  const { t } = useI18n();
  const surface = getThemeSurfaceTokens(theme);
  const resolvedMessage = message ?? t('common.loading');

  const containerClasses = fullScreen
    ? `fixed inset-0 z-50 flex items-center justify-center ${surface.appBg}`
    : 'flex items-center justify-center p-8';

  return (
    <div className={containerClasses}>
      <div className={`flex flex-col items-center ${navetSpacingTokens.stack.lg}`}>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`${navetIconSizeTokens.xl} animate-spin`}
          style={{ color: getThemeColorValue(primaryColor) }}
          aria-hidden="true"
        >
          <path d="M21 12a9 9 0 1 1-6.2-8.56" />
        </svg>
        <p className={`${navetTypographyTokens.body} ${surface.textSecondary}`}>
          {resolvedMessage}
        </p>
        {action}
      </div>
    </div>
  );
});
