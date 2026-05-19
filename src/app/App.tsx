import { useCallback, useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { ErrorDisplay } from './components/shared/error-display';
import { NetworkStatusBanner } from './components/shared/network-status-banner';
import { PwaUpdatePrompt } from './components/shared/pwa-update-prompt';
import { Toaster } from './components/ui/sonner';
import { LoginPage } from './features/auth/login-page';
import { DashboardPage } from './features/dashboard';
import { useHomeAssistant, useTheme } from './hooks';
import { useViewportResize } from './hooks/use-viewport-resize';
import { I18nProvider } from './i18n';
import { loadDashboardSession } from './services/dashboard-session.service';
import { useErrorStore, useSettingsStore } from './stores';
import { useAuth } from './stores/auth-store';
import { useConfig } from './stores/config-store';
import { startNavigationStoreSync } from './stores/navigation-store';
import { initializeSearchStore } from './stores/search-store';
import {
  appErrorSelectors,
  authSelectors,
  configSelectors,
  homeAssistantSelectors,
  settingsSelectors,
} from './stores/selectors';
import { resolveEffectsQuality } from './utils/effects-quality';
import { resolveHomeAssistantConnectionUrl } from './utils/home-assistant-connection-target';
import { storage } from './utils/storage';
import { clearViewportCssVars, syncViewportCssVars } from './utils/viewport';

function getConnectionAttemptKey(config: { url: string; token: string }) {
  return `${resolveHomeAssistantConnectionUrl(config)}\n${config.token}`;
}

function AppContent() {
  const { isAuthenticated, config: authConfig } = useAuth(useShallow(authSelectors.session));
  const login = useAuth(authSelectors.login);
  const logout = useAuth(authSelectors.logout);
  const haConfig = useConfig(configSelectors.config);
  const appError = useErrorStore(appErrorSelectors.error);
  const connected = useHomeAssistant(homeAssistantSelectors.connected);
  const connecting = useHomeAssistant(homeAssistantSelectors.connecting);
  const reconnecting = useHomeAssistant(homeAssistantSelectors.reconnecting);
  const connect = useHomeAssistant(homeAssistantSelectors.connect);
  const { accentColor } = useTheme();
  const { disableAnimations, lowPowerMode, effectsQuality } = useSettingsStore(
    useShallow(settingsSelectors.displaySettings)
  );
  const resolvedEffectsQuality = resolveEffectsQuality(
    effectsQuality,
    disableAnimations || lowPowerMode
  );
  const reducedEffectsEnabled = resolvedEffectsQuality === 'low';
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine
  );
  const sharedSessionLoadAttempted = useRef(false);
  const failedConnectionAttemptKey = useRef<string | null>(null);

  const syncViewportEnvironment = useCallback(() => {
    syncViewportCssVars();
  }, []);

  useViewportResize(syncViewportEnvironment);

  const retryConnect = useCallback(() => {
    const configToUse = authConfig || haConfig;
    if (!isAuthenticated || !configToUse) {
      return;
    }
    failedConnectionAttemptKey.current = null;
    const hassUrl = resolveHomeAssistantConnectionUrl(configToUse);
    const connectionConfig = {
      hassUrl,
      token: configToUse.token,
    };

    void connect(connectionConfig).catch(() => {
      failedConnectionAttemptKey.current = getConnectionAttemptKey(configToUse);
    });
  }, [isAuthenticated, authConfig, haConfig, connect]);

  const resetSessionToLogin = useCallback(() => {
    failedConnectionAttemptKey.current = null;
    storage.clear();
    logout();
  }, [logout]);

  useEffect(() => {
    if (!isAuthenticated) {
      failedConnectionAttemptKey.current = null;
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const configToUse = authConfig || haConfig;

    if (isAuthenticated && configToUse && !connected && !connecting && !appError) {
      const attemptKey = getConnectionAttemptKey(configToUse);
      if (failedConnectionAttemptKey.current === attemptKey) {
        return;
      }

      const hassUrl = resolveHomeAssistantConnectionUrl(configToUse);
      void connect({
        hassUrl,
        token: configToUse.token,
      }).catch(() => {
        failedConnectionAttemptKey.current = attemptKey;
      });
    }
  }, [isAuthenticated, authConfig, haConfig, connected, connecting, appError, connect]);

  useEffect(() => {
    if (isAuthenticated || sharedSessionLoadAttempted.current) {
      return;
    }

    sharedSessionLoadAttempted.current = true;

    void loadDashboardSession().then(({ session }) => {
      if (!session) {
        return;
      }

      void login(session.url, session.token);
    });
  }, [isAuthenticated, login]);

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
    syncViewportEnvironment();

    return () => {
      clearViewportCssVars();
    };
  }, [syncViewportEnvironment]);

  useEffect(() => {
    initializeSearchStore();
    return startNavigationStoreSync();
  }, []);

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
      <ErrorDisplay
        onRetry={isAuthenticated && (authConfig || haConfig) ? retryConnect : undefined}
        onResetSession={isAuthenticated ? resetSessionToLogin : undefined}
      />
      <PwaUpdatePrompt />
      {isAuthenticated && !appError ? (
        <NetworkStatusBanner
          connected={connected}
          connecting={connecting}
          reconnecting={reconnecting}
          isOnline={isOnline}
        />
      ) : null}
      <Toaster />
      {!isAuthenticated ? <LoginPage /> : <DashboardPage />}
    </>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <AppContent />
    </I18nProvider>
  );
}
