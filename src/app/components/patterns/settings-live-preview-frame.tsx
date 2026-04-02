import type { ReactNode } from 'react';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useI18n } from '@/app/hooks';
import type { ThemeType } from '@/app/hooks/use-theme';

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
  const stageClassName =
    theme === 'light'
      ? 'bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(241,245,249,0.94))] border-white/80 shadow-[0_24px_56px_-34px_rgba(15,23,42,0.2)]'
      : theme === 'glass'
        ? 'bg-[linear-gradient(180deg,rgba(11,17,32,0.7),rgba(15,23,42,0.56))] border-white/10 shadow-[0_28px_70px_-34px_rgba(8,15,28,0.72)] backdrop-blur-2xl'
        : theme === 'black'
          ? 'bg-[linear-gradient(180deg,rgba(8,8,8,0.98),rgba(0,0,0,1))] border-white/12 shadow-[0_26px_62px_-34px_rgba(0,0,0,0.88)]'
          : 'bg-[linear-gradient(180deg,rgba(34,26,32,0.92),rgba(18,18,22,0.98))] border-white/8 shadow-[0_28px_70px_-36px_rgba(0,0,0,0.82)]';
  const frameBackground =
    background ??
    (theme === 'light'
      ? 'linear-gradient(180deg, rgba(248,250,252,0.98), rgba(226,232,240,0.94))'
      : theme === 'glass'
        ? 'linear-gradient(180deg, rgba(15,23,42,0.6), rgba(2,6,23,0.44))'
        : theme === 'black'
          ? 'linear-gradient(180deg, rgba(8,8,8,0.98), rgba(0,0,0,1))'
          : 'linear-gradient(180deg, rgba(31,41,55,0.96), rgba(17,24,39,0.98))');

  return (
    <div
      className={`overflow-hidden rounded-[28px] border p-4 ${surface.textPrimary} ${className ?? ''}`}
      style={{
        borderColor: `${accentColor}33`,
        background: frameBackground,
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

      <div
        className={`mt-4 flex min-h-[13.5rem] items-center justify-center overflow-visible rounded-[30px] border px-4 py-6 ${stageClassName}`}
      >
        <div className="w-full max-w-[17rem]">{children}</div>
      </div>
    </div>
  );
}
