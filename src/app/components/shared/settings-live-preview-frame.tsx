import type { ReactNode } from 'react';
import { useI18n } from '@/app/hooks';
import type { ThemeType } from '@/app/hooks/use-theme';
import { getThemeSurfaceTokens } from './theme/theme-surface-tokens';

interface SettingsLivePreviewFrameProps {
  accentColor: string;
  children: ReactNode;
  className?: string;
  subtitle: string;
  theme: ThemeType;
  title: string;
  topBar?: ReactNode;
  background?: string;
}

export function SettingsLivePreviewFrame({
  accentColor,
  children,
  className,
  subtitle,
  theme,
  title,
  topBar,
  background,
}: SettingsLivePreviewFrameProps) {
  const surface = getThemeSurfaceTokens(theme);
  const { t } = useI18n();

  return (
    <div
      className={`overflow-hidden rounded-[24px] border p-4 ${surface.textPrimary} ${className ?? ''}`}
      style={{
        borderColor: `${accentColor}33`,
        background,
      }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-xs font-semibold uppercase tracking-[0.24em] ${surface.textMuted}`}>
            {t('preview.livePreview')}
          </p>
          <p className="mt-2 text-sm font-semibold">{title}</p>
          <p className={`mt-1 text-xs ${surface.textMuted}`}>{subtitle}</p>
        </div>
        {topBar}
      </div>

      <div className="mt-4">{children}</div>
    </div>
  );
}
