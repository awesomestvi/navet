import { useEffect, useState } from 'react';
import { NetworkStatusBanner } from './components/shared/network-status-banner';
import { PwaUpdatePrompt } from './components/shared/pwa-update-prompt';
import { Toaster } from './components/ui/sonner';
import { useAuth } from './contexts/auth-context';
import { useConfig } from './contexts/config-context';
import { ErrorProvider } from './contexts/error-context';
import { LoadingProvider } from './contexts/loading-context';
import { LoginPage } from './features/auth/login-page';
import { DashboardPage } from './features/dashboard';
import { useHomeAssistant, useTheme } from './hooks';
import { I18nProvider } from './i18n';
import { useSettingsStore } from './stores';
import { homeAssistantSelectors, settingsSelectors } from './stores/selectors';
import { resolveEffectsQuality } from './utils/effects-quality';

function AppContent() {
  const { isAuthenticated, config: authConfig } = useAuth();
  const { config: haConfig } = useConfig();
  const connected = useHomeAssistant(homeAssistantSelectors.connected);
  const connecting = useHomeAssistant(homeAssistantSelectors.connecting);
  const connect = useHomeAssistant(homeAssistantSelectors.connect);
  const { accentColor } = useTheme();
  const disableAnimations = useSettingsStore(settingsSelectors.disableAnimations);
  const lowPowerMode = useSettingsStore(settingsSelectors.lowPowerMode);
  const effectsQuality = useSettingsStore(settingsSelectors.effectsQuality);
  const pageZoom = useSettingsStore(settingsSelectors.pageZoom);
  const resolvedEffectsQuality = resolveEffectsQuality(
    effectsQuality,
    disableAnimations || lowPowerMode
  );
  const reducedEffectsEnabled = resolvedEffectsQuality === 'low';
  const pageZoomScale = pageZoom / 100;
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine
  );

  useEffect(() => {
    const configToUse = authConfig || haConfig;

    if (isAuthenticated && configToUse && !connected && !connecting) {
      connect({
        hassUrl: configToUse.url,
        token: configToUse.token,
      }).catch((_err) => {});
    }
  }, [isAuthenticated, authConfig, haConfig, connected, connecting, connect]);

  useEffect(() => {
    document.documentElement.style.setProperty('--navet-accent', accentColor);
    return () => {
      document.documentElement.style.removeProperty('--navet-accent');
    };
  }, [accentColor]);

  useEffect(() => {
    document.documentElement.dataset.noAnimation = reducedEffectsEnabled ? 'true' : 'false';
    document.documentElement.dataset.lowPower = reducedEffectsEnabled ? 'true' : 'false';
    document.documentElement.dataset.effectsQuality = resolvedEffectsQuality;

    return () => {
      delete document.documentElement.dataset.noAnimation;
      delete document.documentElement.dataset.lowPower;
      delete document.documentElement.dataset.effectsQuality;
    };
  }, [reducedEffectsEnabled, resolvedEffectsQuality]);

  useEffect(() => {
    const syncRootScaleVars = () => {
      const shouldScaleRootFont =
        window.matchMedia('(hover: none) and (pointer: coarse)').matches ||
        window.matchMedia('(max-width: 1024px)').matches;
      const rootFontSize = shouldScaleRootFont ? 16 * pageZoomScale : 16;

      document.documentElement.style.setProperty('--font-size', `${rootFontSize}px`);
    };

    const syncViewportVars = () => {
      const visibleViewportWidth = window.visualViewport?.width ?? window.innerWidth;
      const visibleViewportHeight = window.visualViewport?.height ?? window.innerHeight;
      const layoutViewportWidth = Math.max(window.innerWidth, visibleViewportWidth);
      const layoutViewportHeight = Math.max(window.innerHeight, visibleViewportHeight);
      const logicalViewportWidth = layoutViewportWidth / pageZoomScale;
      const logicalViewportHeight = layoutViewportHeight / pageZoomScale;

      document.documentElement.style.setProperty(
        '--navet-viewport-width',
        `${logicalViewportWidth}px`
      );
      document.documentElement.style.setProperty(
        '--navet-viewport-height',
        `${logicalViewportHeight}px`
      );
      document.documentElement.style.setProperty(
        '--navet-visible-viewport-width',
        `${visibleViewportWidth}px`
      );
      document.documentElement.style.setProperty(
        '--navet-visible-viewport-height',
        `${visibleViewportHeight}px`
      );
    };

    document.documentElement.style.zoom = String(pageZoomScale);
    syncRootScaleVars();
    syncViewportVars();

    window.addEventListener('resize', syncRootScaleVars);
    window.addEventListener('resize', syncViewportVars);
    window.visualViewport?.addEventListener('resize', syncRootScaleVars);
    window.visualViewport?.addEventListener('resize', syncViewportVars);

    return () => {
      window.removeEventListener('resize', syncRootScaleVars);
      window.removeEventListener('resize', syncViewportVars);
      window.visualViewport?.removeEventListener('resize', syncRootScaleVars);
      window.visualViewport?.removeEventListener('resize', syncViewportVars);
      document.documentElement.style.zoom = '';
      document.documentElement.style.removeProperty('--font-size');
      document.documentElement.style.removeProperty('--navet-viewport-width');
      document.documentElement.style.removeProperty('--navet-viewport-height');
      document.documentElement.style.removeProperty('--navet-visible-viewport-width');
      document.documentElement.style.removeProperty('--navet-visible-viewport-height');
    };
  }, [pageZoomScale]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <>
      <PwaUpdatePrompt />
      <NetworkStatusBanner connected={connected} connecting={connecting} isOnline={isOnline} />
      <Toaster />
      {!isAuthenticated ? <LoginPage /> : <DashboardPage />}
    </>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <LoadingProvider>
        <ErrorProvider>
          <AppContent />
        </ErrorProvider>
      </LoadingProvider>
    </I18nProvider>
  );
}
