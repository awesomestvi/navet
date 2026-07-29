import {
  AUTH_SESSION_REFRESHED_EVENT,
  type AuthSessionRefreshedEventDetail,
} from '@navet/app/auth/session-events';
import { ALL_ROOMS_ID } from '@navet/app/constants/rooms';
import { STORAGE_KEYS } from '@navet/app/constants/storage-keys';
import {
  useCardZonesStore,
  useCustomCardsStore,
  useDashboardEntitiesStore,
  useHomeDashboardLayoutStore,
} from '@navet/app/features/dashboard';
import {
  DASHBOARD_CLIENT_IDENTITY_EVENT,
  type DashboardClientIdentity,
  getDashboardClientIdentity,
  rotateDashboardClientIdentity,
} from '@navet/app/features/dashboard/clients/dashboard-client-identity';
import {
  readDashboardProfileBase,
  writeDashboardProfileBase,
} from '@navet/app/features/dashboard/clients/dashboard-profile-base-cache';
import {
  getDashboardProfileChangedPaths,
  rebaseLocalDashboardProfile,
} from '@navet/app/features/dashboard/clients/dashboard-profile-diff';
import { reconcileDashboardProfiles } from '@navet/app/features/dashboard/clients/dashboard-profile-reconciliation';
import {
  type DashboardProfileActivity,
  useDashboardProfileRuntimeStore,
} from '@navet/app/features/dashboard/clients/dashboard-profile-runtime-store';
import { useDashboardPreferenceSync } from '@navet/app/features/dashboard/hooks/use-dashboard-preference-sync';
import { useLightPresetStore } from '@navet/app/features/lighting/stores/light-preset-store';
import { useI18n } from '@navet/app/hooks';
import { isHomeAssistantPanelMode } from '@navet/app/runtime/app-mode';
import {
  DASHBOARD_PROFILE_ERROR_CODES,
  DASHBOARD_PROFILE_ID,
  type DashboardProfileRevisionMetadata,
} from '@navet/app/services/dashboard-profile.contract';
import {
  type DashboardProfileLoadOptions,
  type DashboardProfileLoadResult,
  type DashboardProfileWriteResult,
  loadDashboardProfile,
  loadDashboardProfileClients,
  saveDashboardProfile,
  touchDashboardClientWithStatus,
} from '@navet/app/services/dashboard-profile.service';
import { useEntityRoomOverridesStore } from '@navet/app/stores/entity-room-overrides-store';
import { useSettingsStore } from '@navet/app/stores/settings-store';
import { useThemeStore } from '@navet/app/stores/theme-store';
import {
  type DashboardConfigPayload,
  exportDashboardConfig,
  importDashboardConfig,
} from '@navet/app/utils/dashboard-config';
import { PERSISTED_STATE_EVENT } from '@navet/app/utils/persisted-state-events';
import { createElement, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useShallow } from 'zustand/react/shallow';

const PROFILE_SAVE_DEBOUNCE_MS = 2_000;
const PROFILE_REMOTE_POLL_INTERVAL_MS = 60_000;
const PROFILE_REMOTE_POLL_BACKOFF_MS = [60_000, 120_000, 300_000] as const;

export const DASHBOARD_PROFILE_REFRESH_EVENT = 'navet:dashboard-profile-refresh';

const SYNC_RELEVANT_PERSISTED_KEYS = new Set<string>([
  STORAGE_KEYS.cardSizes,
  STORAGE_KEYS.roomOrder,
  STORAGE_KEYS.roomWorkspace,
]);

interface PendingConflict {
  base: DashboardConfigPayload | null;
  local: DashboardConfigPayload;
  remote: DashboardProfileLoadResult;
}

function getProfileForSync(): DashboardConfigPayload {
  const profile = exportDashboardConfig();
  const transportProfile = {
    ...profile,
    navigation: {
      currentRoom: ALL_ROOMS_ID,
      activeSection: 'home',
    },
  };
  return JSON.parse(JSON.stringify(transportProfile)) as DashboardConfigPayload;
}

function getDocumentVisibility() {
  return typeof document === 'undefined' ? 'visible' : document.visibilityState;
}

function getNextPollDelay(failureCount: number) {
  if (failureCount <= 1) {
    return PROFILE_REMOTE_POLL_BACKOFF_MS[0];
  }
  if (failureCount === 2) {
    return PROFILE_REMOTE_POLL_BACKOFF_MS[1];
  }
  return PROFILE_REMOTE_POLL_BACKOFF_MS[2];
}

function toActivity(
  metadata: DashboardProfileRevisionMetadata | null
): DashboardProfileActivity | null {
  if (!metadata) {
    return null;
  }

  return {
    id: `${metadata.workspaceId}:${metadata.revision}`,
    revision: metadata.revision,
    changedAt: metadata.updatedAt,
    changedPaths: metadata.changedPaths,
    actor: {
      clientId: metadata.author.id,
      clientName: metadata.author.name,
      clientKind: metadata.author.kind,
      ...(metadata.author.userId ? { userId: metadata.author.userId } : {}),
      ...(metadata.author.userName ? { userName: metadata.author.userName } : {}),
    },
  };
}

function remoteFromWrite(
  profile: DashboardConfigPayload,
  result: DashboardProfileWriteResult,
  previous: DashboardProfileLoadResult
): DashboardProfileLoadResult {
  return {
    available: true,
    unauthorized: false,
    failureCode: null,
    profile,
    notModified: false,
    etag: result.etag,
    lastModified: result.lastModified,
    generation: result.generation,
    revision: result.revision,
    workspace: result.workspace ?? previous.workspace,
    metadata: result.metadata,
    recovery: result.recovery,
  };
}

export function useDashboardProfileSync() {
  const { t } = useI18n();
  const { onboardingCompleted } = useDashboardEntitiesStore(
    useShallow((state) => ({
      onboardingCompleted: state.onboardingCompleted,
    }))
  );
  const [profileLoadCompleted, setProfileLoadCompleted] = useState(false);
  const tRef = useRef(t);
  const onboardingCompletedRef = useRef(onboardingCompleted);
  const syncCurrentLocalStateRef = useRef<() => void>(() => undefined);
  const panelMode = isHomeAssistantPanelMode();
  const preferenceClient = useDashboardProfileRuntimeStore((state) => state.client);

  tRef.current = t;
  onboardingCompletedRef.current = onboardingCompleted;

  useDashboardPreferenceSync({
    client: preferenceClient,
    enabled: !panelMode && profileLoadCompleted,
  });

  useEffect(() => {
    if (profileLoadCompleted && onboardingCompleted) {
      syncCurrentLocalStateRef.current();
    }
  }, [onboardingCompleted, profileLoadCompleted]);

  useEffect(() => {
    const runtime = useDashboardProfileRuntimeStore.getState();
    if (panelMode) {
      runtime.markDisabled();
      setProfileLoadCompleted(true);
      return;
    }

    let cancelled = false;
    let loaded = false;
    let applyingRemote = false;
    let saving = false;
    let loadingRemote = false;
    let pendingLocalChanges = false;
    let refreshAfterAuthentication = false;
    let clientRegistrationPending = false;
    let writesBlocked = false;
    let permanentAccessFailure = false;
    let isOnline = typeof navigator === 'undefined' ? true : navigator.onLine;
    let isVisible = getDocumentVisibility() === 'visible';
    let failureCount = 0;
    let remoteResult: DashboardProfileLoadResult | null = null;
    let saveTimeout: number | null = null;
    let pollTimeout: number | null = null;
    let conflictToastId: string | number | null = null;
    let pendingConflict: PendingConflict | null = null;
    let commonBase = readDashboardProfileBase();
    let client = getDashboardClientIdentity({
      profileMode: useSettingsStore.getState().dashboardProfileMode,
    });

    runtime.setClient(client);
    runtime.markLoading();

    function clearSaveTimeout() {
      if (saveTimeout !== null) {
        window.clearTimeout(saveTimeout);
        saveTimeout = null;
      }
    }

    function clearPollTimeout() {
      if (pollTimeout !== null) {
        window.clearTimeout(pollTimeout);
        pollTimeout = null;
      }
    }

    function clearConflict() {
      if (conflictToastId !== null) {
        toast.dismiss(conflictToastId);
        conflictToastId = null;
      }
      pendingConflict = null;
      runtime.clearConflict();
    }

    function readCompatibleBase(result = remoteResult) {
      const base = commonBase;
      if (
        !base ||
        !result?.workspace ||
        result.revision === null ||
        base.workspaceId !== result.workspace.workspaceId ||
        base.profileId !== DASHBOARD_PROFILE_ID ||
        base.revision > result.revision
      ) {
        return null;
      }
      return base;
    }

    function rememberCommonBase(
      profile: DashboardConfigPayload,
      result: DashboardProfileLoadResult
    ) {
      if (!result.workspace || result.revision === null) {
        return;
      }

      commonBase = {
        profile,
        profileId: DASHBOARD_PROFILE_ID,
        revision: result.revision,
        savedAt: new Date().toISOString(),
        workspaceId: result.workspace.workspaceId,
      };
      writeDashboardProfileBase(commonBase);
    }

    function markRemoteSynced(result: DashboardProfileLoadResult) {
      runtime.markSynced({
        activity: toActivity(result.metadata),
        profileId: DASHBOARD_PROFILE_ID,
        revision: result.revision,
        workspaceId: result.workspace?.workspaceId ?? null,
      });
    }

    function notifyRemoteUpdate(result: DashboardProfileLoadResult) {
      const author = result.metadata?.author;
      if (!author || author.id === client.id) {
        return;
      }

      toast(tRef.current('dashboard.profileSync.updatedTitle'), {
        description: tRef.current('dashboard.profileSync.updatedDescription', {
          client: author.name,
        }),
        duration: 6_000,
      });
    }

    function applyRemoteProfile(result: DashboardProfileLoadResult, notify: boolean) {
      if (!result.profile) {
        return;
      }

      applyingRemote = true;
      try {
        importDashboardConfig(result.profile, { applyNavigation: false });
      } finally {
        applyingRemote = false;
      }

      remoteResult = result;
      pendingLocalChanges = false;
      writesBlocked = false;
      clearSaveTimeout();
      clearConflict();
      rememberCommonBase(result.profile, result);
      markRemoteSynced(result);
      if (notify) {
        notifyRemoteUpdate(result);
      }
    }

    function setRegisteredClients(
      response: Awaited<ReturnType<typeof loadDashboardProfileClients>>
    ) {
      if (!response) {
        return;
      }

      runtime.setClients(
        response.clients.map((registeredClient) => ({
          id: registeredClient.id,
          name: registeredClient.name,
          kind: registeredClient.kind,
          firstSeenAt: registeredClient.firstSeenAt,
          lastSeenAt: registeredClient.lastSeenAt,
          lastRevision: registeredClient.lastRevision,
          ...(registeredClient.principal.userName
            ? { userName: registeredClient.principal.userName }
            : {}),
        }))
      );
    }

    async function touchCurrentClientWithRecovery() {
      const rejectedClient = client;
      let result = await touchDashboardClientWithStatus(rejectedClient);
      if (result.failureCode !== DASHBOARD_PROFILE_ERROR_CODES.clientBindingMismatch) {
        clientRegistrationPending = result.registry === null;
        return result;
      }

      client = rotateDashboardClientIdentity({
        dispatchEvent: false,
        expectedCurrentId: rejectedClient.id,
        profileMode: useSettingsStore.getState().dashboardProfileMode,
      });
      runtime.setClient(client);
      result = await touchDashboardClientWithStatus(client);
      clientRegistrationPending = result.registry === null;
      return result;
    }

    async function refreshRegisteredClients(touch = false) {
      const response = touch
        ? (await touchCurrentClientWithRecovery()).registry
        : await loadDashboardProfileClients(client);
      if (!cancelled) {
        setRegisteredClients(response);
      }
    }

    function refreshClientIdentity() {
      const nextClient = getDashboardClientIdentity({
        profileMode: useSettingsStore.getState().dashboardProfileMode,
      });
      if (
        nextClient.id === client.id &&
        nextClient.name === client.name &&
        nextClient.kind === client.kind
      ) {
        return;
      }

      client = nextClient;
      runtime.setClient(nextClient);
      void refreshRegisteredClients(true);
    }

    function showConflict(conflict: PendingConflict, overlappingPaths: string[]) {
      clearSaveTimeout();
      const existingRevision = pendingConflict?.remote.revision;
      if (existingRevision === conflict.remote.revision && conflictToastId !== null) {
        pendingConflict = conflict;
        return;
      }

      clearConflict();
      pendingConflict = conflict;
      runtime.setConflict({
        baseRevision: readCompatibleBase(conflict.remote)?.revision ?? null,
        remoteRevision: conflict.remote.revision ?? 0,
        overlappingPaths,
        remoteActivity: toActivity(conflict.remote.metadata),
      });

      conflictToastId = toast(tRef.current('dashboard.profileSync.conflictTitle'), {
        description: createElement(
          'div',
          { className: 'space-y-4' },
          createElement(
            'p',
            { className: 'max-w-none whitespace-normal text-sm leading-6 text-white/82' },
            tRef.current('dashboard.profileSync.conflictDescription')
          ),
          createElement(
            'div',
            { className: 'flex flex-wrap items-center gap-3' },
            createElement(
              'button',
              {
                type: 'button',
                className:
                  'inline-flex min-h-11 items-center justify-center rounded-[16px] border border-white/10 bg-white/16 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/22',
                onClick: () => {
                  const currentConflict = pendingConflict;
                  if (!currentConflict?.remote.profile) {
                    return;
                  }

                  const rebased = currentConflict.base
                    ? rebaseLocalDashboardProfile(
                        currentConflict.base,
                        currentConflict.local,
                        currentConflict.remote.profile
                      )
                    : currentConflict.local;
                  clearConflict();
                  remoteResult = currentConflict.remote;
                  rememberCommonBase(currentConflict.remote.profile, currentConflict.remote);
                  applyingRemote = true;
                  try {
                    importDashboardConfig(
                      { ...rebased, exportedAt: new Date().toISOString() },
                      { applyNavigation: false }
                    );
                  } finally {
                    applyingRemote = false;
                  }
                  pendingLocalChanges = true;
                  void saveProfile(getProfileForSync());
                },
              },
              tRef.current('dashboard.profileSync.keepMine')
            ),
            createElement(
              'button',
              {
                type: 'button',
                className:
                  'inline-flex min-h-11 items-center justify-center rounded-[16px] border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/[0.08]',
                onClick: () => {
                  const currentConflict = pendingConflict;
                  if (currentConflict) {
                    applyRemoteProfile(currentConflict.remote, false);
                  }
                },
              },
              tRef.current('dashboard.profileSync.loadRemote')
            )
          )
        ),
        duration: Infinity,
        classNames: {
          toast:
            'max-w-[min(34rem,calc(100vw-1rem))] sm:min-w-[29rem] rounded-[28px] border-white/10 bg-[linear-gradient(180deg,rgba(18,18,20,0.96)_0%,rgba(12,12,14,0.94)_100%)] shadow-2xl',
          content: 'min-w-0 basis-full pr-0',
          title: 'max-w-none whitespace-normal pr-0 text-[15px] font-semibold leading-5',
          description: 'max-w-none whitespace-normal text-sm leading-6',
        },
      });
    }

    function shouldPoll() {
      return loaded && isOnline && isVisible && !saving && !cancelled && !permanentAccessFailure;
    }

    function schedulePoll(delay = PROFILE_REMOTE_POLL_INTERVAL_MS) {
      clearPollTimeout();
      if (!shouldPoll()) {
        return;
      }

      pollTimeout = window.setTimeout(() => {
        pollTimeout = null;
        void refreshRemote();
      }, delay);
    }

    function drainRefreshAfterAuthentication() {
      if (!refreshAfterAuthentication || cancelled || !loaded || saving || loadingRemote) {
        return false;
      }

      refreshAfterAuthentication = false;
      clearPollTimeout();
      void refreshRemote({ forceFull: true, notify: true });
      return true;
    }

    async function saveProfile(
      profile: DashboardConfigPayload,
      options: { keepalive?: boolean } = {}
    ) {
      if (cancelled || writesBlocked || !remoteResult || pendingConflict) {
        return false;
      }
      if (saving) {
        pendingLocalChanges = true;
        return false;
      }

      const changedPaths = remoteResult.profile
        ? getDashboardProfileChangedPaths(remoteResult.profile, profile)
        : ['/'];
      if (changedPaths.length === 0) {
        pendingLocalChanges = false;
        clearSaveTimeout();
        markRemoteSynced(remoteResult);
        return false;
      }

      clearSaveTimeout();
      saving = true;
      runtime.markSaving();
      const saveOptions = {
        author: client,
        baseRevision: remoteResult.revision ?? 0,
        changedPaths,
        etag: remoteResult.etag ?? undefined,
        keepalive: options.keepalive,
        lastModified: remoteResult.etag ? undefined : (remoteResult.lastModified ?? undefined),
      };
      try {
        let result = await saveDashboardProfile(profile, saveOptions);
        if (result.failureCode === DASHBOARD_PROFILE_ERROR_CODES.clientBindingMismatch) {
          const recovery = await touchCurrentClientWithRecovery();
          if (!recovery.failureCode) {
            result = await saveDashboardProfile(profile, {
              ...saveOptions,
              author: client,
            });
          }
        }
        saving = false;
        if (cancelled) {
          return false;
        }

        if (result.saved) {
          const savedRemote = remoteFromWrite(profile, result, remoteResult);
          remoteResult = savedRemote;
          pendingLocalChanges = false;
          failureCount = 0;
          permanentAccessFailure = false;
          rememberCommonBase(profile, savedRemote);
          markRemoteSynced(savedRemote);
          void refreshRegisteredClients();
          syncCurrentLocalState();
          schedulePoll();
          return true;
        }

        pendingLocalChanges = true;
        if (result.failureCode === DASHBOARD_PROFILE_ERROR_CODES.workspaceTenantMismatch) {
          writesBlocked = true;
          permanentAccessFailure = true;
          runtime.markError(tRef.current('dashboard.profileSync.tenantMismatch'));
          clearPollTimeout();
          return false;
        }
        if (result.failureCode === DASHBOARD_PROFILE_ERROR_CODES.clientBindingMismatch) {
          writesBlocked = true;
          permanentAccessFailure = true;
          runtime.markError(tRef.current('dashboard.profileSync.unavailable'));
          clearPollTimeout();
          return false;
        }
        if (!options.keepalive && (result.preconditionFailed || result.preconditionRequired)) {
          await refreshRemote({ forceFull: true, notify: true });
          return false;
        }

        runtime.markError(
          tRef.current(
            result.unauthorized
              ? 'dashboard.profileSync.unauthorized'
              : 'dashboard.profileSync.saveFailed'
          )
        );
        schedulePoll(getNextPollDelay(++failureCount));
        return false;
      } finally {
        saving = false;
        drainRefreshAfterAuthentication();
      }
    }

    async function handleRemoteResult(
      result: DashboardProfileLoadResult,
      options: { initial?: boolean; notify?: boolean } = {}
    ) {
      const resultWorkspaceId = result.workspace?.workspaceId;
      const currentWorkspaceId = remoteResult?.workspace?.workspaceId;
      const isAuthoritativeUninitializedResult =
        result.profile === null && result.recovery.status === 'uninitialized';
      if (
        !isAuthoritativeUninitializedResult &&
        resultWorkspaceId &&
        resultWorkspaceId === currentWorkspaceId &&
        result.revision !== null &&
        remoteResult?.revision !== null &&
        remoteResult?.revision !== undefined &&
        result.revision < remoteResult.revision
      ) {
        return;
      }
      if (result.notModified) {
        failureCount = 0;
        return;
      }

      remoteResult = result;
      failureCount = 0;
      permanentAccessFailure = false;

      if (!result.profile) {
        clearConflict();
        if (result.recovery.status === 'uninitialized') {
          writesBlocked = false;
          pendingLocalChanges = onboardingCompletedRef.current;
          markRemoteSynced(result);
          return;
        }

        writesBlocked = true;
        runtime.markError(
          tRef.current(
            result.recovery.status === 'reset'
              ? 'dashboard.profileSync.resetPreserved'
              : 'dashboard.profileSync.missingPreserved'
          )
        );
        return;
      }

      writesBlocked = false;
      const base = readCompatibleBase(result);
      const local = getProfileForSync();
      const localDiffersFromRemote =
        getDashboardProfileChangedPaths(result.profile, local).length > 0;
      const shouldPreserveConfiguredLocalWithoutBase =
        !base && onboardingCompletedRef.current && localDiffersFromRemote;
      const hasPendingLocalChanges =
        pendingLocalChanges ||
        shouldPreserveConfiguredLocalWithoutBase ||
        Boolean(base && getDashboardProfileChangedPaths(base.profile, local).length > 0);
      const reconciliation = reconcileDashboardProfiles({
        base: base?.profile ?? null,
        hasPendingLocalChanges,
        local,
        remote: result.profile,
      });

      if (reconciliation.kind === 'already-current') {
        pendingLocalChanges = false;
        clearSaveTimeout();
        clearConflict();
        rememberCommonBase(result.profile, result);
        markRemoteSynced(result);
        if (options.notify) {
          notifyRemoteUpdate(result);
        }
        return;
      }

      if (reconciliation.kind === 'apply-remote') {
        applyRemoteProfile(result, options.notify === true);
        return;
      }

      if (reconciliation.kind === 'save-merged') {
        rememberCommonBase(result.profile, result);
        applyingRemote = true;
        try {
          importDashboardConfig(
            { ...reconciliation.profile, exportedAt: new Date().toISOString() },
            { applyNavigation: false }
          );
        } finally {
          applyingRemote = false;
        }
        pendingLocalChanges = true;
        markRemoteSynced(result);
        if (options.notify) {
          notifyRemoteUpdate(result);
        }
        await saveProfile(getProfileForSync());
        return;
      }

      showConflict(
        {
          base: base?.profile ?? null,
          local,
          remote: result,
        },
        reconciliation.overlappingPaths
      );
    }

    async function refreshRemote(options: { forceFull?: boolean; notify?: boolean } = {}) {
      if (cancelled || loadingRemote || (!options.forceFull && !shouldPoll())) {
        return;
      }
      if (saving) {
        schedulePoll();
        return;
      }

      loadingRemote = true;
      try {
        const requestOptions: DashboardProfileLoadOptions = options.forceFull
          ? {}
          : {
              etag: remoteResult?.etag ?? undefined,
              lastModified: remoteResult?.etag
                ? undefined
                : (remoteResult?.lastModified ?? undefined),
            };
        const result = await loadDashboardProfile(requestOptions);
        if (cancelled) {
          return;
        }

        if (!result.available) {
          if (result.failureCode === DASHBOARD_PROFILE_ERROR_CODES.workspaceTenantMismatch) {
            writesBlocked = true;
            permanentAccessFailure = true;
            clearPollTimeout();
            runtime.markError(tRef.current('dashboard.profileSync.tenantMismatch'));
            return;
          }
          runtime.markError(
            tRef.current(
              result.unauthorized
                ? 'dashboard.profileSync.unauthorized'
                : 'dashboard.profileSync.unavailable'
            )
          );
          schedulePoll(getNextPollDelay(++failureCount));
          return;
        }

        await handleRemoteResult(result, {
          notify: options.notify ?? true,
        });
        if (clientRegistrationPending) {
          await refreshRegisteredClients(true);
        }
      } catch (error) {
        console.warn('[DashboardProfile] Unable to reconcile the shared dashboard:', error);
        runtime.markError(tRef.current('dashboard.profileSync.unavailable'));
        schedulePoll(getNextPollDelay(++failureCount));
      } finally {
        loadingRemote = false;
        if (pendingLocalChanges && !pendingConflict) {
          syncCurrentLocalState();
        }
        if (!drainRefreshAfterAuthentication()) {
          // Preserve an error backoff already scheduled above. Replacing it with
          // the normal poll interval makes an unavailable profile service wake
          // every client aggressively during an outage.
          if (pollTimeout === null) {
            schedulePoll();
          }
        }
      }
    }

    function syncCurrentLocalState() {
      if (
        cancelled ||
        !loaded ||
        !onboardingCompletedRef.current ||
        applyingRemote ||
        writesBlocked ||
        !remoteResult ||
        pendingConflict
      ) {
        return;
      }
      if (saving) {
        pendingLocalChanges = true;
        return;
      }

      refreshClientIdentity();
      const profile = getProfileForSync();
      const changedPaths = remoteResult.profile
        ? getDashboardProfileChangedPaths(remoteResult.profile, profile)
        : ['/'];
      if (changedPaths.length === 0) {
        pendingLocalChanges = false;
        clearSaveTimeout();
        return;
      }

      pendingLocalChanges = true;
      clearSaveTimeout();
      saveTimeout = window.setTimeout(() => {
        saveTimeout = null;
        void saveProfile(getProfileForSync());
      }, PROFILE_SAVE_DEBOUNCE_MS);
    }
    syncCurrentLocalStateRef.current = syncCurrentLocalState;

    const subscriptions = [
      useThemeStore.subscribe(syncCurrentLocalState),
      useSettingsStore.subscribe(syncCurrentLocalState),
      useCustomCardsStore.subscribe(syncCurrentLocalState),
      useDashboardEntitiesStore.subscribe(syncCurrentLocalState),
      useEntityRoomOverridesStore.subscribe(syncCurrentLocalState),
      useCardZonesStore.subscribe(syncCurrentLocalState),
      useHomeDashboardLayoutStore.subscribe(syncCurrentLocalState),
      useLightPresetStore.subscribe(syncCurrentLocalState),
    ];

    const handlePersistedState = (event: Event) => {
      const customEvent = event as CustomEvent<{ key?: string }>;
      if (SYNC_RELEVANT_PERSISTED_KEYS.has(customEvent.detail?.key ?? '')) {
        syncCurrentLocalState();
      }
    };
    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEYS.dashboardClientIdentity) {
        // Identity rotation writes localStorage before the originating tab emits
        // DASHBOARD_CLIENT_IDENTITY_EVENT. Other tabs only receive the storage
        // event, so converge them on the same public ID before their next
        // registry touch can rekey the shared HttpOnly browser binding back.
        if (event.newValue !== null) {
          refreshClientIdentity();
        }
        return;
      }
      if (event.key && SYNC_RELEVANT_PERSISTED_KEYS.has(event.key)) {
        syncCurrentLocalState();
      }
    };
    const handleOnline = () => {
      isOnline = true;
      syncCurrentLocalState();
      void refreshRemote({ notify: true });
    };
    const handleOffline = () => {
      isOnline = false;
      clearPollTimeout();
      runtime.markOffline();
    };
    const handleVisibilityChange = () => {
      isVisible = getDocumentVisibility() === 'visible';
      if (!isVisible) {
        clearPollTimeout();
        if (pendingLocalChanges) {
          void saveProfile(getProfileForSync(), { keepalive: true });
        }
        return;
      }

      syncCurrentLocalState();
      void refreshRemote({ notify: true });
    };
    const handlePageHide = () => {
      if (pendingLocalChanges) {
        void saveProfile(getProfileForSync(), { keepalive: true });
      }
    };
    const handleIdentityChange = (event: Event) => {
      const nextClient = (event as CustomEvent<DashboardClientIdentity>).detail;
      if (!nextClient) {
        return;
      }
      client = nextClient;
      runtime.setClient(nextClient);
      void refreshRegisteredClients(true);
    };
    const handleRefreshRequest = () => {
      void refreshRemote({ forceFull: true, notify: true });
    };
    const handleAuthSessionRefreshed = (event: Event) => {
      const detail = (event as CustomEvent<AuthSessionRefreshedEventDetail>).detail;
      if (detail?.providerId !== 'home_assistant') {
        return;
      }
      clearPollTimeout();
      if (!loaded || loadingRemote || saving) {
        refreshAfterAuthentication = true;
        return;
      }
      void refreshRemote({ forceFull: true, notify: true });
    };

    window.addEventListener(PERSISTED_STATE_EVENT, handlePersistedState as EventListener);
    window.addEventListener('storage', handleStorage);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener(DASHBOARD_CLIENT_IDENTITY_EVENT, handleIdentityChange as EventListener);
    window.addEventListener(DASHBOARD_PROFILE_REFRESH_EVENT, handleRefreshRequest);
    window.addEventListener(
      AUTH_SESSION_REFRESHED_EVENT,
      handleAuthSessionRefreshed as EventListener
    );
    document.addEventListener('visibilitychange', handleVisibilityChange);

    async function initialize() {
      try {
        if (!isOnline) {
          runtime.markOffline();
          loaded = true;
          setProfileLoadCompleted(true);
          return;
        }

        const [result, clientTouch] = await Promise.all([
          loadDashboardProfile(),
          touchCurrentClientWithRecovery(),
        ]);
        if (cancelled) {
          return;
        }

        setRegisteredClients(clientTouch.registry);
        if (result.failureCode === DASHBOARD_PROFILE_ERROR_CODES.workspaceTenantMismatch) {
          writesBlocked = true;
          permanentAccessFailure = true;
          runtime.markError(tRef.current('dashboard.profileSync.tenantMismatch'));
        } else if (
          clientTouch.failureCode === DASHBOARD_PROFILE_ERROR_CODES.clientBindingMismatch
        ) {
          writesBlocked = true;
          permanentAccessFailure = true;
          runtime.markError(tRef.current('dashboard.profileSync.unavailable'));
        } else if (result.available) {
          await handleRemoteResult(result, { initial: true, notify: false });
        } else {
          runtime.markError(
            tRef.current(
              result.unauthorized
                ? 'dashboard.profileSync.unauthorized'
                : 'dashboard.profileSync.unavailable'
            )
          );
        }
      } catch (error) {
        console.warn('[DashboardProfile] Unable to initialize shared dashboard sync:', error);
        runtime.markError(tRef.current('dashboard.profileSync.unavailable'));
      } finally {
        if (!cancelled) {
          loaded = true;
          setProfileLoadCompleted(true);
          syncCurrentLocalState();
          if (!drainRefreshAfterAuthentication()) {
            schedulePoll();
          }
        }
      }
    }

    void initialize();

    return () => {
      cancelled = true;
      syncCurrentLocalStateRef.current = () => undefined;
      clearSaveTimeout();
      clearPollTimeout();
      clearConflict();
      subscriptions.forEach((unsubscribe) => {
        unsubscribe();
      });
      window.removeEventListener(PERSISTED_STATE_EVENT, handlePersistedState as EventListener);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener(
        DASHBOARD_CLIENT_IDENTITY_EVENT,
        handleIdentityChange as EventListener
      );
      window.removeEventListener(DASHBOARD_PROFILE_REFRESH_EVENT, handleRefreshRequest);
      window.removeEventListener(
        AUTH_SESSION_REFRESHED_EVENT,
        handleAuthSessionRefreshed as EventListener
      );
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [panelMode]);

  return {
    profileLoadCompleted: panelMode || profileLoadCompleted,
  };
}
