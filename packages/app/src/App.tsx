import { AuthProvider, useAuthSession } from '@navet/app/auth/AuthProvider';
import { EffectiveEffectsQualityProvider } from '@navet/app/components/shared/theme/effective-effects-quality';
import { useMediaQuery } from '@navet/app/hooks/use-media-query';
import { useSettingsStore } from '@navet/app/stores';
import { settingsSelectors } from '@navet/app/stores/selectors';
import { resolveEffectsQuality } from '@navet/app/utils/effects-quality';
import { lazy, type ReactNode, Suspense, useLayoutEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { LoginPage } from './features/auth/login-page';
import { I18nProvider, useI18n } from './i18n';

const AuthenticatedApp = lazy(() => import('./authenticated-app'));

function VisualQualityRoot({ children }: { children: ReactNode }) {
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const { disableAnimations, effectsQuality, lowPowerMode } = useSettingsStore(
    useShallow(settingsSelectors.displaySettings)
  );
  const resolvedEffectsQuality = resolveEffectsQuality(effectsQuality, lowPowerMode);
  const reducedEffectsEnabled = resolvedEffectsQuality === 'low';
  const animationsDisabled = disableAnimations || reducedEffectsEnabled || prefersReducedMotion;

  useLayoutEffect(() => {
    document.documentElement.dataset.noAnimation = animationsDisabled ? 'true' : 'false';
    document.documentElement.dataset.lowPower = reducedEffectsEnabled ? 'true' : 'false';
    document.documentElement.dataset.effectsQuality = resolvedEffectsQuality;
    document.documentElement.dataset.reducedMotion = prefersReducedMotion ? 'true' : 'false';

    return () => {
      delete document.documentElement.dataset.noAnimation;
      delete document.documentElement.dataset.lowPower;
      delete document.documentElement.dataset.effectsQuality;
      delete document.documentElement.dataset.reducedMotion;
    };
  }, [animationsDisabled, prefersReducedMotion, reducedEffectsEnabled, resolvedEffectsQuality]);

  return (
    <EffectiveEffectsQualityProvider value={resolvedEffectsQuality}>
      {children}
    </EffectiveEffectsQualityProvider>
  );
}

function AppLoading({
  detail,
  message,
  onRetry,
  retryLabel,
}: {
  detail?: string | null;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950 text-white">
      <div className="flex max-w-md flex-col items-center gap-4 px-6 text-center">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-8 w-8 animate-spin text-orange-400"
          aria-hidden="true"
        >
          <path d="M21 12a9 9 0 1 1-6.2-8.56" />
        </svg>
        <p className="text-sm text-white/70">{message}</p>
        {detail ? <p className="text-xs leading-5 text-white/50">{detail}</p> : null}
        {onRetry && retryLabel ? (
          <button
            type="button"
            className="min-h-10 rounded-full border border-white/15 bg-white/8 px-4 text-sm font-medium text-white transition-colors hover:bg-white/12"
            onClick={onRetry}
          >
            {retryLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}

function AppGate() {
  const { error, ready, retryInitialization, session } = useAuthSession();
  const { t } = useI18n();

  if (!ready) {
    return (
      <AppLoading
        message="Starting your dashboard..."
        detail={error}
        onRetry={error ? retryInitialization : undefined}
        retryLabel={error ? t('errorDisplay.retry') : undefined}
      />
    );
  }

  if (!session) {
    return <LoginPage initialError={error ?? undefined} />;
  }

  return (
    <Suspense fallback={<AppLoading message={t('common.loading')} />}>
      <AuthenticatedApp />
    </Suspense>
  );
}

export default function App() {
  return (
    <VisualQualityRoot>
      <I18nProvider>
        <AuthProvider>
          <AppGate />
        </AuthProvider>
      </I18nProvider>
    </VisualQualityRoot>
  );
}
