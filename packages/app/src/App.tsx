import { AuthProvider, useAuthSession } from '@navet/app/auth/AuthProvider';
import {
  type AuthSession,
  type HomeAssistantAuthSession,
  isHomeyAuthSession,
  toAuthCompatibleSessionMap,
} from '@navet/app/auth/types';
import { getRegisteredProviderContract } from '@navet/app/provider-contract-registry';
import type { NavetProviderSession } from '@navet/app/provider-models';
import type { IntegrationProviderId } from '@navet/app/types/provider';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { LoadingSpinner } from './components/primitives/loading-spinner';
import { ErrorDisplay } from './components/shared/error-display';
import { NetworkStatusBanner } from './components/shared/network-status-banner';
import { PwaUpdatePrompt } from './components/shared/pwa-update-prompt';
import { Toaster } from './components/ui/sonner';
import { HomeySelectionPage } from './features/auth/homey-selection-page';
import { LoginPage } from './features/auth/login-page';
import { DashboardPage } from './features/dashboard';
import { initializeHabitEngine, stopHabitEngine } from './features/habits';
import {
  useAccentColor,
  useCurrentIntegrationConnectionState,
  useCurrentIntegrationStore,
  useProviderHealth,
} from './hooks';
import { useKeepDeviceAwake } from './hooks/use-keep-device-awake';
import { useViewportResize } from './hooks/use-viewport-resize';
import { I18nProvider } from './i18n';
import { resolveParentHomeAssistantBridge } from './infrastructure/home-assistant/runtime/parent-hass-bridge';
import { INVALID_HOME_ASSISTANT_AUTH_MESSAGE } from './services/ha-connection.service';
import {
  attachIntegrationRuntimeBridge,
  bootstrapIntegrationSession,
  teardownIntegrationSession,
} from './services/integration-bootstrap.service';
import { useErrorStore, useSettingsStore } from './stores';
import { startNavigationStoreSync } from './stores/navigation-store';
import { initializeSearchStore } from './stores/search-store';
import { appErrorSelectors, integrationSelectors, settingsSelectors } from './stores/selectors';
import { resolveEffectsQuality } from './utils/effects-quality';
import { isProductionEnvironment } from './utils/environment';
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
  const { provider, runtime, session, sessions, ready, logout, replaceSession } = useAuthSession();
  const isAuthenticated = Boolean(session);
  const needsHomeySelection =
    session?.providerId === 'homey' && Boolean(session.needsHomeySelection);
  const canResetSessionFromError = runtime === 'standalone-oauth';
  const appError = useErrorStore(appErrorSelectors.error);
  const clearAppError = useErrorStore(appErrorSelectors.clearError);
  const { connected, connecting, reconnecting } = useCurrentIntegrationConnectionState();
  const providerHealth = useProviderHealth(provider.id);
  const setCurrentProviderId = useCurrentIntegrationStore(
    integrationSelectors.setCurrentProviderId
  );
  const selectedProviderIds = useCurrentIntegrationStore(integrationSelectors.selectedProviderIds);
  const setSelectedProviders = useCurrentIntegrationStore(
    integrationSelectors.setSelectedProviders
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

    void bootstrapIntegrationSession(recoverySession)
      .then(() => {
        clearAppError();
      })
      .catch(() => undefined)
      .finally(() => {
        ingressInvalidAuthRecoveryInFlight.current = false;
      });
  }, [runtime, isAuthenticated, session, replaceSession, clearAppError]);

  const retryConnect = useCallback(() => {
    if (runtime === 'ha-ingress') {
      recoverIngressSession();
      return;
    }

    if (!isAuthenticated || !session || session.providerId !== 'home_assistant') {
      return;
    }
    delete failedConnectionAttemptKeys.current.home_assistant;

    void bootstrapIntegrationSession(session).catch(() => {
      failedConnectionAttemptKeys.current.home_assistant = getConnectionAttemptKey(session);
    });
  }, [runtime, recoverIngressSession, isAuthenticated, session]);

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
      (Object.keys(sessions) as IntegrationProviderId[])
        .map((providerId) => [
          providerId,
          getRegisteredProviderContract(providerId).bootstrapSession?.(
            toAuthCompatibleSessionMap(sessions)
          ) ?? null,
        ])
        .filter((entry): entry is [IntegrationProviderId, NavetProviderSession] =>
          Boolean(entry[1])
        )
    ) as Record<IntegrationProviderId, NavetProviderSession>;

    setProviderSessions(nextSessions);
  }, [sessions, setProviderSessions]);

  useEffect(() => {
    const currentProviderIds = Object.keys(sessions) as IntegrationProviderId[];
    const removedProviderIds = previousSessionProviderIds.current.filter(
      (previousProviderId) => !currentProviderIds.includes(previousProviderId)
    );
    const nextSelectedProviderIds = [
      ...selectedProviderIds.filter((providerId) => currentProviderIds.includes(providerId)),
      ...currentProviderIds.filter(
        (providerId) =>
          !selectedProviderIds.includes(providerId) &&
          !previousSessionProviderIds.current.includes(providerId)
      ),
    ];

    if (
      nextSelectedProviderIds.length !== selectedProviderIds.length ||
      nextSelectedProviderIds.some((providerId, index) => providerId !== selectedProviderIds[index])
    ) {
      setSelectedProviders(nextSelectedProviderIds);
    }

    for (const removedProviderId of removedProviderIds) {
      delete failedConnectionAttemptKeys.current[removedProviderId];
      teardownIntegrationSession(removedProviderId);
    }

    previousSessionProviderIds.current = currentProviderIds;

    if (!currentProviderIds.length) {
      teardownIntegrationSession(session?.providerId ?? null);
    }
  }, [selectedProviderIds, session?.providerId, sessions, setSelectedProviders]);

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
        attachIntegrationRuntimeBridge('home_assistant', parentHass);
        clearAppError();
        delete failedConnectionAttemptKeys.current.home_assistant;
        return parentHass;
      }

      return null;
    };

    let pollIntervalId: number | null = null;
    let websocketUnsubscribe: (() => void) | null = null;
    let cancelled = false;

    const clearPolling = () => {
      if (pollIntervalId !== null) {
        window.clearInterval(pollIntervalId);
        pollIntervalId = null;
      }
    };

    const startPolling = () => {
      if (pollIntervalId !== null) {
        return;
      }

      pollIntervalId = window.setInterval(() => {
        syncParentHass();
      }, 1_000);
    };

    const subscribeToParentStateChanges = async () => {
      const parentHass = syncParentHass();
      const connection = parentHass?.connection as
        | {
            subscribeMessage?: (
              callback: () => void,
              subscribeMessage: { type: string; event_type?: string },
              options?: { resubscribe?: boolean; preCheck?: () => boolean | Promise<boolean> }
            ) => Promise<() => void>;
          }
        | undefined;

      if (!connection?.subscribeMessage) {
        startPolling();
        return;
      }

      try {
        websocketUnsubscribe = await connection.subscribeMessage(
          () => {
            syncParentHass();
          },
          {
            type: 'subscribe_events',
            event_type: 'state_changed',
          }
        );
        clearPolling();
      } catch {
        startPolling();
      }
    };

    void subscribeToParentStateChanges().then(() => {
      if (cancelled) {
        websocketUnsubscribe?.();
        websocketUnsubscribe = null;
      }
    });

    return () => {
      cancelled = true;
      clearPolling();
      websocketUnsubscribe?.();
    };
  }, [isAuthenticated, runtime, clearAppError]);

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
    const openhabSession = sessions.openhab;
    if (openhabSession?.providerId !== 'openhab') {
      return;
    }

    const attemptKey = getConnectionAttemptKey(openhabSession);
    if (failedConnectionAttemptKeys.current.openhab === attemptKey) {
      return;
    }

    void bootstrapIntegrationSession(openhabSession).catch(() => {
      failedConnectionAttemptKeys.current.openhab = attemptKey;
    });
  }, [sessions.openhab]);

  useEffect(() => {
    const homeAssistantSession = sessions.home_assistant;
    if (homeAssistantSession?.providerId !== 'home_assistant' || appError) {
      return;
    }

    if (runtime === 'ha-ingress') {
      const parentHass = resolveParentHomeAssistantBridge();
      if (parentHass) {
        attachIntegrationRuntimeBridge('home_assistant', parentHass);
      }

      // In ingress mode, Home Assistant owns the authenticated websocket session.
      // Wait for the parent runtime bridge instead of opening a second connection.
      return;
    }

    if (connected || connecting) {
      return;
    }

    const attemptKey = getConnectionAttemptKey(homeAssistantSession);
    if (failedConnectionAttemptKeys.current.home_assistant === attemptKey) {
      return;
    }

    void bootstrapIntegrationSession(homeAssistantSession).catch(() => {
      failedConnectionAttemptKeys.current.home_assistant = attemptKey;
    });
  }, [sessions.home_assistant, connected, connecting, appError, runtime]);

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
    if (!isProductionEnvironment()) {
      initializeHabitEngine();
    }
    const stopNavigationSync = startNavigationStoreSync();
    return () => {
      if (!isProductionEnvironment()) {
        stopHabitEngine();
      }
      stopNavigationSync();
    };
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
          providerLabel={provider.label}
          lastError={providerHealth.lastError}
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
