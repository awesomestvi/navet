import { AlertTriangle, CheckCircle2, Info, WifiOff } from 'lucide-react';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { navetSemanticColorTokens } from '@/app/components/system/tokens';
import { useI18n, useTheme } from '@/app/hooks';

type BannerTone = 'info' | 'success' | 'warning' | 'error';

const iconPillClasses: Record<BannerTone, string> = {
  info: 'bg-sky-500/16 text-sky-300',
  success: 'bg-emerald-500/16 text-emerald-300',
  warning: 'bg-amber-500/16 text-amber-300',
  error: 'bg-red-500/16 text-red-300',
};

const toneIcons: Record<BannerTone, typeof WifiOff> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: WifiOff,
};

interface NetworkStatusBannerProps {
  connected: boolean;
  connecting: boolean;
  reconnecting: boolean;
  isOnline: boolean;
  /** Override the derived tone for Storybook and special cases. */
  tone?: BannerTone;
}

export function NetworkStatusBanner({
  connected,
  connecting,
  reconnecting,
  isOnline,
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

  const Icon = toneIcons[tone];
  const title = isOffline
    ? t('network.offlineTitle')
    : reconnecting || connecting
      ? t('network.reconnectingTitle')
      : t('network.disconnectedTitle');
  const description = isOffline
    ? t('network.offlineDescription')
    : reconnecting || connecting
      ? t('network.reconnectingDescription')
      : t('network.disconnectedDescription');

  return (
    <div className="fixed inset-x-0 top-0 z-70 px-3 pt-3 md:px-6">
      <div
        className={`mx-auto flex max-w-3xl items-start gap-3 rounded-2xl border px-4 py-3 shadow-xl ${navetSemanticColorTokens[tone]} ${
          theme === 'glass' ? 'backdrop-blur-2xl' : 'backdrop-blur-xl'
        }`}
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
