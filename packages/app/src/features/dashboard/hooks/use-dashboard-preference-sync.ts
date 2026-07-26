import type { DashboardProfileClient } from '@navet/app/services/dashboard-profile.contract';
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
import { useEffect } from 'react';

const PREFERENCE_SAVE_DEBOUNCE_MS = 750;
const PREFERENCE_POLL_INTERVAL_MS = 60_000;

type PreferenceLayer = 'account' | 'device';
type PreferenceProjection = SettingsPreferenceProjection<PreferenceLayer>;

interface PreferenceLayerState {
  available: boolean;
  base: PreferenceProjection | null;
  layer: PreferenceLayer;
  observedSignature: string;
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
  useEffect(() => {
    if (!enabled || !client) {
      return;
    }

    const activeClient = client;
    let cancelled = false;
    let applying = false;
    let initialized = false;
    let pollTimer: number | null = null;
    let online = typeof navigator === 'undefined' ? true : navigator.onLine;
    let visible = typeof document === 'undefined' || document.visibilityState === 'visible';
    const states: Record<PreferenceLayer, PreferenceLayerState> = {
      account: {
        available: false,
        base: null,
        layer: 'account',
        observedSignature: '',
        revision: 0,
        saveTimer: null,
        saving: false,
      },
      device: {
        available: false,
        base: null,
        layer: 'device',
        observedSignature: '',
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
      if (cancelled || state.saving || !state.available) {
        return;
      }

      clearLayerTimer(state);
      state.saving = true;
      const result = await saveDashboardPreferences(
        preferenceScope(state.layer),
        projection as unknown as Record<string, unknown>,
        state.revision,
        {
          author: activeClient,
          schemaVersion: SETTINGS_PROFILE_SCHEMA_VERSION,
        }
      );
      state.saving = false;
      if (cancelled) {
        return;
      }

      if (result.saved && result.document) {
        state.revision = result.document.revision;
        state.base = projection;
        state.observedSignature = projectionSignature(projection);
        return;
      }

      if (result.unauthorized) {
        state.available = false;
        return;
      }

      if (allowStaleRetry && (result.preconditionFailed || result.preconditionRequired)) {
        await refreshLayer(state, true);
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
        author: activeClient,
      });
      if (cancelled) {
        return;
      }
      if (!result.available || result.unauthorized) {
        state.available = false;
        return;
      }

      state.available = true;
      if (!result.document) {
        if (!state.base && !state.saving) {
          state.revision = 0;
          await saveLayer(state, projectLayer(state.layer), false);
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
      const hasLocalChanges =
        state.base !== null && projectionSignature(local) !== projectionSignature(state.base);
      state.revision = result.document.revision;

      if (!hasLocalChanges && !retryLocal) {
        state.base = remote;
        applyProjection(state, remote);
        return;
      }

      const merged = mergePreferenceProjection(state.base, local, remote);
      state.base = remote;
      applyProjection(state, merged);
      await saveLayer(state, merged, false);
    }

    async function refreshAllLayers() {
      if (cancelled || !online || !visible) {
        return;
      }
      await Promise.all([refreshLayer(states.account), refreshLayer(states.device)]);
      schedulePoll();
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
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
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
            author: activeClient,
          });
          if (cancelled) {
            return;
          }

          state.available = result.available && !result.unauthorized;
          if (!state.available) {
            state.observedSignature = projectionSignature(projectLayer(state.layer));
            continue;
          }
          if (!result.document) {
            state.revision = 0;
            state.observedSignature = projectionSignature(projectLayer(state.layer));
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
      schedulePoll();
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
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [client?.id, client?.kind, client?.name, enabled]);
}
