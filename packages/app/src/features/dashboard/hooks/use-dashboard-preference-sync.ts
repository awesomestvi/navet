import {
  AUTH_SESSION_REFRESHED_EVENT,
  type AuthSessionRefreshedEventDetail,
} from '@navet/app/auth/session-events';
import {
  DASHBOARD_CLIENT_IDENTITY_EVENT,
  rotateDashboardClientIdentity,
} from '@navet/app/features/dashboard/clients/dashboard-client-identity';
import {
  createDashboardPreferenceContext,
  type DashboardPreferenceContext,
  dashboardPreferenceContextsEqual,
  getDashboardPreferenceFieldFingerprint,
  getDashboardPreferenceFieldFingerprints,
  readDashboardPreferenceReceiptState,
  writeDashboardPreferenceReceipt,
} from '@navet/app/features/dashboard/clients/dashboard-profile-base-cache';
import {
  DASHBOARD_PROFILE_ERROR_CODES,
  type DashboardPreferenceDocument,
  type DashboardPreferenceIdentity,
  type DashboardProfileClient,
  type DashboardProfileErrorCode,
  type DashboardWorkspaceIdentity,
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
import { useEffect, useRef, useState } from 'react';

const PREFERENCE_SAVE_DEBOUNCE_MS = 750;
const PREFERENCE_POLL_INTERVAL_MS = 60_000;

type PreferenceLayer = 'account' | 'device';
type PreferenceProjection = SettingsPreferenceProjection<PreferenceLayer>;

interface PreferenceLayerState {
  available: boolean;
  base: PreferenceProjection | null;
  context: ResolvedPreferenceContext | null;
  layer: PreferenceLayer;
  observedSignature: string;
  outageBase: PreferenceProjection | null;
  pendingSave: boolean;
  revision: number;
  saveTimer: number | null;
  saving: boolean;
}

interface ResolvedPreferenceContext {
  persisted: DashboardPreferenceContext;
  ownerKey: string;
}

function preferenceScope(layer: PreferenceLayer) {
  return layer === 'device' ? 'client' : 'account';
}

function projectLayer(layer: PreferenceLayer): PreferenceProjection {
  return projectSettingsPreferenceLayer(useSettingsStore.getState(), layer);
}

function projectDefaultLayer(layer: PreferenceLayer): PreferenceProjection {
  return projectSettingsPreferenceLayer(useSettingsStore.getInitialState(), layer);
}

function materializeRemoteProjection(
  layer: PreferenceLayer,
  remote: PreferenceProjection
): PreferenceProjection {
  const defaults = projectDefaultLayer(layer);
  return {
    schemaVersion: SETTINGS_PROFILE_SCHEMA_VERSION,
    settings: {
      ...defaults.settings,
      ...remote.settings,
    },
  } as PreferenceProjection;
}

function projectionSignature(projection: PreferenceProjection) {
  return JSON.stringify(projection);
}

function preferenceFingerprintSchemaMatches(
  fingerprints: Record<string, string>,
  projection: PreferenceProjection
) {
  const fingerprintKeys = Object.keys(fingerprints).sort();
  const projectionKeys = Object.keys(getDashboardPreferenceFieldFingerprints(projection)).sort();
  return (
    fingerprintKeys.length === projectionKeys.length &&
    fingerprintKeys.every((key, index) => key === projectionKeys[index])
  );
}

function mergePreferenceProjection(
  baseFingerprints: Record<string, string>,
  local: PreferenceProjection,
  remote: PreferenceProjection
): PreferenceProjection {
  const settings: Record<string, unknown> = { ...remote.settings };
  for (const [key, localValue] of Object.entries(local.settings)) {
    if (
      baseFingerprints[key] === undefined ||
      baseFingerprints[key] !== getDashboardPreferenceFieldFingerprint(localValue)
    ) {
      settings[key] = localValue;
    }
  }

  return {
    schemaVersion: SETTINGS_PROFILE_SCHEMA_VERSION,
    settings,
  } as PreferenceProjection;
}

export function useDashboardPreferenceSync({
  accountEnabled = true,
  client,
  enabled,
}: {
  accountEnabled?: boolean;
  client: DashboardProfileClient | null;
  enabled: boolean;
}) {
  const [preferencesLoadCompleted, setPreferencesLoadCompleted] = useState(false);
  const clientRef = useRef(client);
  clientRef.current = client;
  const clientId = client?.id;

  useEffect(() => {
    const initialClient = clientRef.current;
    if (!enabled || !initialClient || initialClient.id !== clientId) {
      setPreferencesLoadCompleted(true);
      return;
    }

    setPreferencesLoadCompleted(false);

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
        context: null,
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
        context: null,
        layer: 'device',
        observedSignature: '',
        outageBase: null,
        pendingSave: false,
        revision: 0,
        saveTimer: null,
        saving: false,
      },
    };
    const activeStates = accountEnabled ? [states.account, states.device] : [states.device];

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

    function resolvePreferenceContext(
      state: PreferenceLayerState,
      document: DashboardPreferenceDocument,
      workspace: DashboardWorkspaceIdentity | null
    ): ResolvedPreferenceContext | null {
      if (
        !workspace ||
        document.contractVersion !== 1 ||
        document.scope !== preferenceScope(state.layer) ||
        !Number.isSafeInteger(document.revision) ||
        document.revision < 0
      ) {
        return null;
      }

      let ownerKey: string;
      if (state.layer === 'device') {
        const activeClientId = getActiveClient().id;
        if (document.clientId !== activeClientId) {
          return null;
        }
        ownerKey = `client:${activeClientId}`;
      } else {
        if (
          !document.principal.providerId ||
          !document.principal.userId ||
          document.clientId !== null
        ) {
          return null;
        }
        ownerKey = `account:${document.principal.providerId}:${document.principal.userId}`;
      }

      const persisted = createDashboardPreferenceContext({
        installationId: workspace.installationId,
        layer: state.layer,
        ownerKey,
        workspaceId: workspace.workspaceId,
      });
      return persisted ? { ownerKey, persisted } : null;
    }

    function resolveEmptyPreferenceContext(
      state: PreferenceLayerState,
      workspace: DashboardWorkspaceIdentity | null,
      identity: DashboardPreferenceIdentity | null
    ): ResolvedPreferenceContext | null {
      if (!workspace || !identity) {
        return null;
      }
      let ownerKey: string;
      if (state.layer === 'device') {
        const activeClientId = getActiveClient().id;
        if (identity.clientId !== activeClientId) {
          return null;
        }
        ownerKey = `client:${activeClientId}`;
      } else {
        if (
          !identity.principal.providerId ||
          !identity.principal.userId ||
          identity.clientId !== null
        ) {
          return null;
        }
        ownerKey = `account:${identity.principal.providerId}:${identity.principal.userId}`;
      }
      const persisted = createDashboardPreferenceContext({
        installationId: workspace.installationId,
        layer: state.layer,
        ownerKey,
        workspaceId: workspace.workspaceId,
      });
      return persisted ? { ownerKey, persisted } : null;
    }

    function rememberCleanPreference(
      state: PreferenceLayerState,
      projection: PreferenceProjection,
      revision: number,
      context: ResolvedPreferenceContext
    ) {
      try {
        return Boolean(
          writeDashboardPreferenceReceipt({
            installationId: context.persisted.installationId,
            layer: state.layer,
            ownerKey: context.ownerKey,
            preference: projection,
            revision,
            workspaceId: context.persisted.workspaceId,
          })
        );
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn('[DashboardProfile] Unable to remember clean preference state:', error);
        }
        return false;
      }
    }

    function readPreferenceReceipt(context: ResolvedPreferenceContext) {
      return readDashboardPreferenceReceiptState({
        installationId: context.persisted.installationId,
        layer: context.persisted.layer,
        ownerKey: context.ownerKey,
        workspaceId: context.persisted.workspaceId,
      });
    }

    function disableLayer(state: PreferenceLayerState, clearContext = true) {
      state.available = false;
      clearLayerTimer(state);
      state.pendingSave = false;
      state.base = null;
      state.outageBase = null;
      state.revision = 0;
      if (clearContext) {
        state.context = null;
      }
      state.observedSignature = projectionSignature(projectLayer(state.layer));
    }

    function resetLayerForContext(state: PreferenceLayerState, context: ResolvedPreferenceContext) {
      clearLayerTimer(state);
      state.pendingSave = false;
      state.base = null;
      state.outageBase = null;
      state.revision = 0;
      state.context = context;
    }

    function pauseLayerForIdentityRefresh(state: PreferenceLayerState) {
      state.available = false;
      clearLayerTimer(state);
      state.pendingSave = false;
      state.observedSignature = projectionSignature(projectLayer(state.layer));
    }

    function contextMatches(
      left: ResolvedPreferenceContext | null,
      right: ResolvedPreferenceContext
    ) {
      return dashboardPreferenceContextsEqual(left?.persisted ?? null, right.persisted);
    }

    function projectionChangedFromFingerprints(
      projection: PreferenceProjection,
      fingerprints: Record<string, string>
    ) {
      return Object.entries(projection.settings).some(
        ([key, value]) =>
          fingerprints[key] === undefined ||
          fingerprints[key] !== getDashboardPreferenceFieldFingerprint(value)
      );
    }

    function ensureWritableReceipt(state: PreferenceLayerState) {
      const context = state.context;
      const base = state.base;
      if (!context || !base) {
        disableLayer(state);
        return false;
      }

      let stored = readPreferenceReceipt(context);
      if (
        stored.storageStatus === 'available' &&
        dashboardPreferenceContextsEqual(stored.activeContext, context.persisted) &&
        stored.receipt?.revision === state.revision &&
        JSON.stringify(stored.receipt.fieldFingerprints) ===
          JSON.stringify(getDashboardPreferenceFieldFingerprints(base))
      ) {
        return true;
      }
      if (
        stored.storageStatus === 'invalid' ||
        (stored.activeContext !== null &&
          !dashboardPreferenceContextsEqual(stored.activeContext, context.persisted))
      ) {
        disableLayer(state);
        refreshPending = true;
        return false;
      }

      if (!rememberCleanPreference(state, base, state.revision, context)) {
        disableLayer(state);
        return false;
      }
      stored = readPreferenceReceipt(context);
      if (
        stored.storageStatus !== 'available' ||
        !dashboardPreferenceContextsEqual(stored.activeContext, context.persisted) ||
        stored.receipt?.revision !== state.revision
      ) {
        disableLayer(state);
        return false;
      }
      return true;
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
      for (const state of activeStates) {
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
      return activeStates.some((state) => state.saving);
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
      if (!ensureWritableReceipt(state)) {
        drainPendingRefresh();
        return;
      }

      clearLayerTimer(state);
      state.saving = true;
      const writeContext = state.context;
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
          const resultContext = resolvePreferenceContext(state, result.document, result.workspace);
          if (!writeContext || !resultContext || !contextMatches(writeContext, resultContext)) {
            disableLayer(state);
            return;
          }
          state.revision = result.document.revision;
          state.base = projection;
          state.context = resultContext;
          state.outageBase = null;
          state.observedSignature = projectionSignature(projection);
          if (
            !rememberCleanPreference(state, projection, result.document.revision, resultContext)
          ) {
            disableLayer(state);
            return;
          }
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

    function applyRemoteBootstrap(
      state: PreferenceLayerState,
      remote: PreferenceProjection,
      document: DashboardPreferenceDocument,
      context: ResolvedPreferenceContext
    ) {
      resetLayerForContext(state, context);
      state.revision = document.revision;
      state.base = remote;
      applyProjection(state, remote);

      const stored = readPreferenceReceipt(context);
      if (
        stored.storageStatus === 'invalid' ||
        !rememberCleanPreference(state, remote, document.revision, context)
      ) {
        state.available = false;
        clearLayerTimer(state);
        return;
      }
      state.available = true;
    }

    async function reconcileRemoteDocument(
      state: PreferenceLayerState,
      document: DashboardPreferenceDocument,
      workspace: DashboardWorkspaceIdentity | null,
      retryLocal = false
    ) {
      const context = resolvePreferenceContext(state, document, workspace);
      if (!context) {
        disableLayer(state);
        return;
      }

      const remote = materializeRemoteProjection(
        state.layer,
        migrateSettingsPreferenceLayer(document.values, state.layer)
      );
      const contextChanged = state.context !== null && !contextMatches(state.context, context);
      const stored = readPreferenceReceipt(context);
      const exactReceipt =
        stored.storageStatus === 'available' &&
        dashboardPreferenceContextsEqual(stored.activeContext, context.persisted) &&
        stored.receipt &&
        stored.receipt.revision <= document.revision &&
        preferenceFingerprintSchemaMatches(stored.receipt.fieldFingerprints, remote)
          ? stored.receipt
          : null;

      if (contextChanged || !exactReceipt) {
        applyRemoteBootstrap(state, remote, document, context);
        return;
      }

      state.context = context;
      state.available = true;
      if (!retryLocal && document.revision === state.revision) {
        const local = projectLayer(state.layer);
        const baseFingerprints = state.base
          ? getDashboardPreferenceFieldFingerprints(state.base)
          : exactReceipt.fieldFingerprints;
        if (!state.saving && projectionChangedFromFingerprints(local, baseFingerprints)) {
          await saveLayer(state, local);
        }
        return;
      }

      const local = projectLayer(state.layer);
      const mergeBase = state.base ?? state.outageBase;
      const baseFingerprints = mergeBase
        ? getDashboardPreferenceFieldFingerprints(mergeBase)
        : exactReceipt.fieldFingerprints;
      const hasLocalChanges = projectionChangedFromFingerprints(local, baseFingerprints);
      state.revision = document.revision;

      if (!hasLocalChanges) {
        state.base = remote;
        state.outageBase = null;
        applyProjection(state, remote);
        if (!rememberCleanPreference(state, remote, document.revision, context)) {
          disableLayer(state);
        }
        return;
      }

      const merged = mergePreferenceProjection(baseFingerprints, local, remote);
      state.base = remote;
      state.outageBase = null;
      applyProjection(state, merged);
      if (projectionSignature(merged) === projectionSignature(remote)) {
        if (!rememberCleanPreference(state, remote, document.revision, context)) {
          disableLayer(state);
        }
        return;
      }
      await saveLayer(state, merged, false);
    }

    async function initializeEmptyPreference(
      state: PreferenceLayerState,
      workspace: DashboardWorkspaceIdentity | null,
      identity: DashboardPreferenceIdentity | null
    ) {
      const context = resolveEmptyPreferenceContext(state, workspace, identity);
      if (!context) {
        disableLayer(state);
        return;
      }
      const stored = readPreferenceReceipt(context);
      if (stored.storageStatus === 'invalid') {
        disableLayer(state);
        return;
      }

      const contextChanged =
        (state.context !== null && !contextMatches(state.context, context)) ||
        (stored.activeContext !== null &&
          !dashboardPreferenceContextsEqual(stored.activeContext, context.persisted));
      const projection =
        state.layer === 'account' || contextChanged
          ? projectDefaultLayer(state.layer)
          : projectLayer(state.layer);
      resetLayerForContext(state, context);
      state.available = true;
      state.base = projection;
      if (state.layer === 'account' || contextChanged) {
        applyProjection(state, projection);
      }
      if (!rememberCleanPreference(state, projection, 0, context)) {
        disableLayer(state);
        return;
      }
      await saveLayer(state, projection, false);
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

      if (!result.document) {
        if (!state.saving) {
          await initializeEmptyPreference(state, result.workspace, result.identity);
        }
        return;
      }
      await reconcileRemoteDocument(state, result.document, result.workspace, retryLocal);
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
        await Promise.all(activeStates.map((state) => refreshLayer(state)));
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
      for (const state of activeStates) {
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
      for (const state of activeStates) {
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
      if (accountEnabled) {
        pauseLayerForIdentityRefresh(states.account);
      }
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
        setPreferencesLoadCompleted(true);
        return;
      }

      try {
        for (const state of activeStates) {
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
            await initializeEmptyPreference(state, result.workspace, result.identity);
            continue;
          }

          await reconcileRemoteDocument(state, result.document, result.workspace);
        }
      } finally {
        initialized = true;
        if (!cancelled) {
          setPreferencesLoadCompleted(true);
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
  }, [accountEnabled, clientId, enabled]);

  return { preferencesLoadCompleted: !enabled || preferencesLoadCompleted };
}
