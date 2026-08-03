import {
  DEVICE_DISPLAY_PROFILE_SCHEMA_VERSION,
  DEVICE_DISPLAY_SETTING_KEYS,
  type DeviceDisplayProfilePolicy,
  emptyDeviceDisplayProfilePolicy,
  getLinkedDeviceDisplayProfile,
  mergeDeviceDisplayProfilePolicies,
  projectDeviceDisplaySettings,
  sanitizeDeviceDisplayProfilePolicy,
} from '@navet/app/features/dashboard/clients/device-display-profile';
import { useDeviceDisplayProfileRuntimeStore } from '@navet/app/features/dashboard/clients/device-display-profile-runtime-store';
import type { DashboardProfileClient } from '@navet/app/services/dashboard-profile.contract';
import {
  loadDashboardDisplayProfiles,
  saveDashboardDisplayProfiles,
} from '@navet/app/services/dashboard-profile.service';
import { useSettingsStore } from '@navet/app/stores/settings-store';
import { applySettingsPreferenceLayer } from '@navet/app/utils/settings-profile-scope';
import { useEffect, useRef } from 'react';

const DISPLAY_PROFILE_SAVE_DEBOUNCE_MS = 750;
const DISPLAY_PROFILE_POLL_INTERVAL_MS = 60_000;

function policySignature(policy: DeviceDisplayProfilePolicy): string {
  return JSON.stringify(policy);
}

export function useDeviceDisplayProfileSync({
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
    const runtime = useDeviceDisplayProfileRuntimeStore.getState();
    if (!enabled || !initialClient || initialClient.id !== clientId) {
      runtime.markDisabled();
      return;
    }

    let activeClient = initialClient;
    let applyingPolicy = false;
    let applyingSettings = false;
    let basePolicy = emptyDeviceDisplayProfilePolicy();
    let cancelled = false;
    let loaded = false;
    let pendingSave = false;
    let revision = 0;
    let saveTimer: number | null = null;
    let pollTimer: number | null = null;
    let saving = false;

    runtime.markLoading();

    function getClient() {
      const latest = clientRef.current;
      if (latest?.id === activeClient.id) {
        activeClient = latest;
      }
      return activeClient;
    }

    function clearSaveTimer() {
      if (saveTimer !== null) {
        window.clearTimeout(saveTimer);
        saveTimer = null;
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
      if (!cancelled && navigator.onLine && document.visibilityState === 'visible') {
        pollTimer = window.setTimeout(() => {
          pollTimer = null;
          void refreshRemote();
        }, DISPLAY_PROFILE_POLL_INTERVAL_MS);
      }
    }

    function applyLinkedProfile(policy: DeviceDisplayProfilePolicy) {
      const profile = getLinkedDeviceDisplayProfile(policy, getClient().id);
      if (!profile) {
        return;
      }
      const current = useSettingsStore.getState();
      const next = applySettingsPreferenceLayer(current, { settings: profile.settings }, 'device');
      const changed = Object.fromEntries(
        DEVICE_DISPLAY_SETTING_KEYS.flatMap((key) =>
          Object.is(current[key], next[key]) ? [] : [[key, next[key]]]
        )
      );
      if (Object.keys(changed).length === 0) {
        return;
      }
      applyingSettings = true;
      try {
        useSettingsStore.getState().updateSettings(changed);
      } finally {
        applyingSettings = false;
      }
    }

    function replaceRuntimePolicy(policy: DeviceDisplayProfilePolicy, nextRevision: number) {
      applyingPolicy = true;
      try {
        useDeviceDisplayProfileRuntimeStore.getState().replacePolicy(policy, nextRevision);
      } finally {
        applyingPolicy = false;
      }
      applyLinkedProfile(policy);
    }

    async function savePolicy(
      policy: DeviceDisplayProfilePolicy,
      allowStaleRetry = true
    ): Promise<void> {
      if (cancelled) {
        return;
      }
      if (saving) {
        pendingSave = true;
        return;
      }
      saving = true;
      pendingSave = false;
      useDeviceDisplayProfileRuntimeStore.getState().markSaving();
      try {
        const result = await saveDashboardDisplayProfiles(policy, {
          author: getClient(),
          baseRevision: revision,
          schemaVersion: DEVICE_DISPLAY_PROFILE_SCHEMA_VERSION,
        });
        if (cancelled) {
          return;
        }
        if (result.saved && result.document) {
          const savedPolicy = sanitizeDeviceDisplayProfilePolicy(result.document.values);
          basePolicy = savedPolicy;
          revision = result.document.revision;
          replaceRuntimePolicy(savedPolicy, revision);
          const latest = useDeviceDisplayProfileRuntimeStore.getState().policy;
          if (policySignature(latest) !== policySignature(policy)) {
            pendingSave = true;
          }
          return;
        }
        if (allowStaleRetry && (result.preconditionFailed || result.preconditionRequired)) {
          const refreshed = await loadDashboardDisplayProfiles<DeviceDisplayProfilePolicy>(
            getClient()
          );
          if (refreshed.available) {
            const remotePolicy = sanitizeDeviceDisplayProfilePolicy(refreshed.document?.values);
            const merged = mergeDeviceDisplayProfilePolicies(basePolicy, policy, remotePolicy);
            basePolicy = remotePolicy;
            revision = refreshed.document?.revision ?? 0;
            replaceRuntimePolicy(merged, revision);
            saving = false;
            await savePolicy(merged, false);
            return;
          }
        }
        useDeviceDisplayProfileRuntimeStore
          .getState()
          .markError('display-profile-sync-unavailable');
      } finally {
        saving = false;
        if (pendingSave && !cancelled) {
          pendingSave = false;
          scheduleSave();
        }
      }
    }

    function scheduleSave() {
      clearSaveTimer();
      saveTimer = window.setTimeout(() => {
        saveTimer = null;
        void savePolicy(useDeviceDisplayProfileRuntimeStore.getState().policy);
      }, DISPLAY_PROFILE_SAVE_DEBOUNCE_MS);
    }

    async function refreshRemote() {
      if (cancelled || saving) {
        schedulePoll();
        return;
      }
      try {
        const result = await loadDashboardDisplayProfiles<DeviceDisplayProfilePolicy>(getClient());
        if (cancelled) {
          return;
        }
        if (!result.available || result.unauthorized) {
          useDeviceDisplayProfileRuntimeStore
            .getState()
            .markError('display-profile-sync-unavailable');
          return;
        }
        const remotePolicy = sanitizeDeviceDisplayProfilePolicy(result.document?.values);
        const remoteRevision = result.document?.revision ?? 0;
        if (pendingSave || saveTimer !== null) {
          const localPolicy = useDeviceDisplayProfileRuntimeStore.getState().policy;
          const merged = mergeDeviceDisplayProfilePolicies(basePolicy, localPolicy, remotePolicy);
          basePolicy = remotePolicy;
          revision = remoteRevision;
          replaceRuntimePolicy(merged, revision);
          scheduleSave();
          return;
        }
        basePolicy = remotePolicy;
        revision = remoteRevision;
        replaceRuntimePolicy(remotePolicy, revision);
      } finally {
        loaded = true;
        schedulePoll();
      }
    }

    const unsubscribePolicy = useDeviceDisplayProfileRuntimeStore.subscribe((state, previous) => {
      if (
        !loaded ||
        applyingPolicy ||
        policySignature(state.policy) === policySignature(previous.policy)
      ) {
        return;
      }
      applyLinkedProfile(state.policy);
      scheduleSave();
    });

    const unsubscribeSettings = useSettingsStore.subscribe((state) => {
      if (!loaded || applyingSettings || applyingPolicy) {
        return;
      }
      const policy = useDeviceDisplayProfileRuntimeStore.getState().policy;
      const profile = getLinkedDeviceDisplayProfile(policy, getClient().id);
      if (!profile) {
        return;
      }
      const settings = projectDeviceDisplaySettings(state);
      if (JSON.stringify(settings) === JSON.stringify(profile.settings)) {
        return;
      }
      useDeviceDisplayProfileRuntimeStore.getState().updatePolicy((current) => ({
        ...current,
        profilesById: {
          ...current.profilesById,
          [profile.id]: {
            ...profile,
            settings,
            updatedAt: new Date().toISOString(),
          },
        },
      }));
    });

    const handleOnline = () => void refreshRemote();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void refreshRemote();
      } else {
        clearPollTimer();
      }
    };
    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibility);
    void refreshRemote();

    return () => {
      cancelled = true;
      clearSaveTimer();
      clearPollTimer();
      unsubscribePolicy();
      unsubscribeSettings();
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [clientId, enabled]);
}
