import { useCallback, useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { ErrorDisplay } from './components/shared/error-display';
import { NetworkStatusBanner } from './components/shared/network-status-banner';
import { PwaUpdatePrompt } from './components/shared/pwa-update-prompt';
import { Toaster } from './components/ui/sonner';
import { useAuth } from './contexts/auth-context';
import { useConfig } from './contexts/config-context';
import { ErrorProvider } from './contexts/error-context';
import { LoginPage } from './features/auth/login-page';
import { DashboardPage } from './features/dashboard';
import { useHomeAssistant, useTheme } from './hooks';
import { useViewportResize } from './hooks/use-viewport-resize';
import { I18nProvider } from './i18n';
import { useSettingsStore } from './stores';
import {
  authSelectors,
  configSelectors,
  homeAssistantSelectors,
  settingsSelectors,
} from './stores/selectors';
import { resolveEffectsQuality } from './utils/effects-quality';
import { clearViewportCssVars, syncViewportCssVars } from './utils/viewport';

function AppContent() {
  const { isAuthenticated, config: authConfig } = useAuth(useShallow(authSelectors.session));
  const haConfig = useConfig(configSelectors.config);
  const connected = useHomeAssistant(homeAssistantSelectors.connected);
  const connecting = useHomeAssistant(homeAssistantSelectors.connecting);
  const reconnecting = useHomeAssistant(homeAssistantSelectors.reconnecting);
  const connect = useHomeAssistant(homeAssistantSelectors.connect);
  const { accentColor } = useTheme();
  const { disableAnimations, lowPowerMode, effectsQuality, pageZoom } = useSettingsStore(
    useShallow(settingsSelectors.displaySettings)
  );
  const pageZoomScale = pageZoom / 100;
  const resolvedEffectsQuality = resolveEffectsQuality(
    effectsQuality,
    disableAnimations || lowPowerMode
  );
  const reducedEffectsEnabled = resolvedEffectsQuality === 'low';
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine
  );

  const syncRootScaleVars = useCallback(() => {
    document.documentElement.style.setProperty('--font-size', '16px');
  }, []);

  const syncZoomEnvironment = useCallback(() => {
    syncRootScaleVars();
    syncViewportCssVars(pageZoomScale);
  }, [pageZoomScale, syncRootScaleVars]);

  useViewportResize(syncZoomEnvironment);

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
    document.documentElement.style.zoom = String(pageZoomScale);
    syncZoomEnvironment();

    return () => {
      document.documentElement.style.zoom = '';
      document.documentElement.style.removeProperty('--font-size');
      clearViewportCssVars();
    };
  }, [pageZoomScale, syncZoomEnvironment]);

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
      <ErrorDisplay />
      <PwaUpdatePrompt />
      <NetworkStatusBanner
        connected={connected}
        connecting={connecting}
        reconnecting={reconnecting}
        isOnline={isOnline}
      />
      <Toaster />
      {!isAuthenticated ? <LoginPage /> : <DashboardPage />}
    </>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <ErrorProvider>
        <AppContent />
      </ErrorProvider>
    </I18nProvider>
  );
}
