import { Loader2 } from 'lucide-react';
import { memo } from 'react';
import { getThemeColorValue } from '@/app/components/shared/theme/theme-colors';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import {
  navetIconSizeTokens,
  navetSpacingTokens,
  navetTypographyTokens,
} from '@/app/components/system/tokens';
import { useI18n, useTheme } from '@/app/hooks';

export interface LoadingSpinnerProps {
  message?: string;
  fullScreen?: boolean;
}

export const LoadingSpinner = memo(function LoadingSpinner({
  message,
  fullScreen = false,
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
        <Loader2
          className={`${navetIconSizeTokens.xl} animate-spin`}
          style={{ color: getThemeColorValue(primaryColor) }}
        />
        <p className={`${navetTypographyTokens.body} ${surface.textSecondary}`}>
          {resolvedMessage}
        </p>
      </div>
    </div>
  );
});
