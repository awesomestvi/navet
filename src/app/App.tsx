import { useCallback, useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import type { NavetProviderSession } from '@/app/core/navet';
import type { IntegrationProviderId } from '@/app/types/provider';
import { AuthProvider, useAuthSession } from '@/auth/AuthProvider';
import { type AuthSession, type HomeAssistantAuthSession, isHomeyAuthSession } from '@/auth/types';
import { LoadingSpinner } from './components/primitives/loading-spinner';
import { ErrorDisplay } from './components/shared/error-display';
import { NetworkStatusBanner } from './components/shared/network-status-banner';
import { PwaUpdatePrompt } from './components/shared/pwa-update-prompt';
import { Toaster } from './components/ui/sonner';
import { HomeySelectionPage } from './features/auth/homey-selection-page';
import { LoginPage } from './features/auth/login-page';
import { DashboardPage } from './features/dashboard';
import {
  useAccentColor,
  useCurrentIntegrationConnectionState,
  useCurrentIntegrationStore,
  useHomeAssistant,
} from './hooks';
import { useKeepDeviceAwake } from './hooks/use-keep-device-awake';
import { useViewportResize } from './hooks/use-viewport-resize';
import { I18nProvider } from './i18n';
import { resolveParentHomeAssistantBridge } from './infrastructure/home-assistant/runtime/parent-hass-bridge';
import { INVALID_HOME_ASSISTANT_AUTH_MESSAGE } from './services/ha-connection.service';
import {
  bootstrapIntegrationSession,
  teardownIntegrationSession,
} from './services/integration-bootstrap.service';
import { useErrorStore, useSettingsStore } from './stores';
import { startNavigationStoreSync } from './stores/navigation-store';
import { initializeSearchStore } from './stores/search-store';
import {
  appErrorSelectors,
  homeAssistantSelectors,
  integrationSelectors,
  settingsSelectors,
} from './stores/selectors';
import { resolveEffectsQuality } from './utils/effects-quality';
import { clearViewportCssVars, syncViewportCssVars } from './utils/viewport';

function getConnectionAttemptKey(session: AuthSession) {
  return `${session.providerId}\n${session.runtime}\n${session.hassUrl}\n${session.expiresAt ?? ''}`;
}

function createIngressProxyRecoverySession(
  session: HomeAssistantAuthSession
): HomeAssistantAuthSession {
  return {
    ...session,
    auth: undefined,
    expiresAt: undefined,
  };
}

function AppContent() {
  const { runtime, session, sessions, ready, logout, replaceSession } = useAuthSession();
  const isAuthenticated = Boolean(session);
  const needsHomeySelection =
    session?.providerId === 'homey' && Boolean(session.needsHomeySelection);
  const canResetSessionFromError = runtime === 'standalone-oauth';
  const appError = useErrorStore(appErrorSelectors.error);
  const clearAppError = useErrorStore(appErrorSelectors.clearError);
  const { connected, connecting, reconnecting } = useCurrentIntegrationConnectionState();
  const connect = useHomeAssistant(homeAssistantSelectors.connect);
  const disconnect = useHomeAssistant(homeAssistantSelectors.disconnect);
  const syncPanelHass = useHomeAssistant(homeAssistantSelectors.syncPanelHass);
  const setCurrentProviderId = useCurrentIntegrationStore(
    integrationSelectors.setCurrentProviderId
  );
  const setProviderSessions = useCurrentIntegrationStore(integrationSelectors.setProviderSessions);
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
  const failedConnectionAttemptKeys = useRef<Partial<Record<IntegrationProviderId, string>>>({});
  const previousSessionProviderIds = useRef<IntegrationProviderId[]>([]);
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
      !session ||
      session.providerId !== 'home_assistant'
    ) {
      return;
    }

    ingressInvalidAuthRecoveryInFlight.current = true;
    delete failedConnectionAttemptKeys.current.home_assistant;
    const recoverySession = createIngressProxyRecoverySession(session);
    replaceSession(recoverySession);

    void connect(recoverySession)
      .then(() => {
        clearAppError();
      })
      .catch(() => undefined)
      .finally(() => {
        ingressInvalidAuthRecoveryInFlight.current = false;
      });
  }, [runtime, isAuthenticated, session, replaceSession, connect, clearAppError]);

  const retryConnect = useCallback(() => {
    if (runtime === 'ha-ingress') {
      recoverIngressSession();
      return;
    }

    if (!isAuthenticated || !session || session.providerId !== 'home_assistant') {
      return;
    }
    delete failedConnectionAttemptKeys.current.home_assistant;

    void connect(session).catch(() => {
      failedConnectionAttemptKeys.current.home_assistant = getConnectionAttemptKey(session);
    });
  }, [runtime, recoverIngressSession, isAuthenticated, session, connect]);

  const resetSessionToLogin = useCallback(() => {
    if (session?.providerId) {
      delete failedConnectionAttemptKeys.current[session.providerId];
    }
    clearAppError();
    logout();
  }, [clearAppError, logout, session?.providerId]);

  useEffect(() => {
    if (session?.providerId) {
      setCurrentProviderId(session.providerId);
    }
  }, [session?.providerId, setCurrentProviderId]);

  useEffect(() => {
    const nextSessions = Object.fromEntries(
      Object.entries(sessions).map(([providerId, nextSession]) => [
        providerId,
        {
          providerId: nextSession.providerId,
          connected: providerId === 'home_assistant' ? connected : true,
          runtime: nextSession.runtime,
          authMode: nextSession.authMode,
        },
      ])
    ) as Record<IntegrationProviderId, NavetProviderSession>;

    setProviderSessions(nextSessions);
  }, [sessions, connected, setProviderSessions]);

  useEffect(() => {
    const currentProviderIds = Object.keys(sessions) as IntegrationProviderId[];
    const removedProviderIds = previousSessionProviderIds.current.filter(
      (previousProviderId) => !currentProviderIds.includes(previousProviderId)
    );

    for (const removedProviderId of removedProviderIds) {
      delete failedConnectionAttemptKeys.current[removedProviderId];
      teardownIntegrationSession(removedProviderId);
      if (removedProviderId === 'home_assistant') {
        disconnect();
      }
    }

    previousSessionProviderIds.current = currentProviderIds;

    if (!currentProviderIds.length) {
      disconnect();
    }
  }, [sessions, disconnect]);

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
    if (!isAuthenticated || runtime !== 'ha-ingress') {
      return;
    }

    const syncParentHass = () => {
      const parentHass = resolveParentHomeAssistantBridge();
      if (parentHass) {
        syncPanelHass(parentHass);
        clearAppError();
        delete failedConnectionAttemptKeys.current.home_assistant;
        return true;
      }

      return false;
    };

    if (syncParentHass()) {
      return;
    }

    const intervalId = window.setInterval(() => {
      syncParentHass();
    }, 1_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isAuthenticated, runtime, syncPanelHass, clearAppError]);

  useEffect(() => {
    const homeySession = sessions.homey;
    if (!homeySession || !isHomeyAuthSession(homeySession) || homeySession.needsHomeySelection) {
      return;
    }

    const attemptKey = getConnectionAttemptKey(homeySession);
    if (failedConnectionAttemptKeys.current.homey === attemptKey) {
      return;
    }

    void bootstrapIntegrationSession(homeySession).catch(() => {
      failedConnectionAttemptKeys.current.homey = attemptKey;
    });
  }, [sessions.homey]);

  useEffect(() => {
    const homeAssistantSession = sessions.home_assistant;
    if (!homeAssistantSession || homeAssistantSession.providerId !== 'home_assistant' || appError) {
      return;
    }

    if (runtime === 'ha-ingress') {
      const parentHass = resolveParentHomeAssistantBridge();
      if (parentHass) {
        syncPanelHass(parentHass);
        return;
      }
    }

    if (connected || connecting) {
      return;
    }

    const attemptKey = getConnectionAttemptKey(homeAssistantSession);
    if (failedConnectionAttemptKeys.current.home_assistant === attemptKey) {
      return;
    }

    void connect(homeAssistantSession).catch(() => {
      failedConnectionAttemptKeys.current.home_assistant = attemptKey;
    });
  }, [sessions.home_assistant, connected, connecting, appError, runtime, syncPanelHass, connect]);

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
      {isAuthenticated && !appError && !needsHomeySelection ? (
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
      ) : needsHomeySelection ? (
        <HomeySelectionPage />
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
