import { useCallback, useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { AuthProvider, useAuthSession } from '@/auth/AuthProvider';
import type { AuthSession } from '@/auth/types';
import { LoadingSpinner } from './components/primitives/loading-spinner';
import { ErrorDisplay } from './components/shared/error-display';
import { NetworkStatusBanner } from './components/shared/network-status-banner';
import { PwaUpdatePrompt } from './components/shared/pwa-update-prompt';
import { Toaster } from './components/ui/sonner';
import { LoginPage } from './features/auth/login-page';
import { DashboardPage } from './features/dashboard';
import { useAccentColor, useHomeAssistant } from './hooks';
import { useKeepDeviceAwake } from './hooks/use-keep-device-awake';
import { useViewportResize } from './hooks/use-viewport-resize';
import { I18nProvider } from './i18n';
import { INVALID_HOME_ASSISTANT_AUTH_MESSAGE } from './services/ha-connection.service';
import { useErrorStore, useSettingsStore } from './stores';
import { startNavigationStoreSync } from './stores/navigation-store';
import { initializeSearchStore } from './stores/search-store';
import { appErrorSelectors, homeAssistantSelectors, settingsSelectors } from './stores/selectors';
import { resolveEffectsQuality } from './utils/effects-quality';
import { clearViewportCssVars, syncViewportCssVars } from './utils/viewport';

function getConnectionAttemptKey(session: AuthSession) {
  return `${session.runtime}\n${session.hassUrl}\n${session.expiresAt ?? ''}`;
}

function createIngressProxyRecoverySession(session: AuthSession): AuthSession {
  return {
    ...session,
    auth: undefined,
    expiresAt: undefined,
  };
}

function AppContent() {
  const { runtime, session, ready, logout } = useAuthSession();
  const isAuthenticated = Boolean(session);
  const canResetSessionFromError = runtime === 'standalone-oauth';
  const appError = useErrorStore(appErrorSelectors.error);
  const clearAppError = useErrorStore(appErrorSelectors.clearError);
  const connected = useHomeAssistant(homeAssistantSelectors.connected);
  const connecting = useHomeAssistant(homeAssistantSelectors.connecting);
  const reconnecting = useHomeAssistant(homeAssistantSelectors.reconnecting);
  const connect = useHomeAssistant(homeAssistantSelectors.connect);
  const disconnect = useHomeAssistant(homeAssistantSelectors.disconnect);
  const accentColor = useAccentColor();
  const { disableAnimations, lowPowerMode, effectsQuality, keepDeviceAwake } = useSettingsStore(
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
  const failedConnectionAttemptKey = useRef<string | null>(null);
  const ingressInvalidAuthRecoveryInFlight = useRef(false);
  const isInvalidHomeAssistantAuth = appError?.message === INVALID_HOME_ASSISTANT_AUTH_MESSAGE;

  const syncViewportEnvironment = useCallback(() => {
    syncViewportCssVars();
  }, []);

  useViewportResize(syncViewportEnvironment);
  useKeepDeviceAwake(isAuthenticated && keepDeviceAwake);

  const recoverIngressSession = useCallback(() => {
    if (
      runtime !== 'ha-ingress' ||
      ingressInvalidAuthRecoveryInFlight.current ||
      !isAuthenticated ||
      !session
    ) {
      return;
    }

    ingressInvalidAuthRecoveryInFlight.current = true;
    failedConnectionAttemptKey.current = null;
    const recoverySession = createIngressProxyRecoverySession(session);

    void connect(recoverySession)
      .then(() => {
        clearAppError();
      })
      .catch(() => undefined)
      .finally(() => {
        ingressInvalidAuthRecoveryInFlight.current = false;
      });
  }, [runtime, isAuthenticated, session, connect, clearAppError]);

  const retryConnect = useCallback(() => {
    if (runtime === 'ha-ingress') {
      recoverIngressSession();
      return;
    }

    if (!isAuthenticated || !session) {
      return;
    }
    failedConnectionAttemptKey.current = null;

    void connect(session).catch(() => {
      failedConnectionAttemptKey.current = getConnectionAttemptKey(session);
    });
  }, [runtime, recoverIngressSession, isAuthenticated, session, connect]);

  const resetSessionToLogin = useCallback(() => {
    failedConnectionAttemptKey.current = null;
    clearAppError();
    logout();
  }, [clearAppError, logout]);

  useEffect(() => {
    if (!isAuthenticated) {
      failedConnectionAttemptKey.current = null;
      disconnect();
    }
  }, [isAuthenticated, disconnect]);

  useEffect(() => {
    if (!isAuthenticated || !canResetSessionFromError) {
      return;
    }

    if (appError?.message !== INVALID_HOME_ASSISTANT_AUTH_MESSAGE) {
      return;
    }

    resetSessionToLogin();
  }, [appError, canResetSessionFromError, isAuthenticated, resetSessionToLogin]);

  useEffect(() => {
    if (!isAuthenticated || runtime !== 'ha-ingress' || !isInvalidHomeAssistantAuth) {
      return;
    }

    recoverIngressSession();
  }, [isAuthenticated, runtime, isInvalidHomeAssistantAuth, recoverIngressSession]);

  useEffect(() => {
    if (isAuthenticated && session && !connected && !connecting && !appError) {
      const attemptKey = getConnectionAttemptKey(session);
      if (failedConnectionAttemptKey.current === attemptKey) {
        return;
      }

      void connect(session).catch(() => {
        failedConnectionAttemptKey.current = attemptKey;
      });
    }
  }, [isAuthenticated, session, connected, connecting, appError, connect]);

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
        onRetry={isAuthenticated && session ? retryConnect : undefined}
        onResetSession={
          isAuthenticated && canResetSessionFromError ? resetSessionToLogin : undefined
        }
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
      {!ready ? (
        <LoadingSpinner message="Starting your dashboard..." fullScreen />
      ) : !isAuthenticated ? (
        <LoginPage />
      ) : (
        <DashboardPage />
      )}
    </>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </I18nProvider>
  );
}
