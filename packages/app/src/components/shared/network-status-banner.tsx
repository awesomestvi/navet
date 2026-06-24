import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { navetSemanticColorTokens } from '@navet/app/components/system/tokens';
import { useI18n, useTheme } from '@navet/app/hooks';
import type { ThemeType } from '@navet/app/hooks/use-theme';
import { CheckCircle2, Info, OctagonAlert, WifiOff } from 'lucide-react';

type BannerTone = 'info' | 'success' | 'warning' | 'error';

const iconPillClasses: Record<BannerTone, string> = {
  info: 'bg-sky-900 text-sky-100',
  success: 'bg-emerald-900 text-emerald-100',
  warning: 'bg-amber-900 text-amber-100',
  error: 'bg-red-900 text-red-100',
};

const toneIcons: Record<BannerTone, typeof WifiOff> = {
  info: Info,
  success: CheckCircle2,
  warning: OctagonAlert,
  error: WifiOff,
};

function getBannerSurfaceClass(theme: ThemeType, tone: BannerTone) {
  const isLight = theme === 'light';

  if (isLight) {
    switch (tone) {
      case 'info':
        return 'border-sky-200 bg-sky-50';
      case 'success':
        return 'border-emerald-200 bg-emerald-50';
      case 'warning':
        return 'border-amber-200 bg-amber-50';
      case 'error':
        return 'border-red-200 bg-red-50';
    }
  }

  switch (tone) {
    case 'info':
      return 'border-sky-800 bg-sky-950';
    case 'success':
      return 'border-emerald-800 bg-emerald-950';
    case 'warning':
      return 'border-amber-800 bg-amber-950';
    case 'error':
      return 'border-red-800 bg-red-950';
  }
}

interface NetworkStatusBannerProps {
  connected: boolean;
  connecting: boolean;
  reconnecting: boolean;
  isOnline: boolean;
  providerLabel?: string;
  lastError?: string | null;
  /** Override the derived tone for Storybook and special cases. */
  tone?: BannerTone;
}

export function NetworkStatusBanner({
  connected,
  connecting,
  reconnecting,
  isOnline,
  providerLabel,
  lastError,
  tone: toneProp,
}: NetworkStatusBannerProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const surface = getThemeSurfaceTokens(theme);

  if (isOnline && connected) {
    return null;
  }

  const isOffline = !isOnline;
  const derivedTone: BannerTone = isOffline ? 'error' : 'warning';
  const tone = toneProp ?? derivedTone;
  const bannerSurfaceClassName = getBannerSurfaceClass(theme, tone);

  const Icon = toneIcons[tone];
  const title = isOffline
    ? t('network.offlineTitle')
    : reconnecting || connecting
      ? t('network.reconnectingTitle', { provider: providerLabel ?? 'provider' })
      : t('network.disconnectedTitle', { provider: providerLabel ?? 'provider' });
  const description = isOffline
    ? t('network.offlineDescription')
    : reconnecting || connecting
      ? t('network.reconnectingDescription', { provider: providerLabel ?? 'provider' })
      : lastError?.trim() ||
        t('network.disconnectedDescription', { provider: providerLabel ?? 'provider' });

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-70 px-3 pb-20 md:px-6 md:pb-6">
      <div
        className={`mx-auto flex max-w-3xl items-start gap-3 rounded-2xl border px-4 py-3 shadow-xl ${navetSemanticColorTokens[tone]} ${bannerSurfaceClassName}`}
      >
        <div
          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconPillClasses[tone]}`}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className={`text-sm font-semibold ${surface.textPrimary}`}>{title}</p>
          <p className={`mt-1 text-sm leading-relaxed ${surface.textSecondary}`}>{description}</p>
        </div>
      </div>
    </div>
  );
}
