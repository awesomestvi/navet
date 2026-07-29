import {
  AUTH_SESSION_REFRESHED_EVENT,
  type AuthSessionRefreshedEventDetail,
} from '@navet/app/auth/session-events';
import {
  DASHBOARD_CLIENT_IDENTITY_EVENT,
  rotateDashboardClientIdentity,
} from '@navet/app/features/dashboard/clients/dashboard-client-identity';
import {
  DASHBOARD_PROFILE_ERROR_CODES,
  type DashboardProfileClient,
  type DashboardProfileErrorCode,
} from '@navet/app/services/dashboard-profile.contract';
import {
  loadDashboardPreferences,
  saveDashboardPreferences,
} from '@navet/app/services/dashboard-profile.service';
import { useSettingsStore } from '@navet/app/stores/settings-store';
import {
  applySettingsPreferenceLayerToStore,
  migrateSettingsPreferenceLayer,
  projectSettingsPreferenceLayer,
  SETTINGS_PROFILE_SCHEMA_VERSION,
  type SettingsPreferenceProjection,
} from '@navet/app/utils/settings-profile-scope';
import { useEffect, useRef } from 'react';

const PREFERENCE_SAVE_DEBOUNCE_MS = 750;
const PREFERENCE_POLL_INTERVAL_MS = 60_000;

type PreferenceLayer = 'account' | 'device';
type PreferenceProjection = SettingsPreferenceProjection<PreferenceLayer>;

interface PreferenceLayerState {
  available: boolean;
  base: PreferenceProjection | null;
  layer: PreferenceLayer;
  observedSignature: string;
  outageBase: PreferenceProjection | null;
  pendingSave: boolean;
  revision: number;
  saveTimer: number | null;
  saving: boolean;
}

function preferenceScope(layer: PreferenceLayer) {
  return layer === 'device' ? 'client' : 'account';
}

function projectLayer(layer: PreferenceLayer): PreferenceProjection {
  return projectSettingsPreferenceLayer(useSettingsStore.getState(), layer);
}

function projectionSignature(projection: PreferenceProjection) {
  return JSON.stringify(projection);
}

function valuesEqual(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function mergePreferenceProjection(
  base: PreferenceProjection | null,
  local: PreferenceProjection,
  remote: PreferenceProjection
): PreferenceProjection {
  const settings: Record<string, unknown> = { ...remote.settings };
  for (const [key, localValue] of Object.entries(local.settings)) {
    const baseHasKey = Boolean(base && Object.hasOwn(base.settings, key));
    const baseValue =
      base && baseHasKey ? (base.settings as Record<string, unknown>)[key] : undefined;
    if (!base || !baseHasKey || !valuesEqual(localValue, baseValue)) {
      settings[key] = localValue;
    }
  }

  return {
    schemaVersion: SETTINGS_PROFILE_SCHEMA_VERSION,
    settings,
  } as PreferenceProjection;
}

export function useDashboardPreferenceSync({
  client,
  enabled,
}: {
  client: DashboardProfileClient | null;
  enabled: boolean;
}) {
  const clientRef = useRef(client);
  clientRef.current = client;
  const clientId = client?.id;

  useEffect(() => {
    const initialClient = clientRef.current;
    if (!enabled || !initialClient || initialClient.id !== clientId) {
      return;
    }

    let activeClient = initialClient;
    let cancelled = false;
    let applying = false;
    let clientBindingRecoveryStarted = false;
    let initialized = false;
    let pollTimer: number | null = null;
    let refreshPending = false;
    let refreshInFlight = false;
    let online = typeof navigator === 'undefined' ? true : navigator.onLine;
    let visible = typeof document === 'undefined' || document.visibilityState === 'visible';
    const states: Record<PreferenceLayer, PreferenceLayerState> = {
      account: {
        available: false,
        base: null,
        layer: 'account',
        observedSignature: '',
        outageBase: null,
        pendingSave: false,
        revision: 0,
        saveTimer: null,
        saving: false,
      },
      device: {
        available: false,
        base: null,
        layer: 'device',
        observedSignature: '',
        outageBase: null,
        pendingSave: false,
        revision: 0,
        saveTimer: null,
        saving: false,
      },
    };

    function clearLayerTimer(state: PreferenceLayerState) {
      if (state.saveTimer !== null) {
        window.clearTimeout(state.saveTimer);
        state.saveTimer = null;
      }
    }

    function clearPollTimer() {
      if (pollTimer !== null) {
        window.clearTimeout(pollTimer);
        pollTimer = null;
      }
    }

    function getActiveClient() {
      const latestClient = clientRef.current;
      if (latestClient?.id === activeClient.id) {
        activeClient = latestClient;
      }
      return activeClient;
    }

    function recoverClientBinding(failureCode: DashboardProfileErrorCode | null) {
      if (
        failureCode !== DASHBOARD_PROFILE_ERROR_CODES.clientBindingMismatch ||
        clientBindingRecoveryStarted
      ) {
        return false;
      }

      clientBindingRecoveryStarted = true;
      clearPollTimer();
      for (const state of [states.account, states.device]) {
        state.available = false;
        clearLayerTimer(state);
      }
      activeClient = rotateDashboardClientIdentity({
        dispatchEvent: false,
        expectedCurrentId: activeClient.id,
      });
      refreshPending = true;
      window.dispatchEvent(
        new CustomEvent(DASHBOARD_CLIENT_IDENTITY_EVENT, {
          detail: activeClient,
        })
      );
      return true;
    }

    function rememberOutageBase(
      state: PreferenceLayerState,
      projection = projectLayer(state.layer)
    ) {
      if (state.base === null && state.outageBase === null) {
        state.outageBase = projection;
      }
    }

    function hasSaveInFlight() {
      return states.account.saving || states.device.saving;
    }

    function drainPendingRefresh() {
      if (!refreshPending || cancelled || !initialized || refreshInFlight || hasSaveInFlight()) {
        return false;
      }

      refreshPending = false;
      void refreshAllLayers();
      return true;
    }

    function schedulePoll() {
      clearPollTimer();
      if (!cancelled && initialized && online && visible) {
        pollTimer = window.setTimeout(() => {
          pollTimer = null;
          void refreshAllLayers();
        }, PREFERENCE_POLL_INTERVAL_MS);
      }
    }

    function applyProjection(state: PreferenceLayerState, projection: PreferenceProjection) {
      applying = true;
      try {
        applySettingsPreferenceLayerToStore(projection, state.layer);
      } finally {
        applying = false;
      }
      state.observedSignature = projectionSignature(projectLayer(state.layer));
    }

    async function saveLayer(
      state: PreferenceLayerState,
      projection = projectLayer(state.layer),
      allowStaleRetry = true
    ) {
      if (cancelled || !state.available) {
        return;
      }
      if (state.saving) {
        state.pendingSave = true;
        return;
      }

      clearLayerTimer(state);
      state.saving = true;
      try {
        const result = await saveDashboardPreferences(
          preferenceScope(state.layer),
          projection as unknown as Record<string, unknown>,
          state.revision,
          {
            author: getActiveClient(),
            keepalive: true,
            schemaVersion: SETTINGS_PROFILE_SCHEMA_VERSION,
          }
        );
        state.saving = false;
        const hadPendingSave = state.pendingSave;
        state.pendingSave = false;
        if (cancelled) {
          return;
        }

        if (result.saved && result.document) {
          state.revision = result.document.revision;
          state.base = projection;
          state.outageBase = null;
          state.observedSignature = projectionSignature(projection);
          if (hadPendingSave) {
            const latestProjection = projectLayer(state.layer);
            if (projectionSignature(latestProjection) !== projectionSignature(projection)) {
              await saveLayer(state, latestProjection);
            }
          }
          return;
        }

        if (recoverClientBinding(result.failureCode)) {
          return;
        }

        if (result.unauthorized) {
          rememberOutageBase(state, projection);
          state.available = false;
          return;
        }

        if (allowStaleRetry && (result.preconditionFailed || result.preconditionRequired)) {
          await refreshLayer(state, true);
          return;
        }

        if (hadPendingSave && !result.permanentFailure) {
          scheduleLayerSave(state);
        }
      } finally {
        state.saving = false;
        drainPendingRefresh();
      }
    }

    function scheduleLayerSave(state: PreferenceLayerState) {
      clearLayerTimer(state);
      state.saveTimer = window.setTimeout(() => {
        state.saveTimer = null;
        void saveLayer(state);
      }, PREFERENCE_SAVE_DEBOUNCE_MS);
    }

    async function refreshLayer(state: PreferenceLayerState, retryLocal = false) {
      const result = await loadDashboardPreferences(preferenceScope(state.layer), {
        author: getActiveClient(),
      });
      if (cancelled) {
        return;
      }
      if (recoverClientBinding(result.failureCode)) {
        return;
      }
      if (!result.available || result.unauthorized) {
        rememberOutageBase(state);
        state.available = false;
        return;
      }

      state.available = true;
      if (!result.document) {
        if (!state.saving) {
          const projection = projectLayer(state.layer);
          state.revision = 0;
          state.base = null;
          state.outageBase = projection;
          await saveLayer(state, projection, false);
        }
        return;
      }
      if (!retryLocal && result.document.revision === state.revision) {
        const local = projectLayer(state.layer);
        if (
          state.base &&
          !state.saving &&
          projectionSignature(local) !== projectionSignature(state.base)
        ) {
          await saveLayer(state, local);
        }
        return;
      }

      const remote = migrateSettingsPreferenceLayer(result.document.values, state.layer);
      const local = projectLayer(state.layer);
      const mergeBase = state.base ?? state.outageBase;
      const hasLocalChanges =
        mergeBase !== null && projectionSignature(local) !== projectionSignature(mergeBase);
      state.revision = result.document.revision;

      if (!hasLocalChanges) {
        state.base = remote;
        state.outageBase = null;
        applyProjection(state, remote);
        return;
      }

      const merged = mergePreferenceProjection(mergeBase, local, remote);
      state.base = remote;
      state.outageBase = null;
      applyProjection(state, merged);
      await saveLayer(state, merged, false);
    }

    async function refreshAllLayers() {
      if (cancelled || !online || !visible) {
        return;
      }
      if (refreshInFlight) {
        refreshPending = true;
        return;
      }

      refreshInFlight = true;
      try {
        await Promise.all([refreshLayer(states.account), refreshLayer(states.device)]);
      } finally {
        refreshInFlight = false;
        if (!drainPendingRefresh()) {
          schedulePoll();
        }
      }
    }

    function handleSettingsChange() {
      if (!initialized || applying || cancelled) {
        return;
      }
      for (const state of [states.account, states.device]) {
        if (!state.available) {
          continue;
        }
        const signature = projectionSignature(projectLayer(state.layer));
        if (signature === state.observedSignature) {
          continue;
        }
        state.observedSignature = signature;
        scheduleLayerSave(state);
      }
    }

    const unsubscribe = useSettingsStore.subscribe(handleSettingsChange);
    const handleOnline = () => {
      online = true;
      void refreshAllLayers();
    };
    const handleOffline = () => {
      online = false;
      clearPollTimer();
    };
    const handleVisibility = () => {
      visible = document.visibilityState === 'visible';
      if (visible) {
        void refreshAllLayers();
      } else {
        clearPollTimer();
      }
    };
    const handlePageHide = () => {
      for (const state of [states.account, states.device]) {
        if (!state.available) {
          continue;
        }
        const projection = projectLayer(state.layer);
        const hasUnsavedProjection =
          state.saveTimer !== null ||
          state.pendingSave ||
          state.base === null ||
          projectionSignature(projection) !== projectionSignature(state.base);
        if (hasUnsavedProjection) {
          void saveLayer(state, projection);
        }
      }
    };
    const handleAuthSessionRefreshed = (event: Event) => {
      const detail = (event as CustomEvent<AuthSessionRefreshedEventDetail>).detail;
      if (detail?.providerId !== 'home_assistant') {
        return;
      }
      clearPollTimer();
      if (!initialized || refreshInFlight || hasSaveInFlight()) {
        refreshPending = true;
        return;
      }
      void refreshAllLayers();
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener(
      AUTH_SESSION_REFRESHED_EVENT,
      handleAuthSessionRefreshed as EventListener
    );
    document.addEventListener('visibilitychange', handleVisibility);

    async function initialize() {
      if (!online) {
        initialized = true;
        return;
      }

      applying = true;
      try {
        for (const state of [states.account, states.device]) {
          const result = await loadDashboardPreferences(preferenceScope(state.layer), {
            author: getActiveClient(),
          });
          if (cancelled) {
            return;
          }

          if (recoverClientBinding(result.failureCode)) {
            state.observedSignature = projectionSignature(projectLayer(state.layer));
            continue;
          }

          state.available = result.available && !result.unauthorized;
          if (!state.available) {
            rememberOutageBase(state);
            state.observedSignature = projectionSignature(projectLayer(state.layer));
            continue;
          }
          if (!result.document) {
            const projection = projectLayer(state.layer);
            state.revision = 0;
            state.outageBase = projection;
            state.observedSignature = projectionSignature(projection);
            continue;
          }

          const projection = migrateSettingsPreferenceLayer(result.document.values, state.layer);
          state.revision = result.document.revision;
          state.base = projection;
          applySettingsPreferenceLayerToStore(projection, state.layer);
          state.observedSignature = projectionSignature(projectLayer(state.layer));
        }
      } finally {
        applying = false;
        initialized = true;
      }

      for (const state of [states.account, states.device]) {
        if (state.available && state.base === null) {
          void saveLayer(state);
        }
      }
      if (!drainPendingRefresh()) {
        schedulePoll();
      }
    }

    void initialize();

    return () => {
      cancelled = true;
      unsubscribe();
      clearPollTimer();
      clearLayerTimer(states.account);
      clearLayerTimer(states.device);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener(
        AUTH_SESSION_REFRESHED_EVENT,
        handleAuthSessionRefreshed as EventListener
      );
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [clientId, enabled]);
}
