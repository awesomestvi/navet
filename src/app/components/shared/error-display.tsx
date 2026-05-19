import { AlertTriangle, LogIn, RefreshCw, X } from 'lucide-react';
import { memo } from 'react';
import { Button } from '@/app/components/primitives';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { navetTypographyTokens } from '@/app/components/system/tokens';
import { useI18n, useTheme } from '@/app/hooks';
import { useErrorStore } from '@/app/stores';
import { homeAssistantStore } from '@/app/stores/home-assistant-store';
import { appErrorSelectors } from '@/app/stores/selectors';
import { getPublicAssetUrl } from '@/app/utils/public-assets';

interface ErrorDisplayProps {
  onRetry?: () => void;
  onResetSession?: () => void;
  showClose?: boolean;
}

export const ErrorDisplay = memo(function ErrorDisplay({
  onRetry,
  onResetSession,
  showClose = true,
}: ErrorDisplayProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const surface = getThemeSurfaceTokens(theme);
  const error = useErrorStore(appErrorSelectors.error);
  const logoSrc = getPublicAssetUrl('logo.svg');
  const isLightTheme = theme === 'light';
  const isBlack = theme === 'black';
  const textColor = isLightTheme ? 'text-slate-950' : 'text-white';
  const mutedColor = isLightTheme ? 'text-slate-600' : 'text-white/68';
  const pageBackground = isLightTheme
    ? 'bg-[radial-gradient(circle_at_50%_34%,rgba(249,115,22,0.22)_0%,rgba(249,115,22,0.10)_24%,transparent_46%),linear-gradient(180deg,#f8fafc_0%,#eef2f7_100%)]'
    : isBlack
      ? 'bg-[radial-gradient(circle_at_50%_34%,rgba(249,115,22,0.30)_0%,rgba(249,115,22,0.13)_24%,transparent_46%),linear-gradient(180deg,#050505_0%,#000_100%)]'
      : 'bg-[radial-gradient(circle_at_50%_34%,rgba(249,115,22,0.30)_0%,rgba(249,115,22,0.12)_24%,transparent_46%),linear-gradient(180deg,#060a12_0%,#030712_100%)]';
  const panelSurface = `${surface.border} ${surface.panelMuted} ${surface.cardShadow}`;
  /** Clears the overlay and HA connection error (see `homeAssistantStore.clearError`). */
  const dismissError = () => {
    homeAssistantStore.getState().clearError();
  };

  if (!error) return null;

  return (
    <div className={`fixed inset-0 z-50 overflow-y-auto ${pageBackground}`}>
      <style>{`
        @keyframes navet-error-rise {
          0% { opacity: 0; transform: translateY(18px) scale(0.96); filter: blur(10px); }
          100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }

        @keyframes navet-error-ring {
          0% { opacity: 0.72; transform: scale(0.68); }
          78%, 100% { opacity: 0; transform: scale(1.42); }
        }
      `}</style>
      <div className="pointer-events-none absolute left-1/2 top-[28%] h-80 w-80 -translate-x-1/2 rounded-full bg-orange-500/18 blur-3xl" />

      <section className="relative mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center px-4 py-5 text-center sm:px-6">
        <div className="w-full [animation:navet-error-rise_0.9s_ease-out_both]">
          <div className="mx-auto flex min-h-20 w-full max-w-[18rem] items-center justify-center">
            <div className="relative flex h-20 w-20 items-center justify-center">
              {[
                '[animation:navet-error-ring_4.6s_ease-out_infinite]',
                '[animation:navet-error-ring_4.6s_ease-out_0.72s_infinite]',
                '[animation:navet-error-ring_4.6s_ease-out_1.44s_infinite]',
              ].map((ringClassName) => (
                <span
                  key={ringClassName}
                  className={`absolute inset-0 rounded-full border border-orange-300/30 ${ringClassName}`}
                />
              ))}
              <div className="absolute inset-0 rounded-full bg-orange-500/16 blur-2xl" />
              <img src={logoSrc} alt="" className="relative z-10 h-20 w-20" />
            </div>
          </div>

          <div className="mx-auto mt-4 h-px w-28 bg-[linear-gradient(90deg,transparent,#f97316,transparent)]" />

          <p className={`mt-5 text-xs font-semibold uppercase tracking-[0.24em] ${mutedColor}`}>
            Navet
          </p>
          <h1
            className={`mx-auto mt-2 max-w-xl text-3xl font-semibold tracking-tight md:text-4xl ${textColor}`}
          >
            {t('errorDisplay.title')}
          </h1>
          <p className={`mx-auto mt-3 max-w-md text-sm leading-relaxed ${mutedColor}`}>
            {error.message}
          </p>

          <div
            className={`relative mx-auto mt-7 w-full max-w-md overflow-hidden rounded-[28px] border ${panelSurface} p-4 text-left backdrop-blur-2xl sm:p-5`}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-90"
              style={{
                background:
                  'radial-gradient(circle at top left, rgba(249,115,22,0.18), transparent 34%), radial-gradient(circle at bottom right, rgba(20,184,166,0.10), transparent 30%)',
              }}
            />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.09),rgba(255,255,255,0.025)_22%,transparent_58%)]" />
            <div className="relative space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-orange-300/18 bg-orange-500/14 text-orange-200">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold ${textColor}`}>
                      {t('errorDisplay.connectionInterrupted')}
                    </p>
                    <p className={`mt-1 text-sm leading-6 ${mutedColor}`}>
                      {t('errorDisplay.connectionInterruptedDescription')}
                    </p>
                  </div>
                </div>
                {showClose && (
                  <button
                    type="button"
                    onClick={dismissError}
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${surface.hoverBg} ${mutedColor} transition-colors hover:text-orange-200`}
                    aria-label={t('common.close')}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {error.details ? (
                <p
                  className={`rounded-2xl border border-orange-300/12 bg-black/10 p-3 font-mono text-xs leading-5 ${mutedColor}`}
                >
                  {error.details}
                </p>
              ) : null}

              {(onRetry || onResetSession) && (
                <div className="space-y-3">
                  {onRetry && (
                    <Button
                      variant="secondary"
                      type="button"
                      onClick={onRetry}
                      className="min-h-12 w-full rounded-full border-orange-300/20 bg-[linear-gradient(180deg,#fb923c,#f97316)] px-4 py-3 text-white shadow-[0_18px_42px_-24px_rgba(249,115,22,0.88)] transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <span className="flex items-center justify-center gap-2">
                        <RefreshCw className="h-5 w-5" />
                        {t('errorDisplay.retry')}
                      </span>
                    </Button>
                  )}
                  {onResetSession && (
                    <Button
                      variant="secondary"
                      type="button"
                      onClick={onResetSession}
                      className={`min-h-12 w-full rounded-full px-4 py-3 ${surface.inputBg} ${surface.border} ${textColor}`}
                    >
                      <span className="flex items-center justify-center gap-2">
                        <LogIn className="h-5 w-5" />
                        {t('errorDisplay.backToLogin')}
                      </span>
                    </Button>
                  )}
                </div>
              )}

              <div className={`${navetTypographyTokens.helper} ${mutedColor}`}>
                <p className="text-center font-medium">{t('errorDisplay.commonIssues')}</p>
                <div className="mt-3 grid gap-2 text-left">
                  {[
                    t('errorDisplay.issue.1'),
                    t('errorDisplay.issue.2'),
                    t('errorDisplay.issue.3'),
                    t('errorDisplay.issue.4'),
                    t('errorDisplay.issue.5'),
                    t('errorDisplay.issue.6'),
                  ].map((issue) => (
                    <div key={issue} className="flex items-start gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-300/70" />
                      <span>{issue}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
});
