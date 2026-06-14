import { ALL_ROOMS_ID } from '@navet/app/constants/rooms';
import { STORAGE_KEYS } from '@navet/app/constants/storage-keys';
import {
  useCardZonesStore,
  useCustomCardsStore,
  useDashboardEntitiesStore,
  useHomeDashboardLayoutStore,
} from '@navet/app/features/dashboard';
import { useLightPresetStore } from '@navet/app/features/lighting/stores/light-preset-store';
import { useI18n } from '@navet/app/hooks';
import { isHomeAssistantPanelMode } from '@navet/app/runtime/app-mode';
import {
  type DashboardProfileLoadOptions,
  loadDashboardProfile,
  saveDashboardProfile,
} from '@navet/app/services/dashboard-profile.service';
import { useSettingsStore } from '@navet/app/stores/settings-store';
import { useThemeStore } from '@navet/app/stores/theme-store';
import {
  type DashboardConfigPayload,
  exportDashboardConfig,
  importDashboardConfig,
} from '@navet/app/utils/dashboard-config';
import { PERSISTED_STATE_EVENT } from '@navet/app/utils/persisted-state-events';
import { storage } from '@navet/app/utils/storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useShallow } from 'zustand/react/shallow';

const PROFILE_SAVE_DEBOUNCE_MS = 2000;
const PROFILE_REMOTE_POLL_INTERVAL_MS = 60_000;
const PROFILE_REMOTE_POLL_BACKOFF_MS = [60_000, 120_000, 300_000] as const;
const PROFILE_REMOTE_RELOAD_GUARD_KEY = 'navet-dashboard-profile-reload-guard';

const SYNC_RELEVANT_PERSISTED_KEYS = new Set<string>([
  STORAGE_KEYS.cardSizes,
  STORAGE_KEYS.cardOrders,
  STORAGE_KEYS.roomOrder,
]);

interface DashboardProfileSyncMetadata {
  lastAppliedAt?: string;
  lastSavedSignature?: string;
  lastRemoteVersion?: string;
  lastRemoteEtag?: string;
  lastRemoteLastModified?: string;
}

interface RemoteProfileSnapshot {
  profile: DashboardConfigPayload;
  etag: string | null;
  lastModified: string | null;
  conflictKey: string;
}

function getProfileTimestamp(profile: DashboardConfigPayload) {
  const time = Date.parse(profile.exportedAt);
  return Number.isFinite(time) ? time : 0;
}

function getProfileSignature(profile: DashboardConfigPayload) {
  return JSON.stringify({
    ...profile,
    exportedAt: undefined,
    navigation: undefined,
  });
}

function isRemoteProfileAlreadyActive(
  profileSignature: string,
  currentSignature: string | null,
  metadata: DashboardProfileSyncMetadata
) {
  if (profileSignature !== currentSignature) {
    return false;
  }

  return profileSignature === metadata.lastSavedSignature || currentSignature !== null;
}

function getProfileForSync(): DashboardConfigPayload {
  const profile = exportDashboardConfig();
  return {
    ...profile,
    navigation: {
      currentRoom: ALL_ROOMS_ID,
      activeSection: 'home',
    },
  };
}

function readSyncMetadata(): DashboardProfileSyncMetadata {
  return storage.get<DashboardProfileSyncMetadata>(STORAGE_KEYS.dashboardProfileSync, {});
}

function writeSyncMetadata(metadata: DashboardProfileSyncMetadata) {
  storage.set(STORAGE_KEYS.dashboardProfileSync, metadata);
}

function getDocumentVisibility() {
  return typeof document === 'undefined' ? 'visible' : document.visibilityState;
}

function getConflictKey(
  profile: DashboardConfigPayload,
  etag: string | null,
  lastModified: string | null
) {
  return etag ?? profile.exportedAt ?? lastModified ?? getProfileSignature(profile);
}

function readReloadGuard() {
  if (typeof window === 'undefined') {
    return null;
  }

  return sessionStorage.getItem(PROFILE_REMOTE_RELOAD_GUARD_KEY);
}

function writeReloadGuard(conflictKey: string) {
  if (typeof window === 'undefined') {
    return;
  }

  sessionStorage.setItem(PROFILE_REMOTE_RELOAD_GUARD_KEY, conflictKey);
}

function clearReloadGuard() {
  if (typeof window === 'undefined') {
    return;
  }

  sessionStorage.removeItem(PROFILE_REMOTE_RELOAD_GUARD_KEY);
}

function getNextPollDelay(failureCount: number) {
  if (failureCount <= 1) {
    return PROFILE_REMOTE_POLL_INTERVAL_MS;
  }

  if (failureCount === 2) {
    return PROFILE_REMOTE_POLL_BACKOFF_MS[1];
  }

  return PROFILE_REMOTE_POLL_BACKOFF_MS[2];
}

export function useDashboardProfileSync() {
  const { t } = useI18n();
  const { onboardingCompleted } = useDashboardEntitiesStore(
    useShallow((state) => ({
      onboardingCompleted: state.onboardingCompleted,
    }))
  );
  const [profileLoadCompleted, setProfileLoadCompleted] = useState(false);
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine
  );
  const [isVisible, setIsVisible] = useState(() => getDocumentVisibility() === 'visible');
  const loadCompletedRef = useRef(false);
  const profileSyncAvailableRef = useRef(true);
  const savingRef = useRef(false);
  const applyingRemoteProfileRef = useRef(false);
  const hasPendingLocalChangesRef = useRef(false);
  const onboardingCompletedRef = useRef(onboardingCompleted);
  const isOnlineRef = useRef(isOnline);
  const isVisibleRef = useRef(isVisible);
  const previousOnlineRef = useRef(isOnline);
  const previousVisibleRef = useRef(isVisible);
  const currentSignatureRef = useRef<string | null>(null);
  const lastRemoteVersionRef = useRef<string | null>(null);
  const lastRemoteEtagRef = useRef<string | null>(null);
  const lastRemoteLastModifiedRef = useRef<string | null>(null);
  const failureCountRef = useRef(0);
  const saveTimeoutRef = useRef<number | null>(null);
  const pollTimeoutRef = useRef<number | null>(null);
  const conflictToastIdRef = useRef<string | number | null>(null);
  const activeConflictKeyRef = useRef<string | null>(null);
  const pendingConflictRef = useRef<RemoteProfileSnapshot | null>(null);

  const panelMode = isHomeAssistantPanelMode();

  const clearConflictToast = useCallback(() => {
    if (conflictToastIdRef.current !== null) {
      toast.dismiss(conflictToastIdRef.current);
      conflictToastIdRef.current = null;
    }

    activeConflictKeyRef.current = null;
    pendingConflictRef.current = null;
  }, []);

  const clearSaveTimeout = useCallback(() => {
    if (saveTimeoutRef.current !== null) {
      window.clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
  }, []);

  const clearPollTimeout = useCallback(() => {
    if (pollTimeoutRef.current !== null) {
      window.clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = null;
    }
  }, []);

  const updateRemoteMetadata = useCallback(
    ({
      etag,
      lastModified,
      profile,
      signature,
    }: {
      etag: string | null;
      lastModified: string | null;
      profile?: DashboardConfigPayload | null;
      signature?: string | null;
    }) => {
      if (etag !== null) {
        lastRemoteEtagRef.current = etag;
      }

      if (lastModified !== null) {
        lastRemoteLastModifiedRef.current = lastModified;
      }

      if (profile) {
        lastRemoteVersionRef.current = profile.exportedAt;
      }

      const metadata = readSyncMetadata();
      writeSyncMetadata({
        ...metadata,
        lastRemoteVersion: profile?.exportedAt ?? metadata.lastRemoteVersion,
        lastRemoteEtag: etag ?? metadata.lastRemoteEtag,
        lastRemoteLastModified: lastModified ?? metadata.lastRemoteLastModified,
        lastSavedSignature: signature ?? metadata.lastSavedSignature,
      });
    },
    []
  );

  const shouldRunRemoteChecks = useCallback(() => {
    return (
      !panelMode &&
      loadCompletedRef.current &&
      profileLoadCompleted &&
      onboardingCompletedRef.current &&
      profileSyncAvailableRef.current &&
      isOnlineRef.current &&
      isVisibleRef.current &&
      !savingRef.current
    );
  }, [panelMode, profileLoadCompleted]);

  const getCurrentProfileSnapshot = useCallback(() => {
    const profile = getProfileForSync();
    const signature = getProfileSignature(profile);
    currentSignatureRef.current = signature;
    return { profile, signature };
  }, []);

  const flushPendingSaveRef = useRef<
    (options?: { keepalive?: boolean; dismissConflict?: boolean }) => Promise<boolean>
  >(async () => false);
  const schedulePollRef = useRef<(delay?: number) => void>(() => undefined);
  const syncCurrentLocalStateRef = useRef<() => void>(() => undefined);

  const applyRemoteProfile = useCallback(
    (
      profile: DashboardConfigPayload,
      metadata: { etag: string | null; lastModified: string | null }
    ) => {
      const profileSignature = getProfileSignature(profile);
      const currentMetadata = readSyncMetadata();
      const currentSignature = currentSignatureRef.current ?? getCurrentProfileSnapshot().signature;
      const conflictKey = getConflictKey(profile, metadata.etag, metadata.lastModified);
      const remoteTimestamp = getProfileTimestamp(profile);
      const localTimestamp = Date.parse(currentMetadata.lastAppliedAt ?? '');

      if (isRemoteProfileAlreadyActive(profileSignature, currentSignature, currentMetadata)) {
        hasPendingLocalChangesRef.current = false;
        currentSignatureRef.current = profileSignature;
        clearConflictToast();
        clearReloadGuard();
        writeSyncMetadata({
          ...currentMetadata,
          lastAppliedAt: profile.exportedAt,
          lastSavedSignature: profileSignature,
          lastRemoteVersion: profile.exportedAt,
          lastRemoteEtag: metadata.etag ?? currentMetadata.lastRemoteEtag,
          lastRemoteLastModified: metadata.lastModified ?? currentMetadata.lastRemoteLastModified,
        });
        return false;
      }

      if (readReloadGuard() === conflictKey) {
        hasPendingLocalChangesRef.current = false;
        currentSignatureRef.current = profileSignature;
        clearConflictToast();
        writeSyncMetadata({
          ...currentMetadata,
          lastAppliedAt: profile.exportedAt,
          lastSavedSignature: profileSignature,
          lastRemoteVersion: profile.exportedAt,
          lastRemoteEtag: metadata.etag ?? currentMetadata.lastRemoteEtag,
          lastRemoteLastModified: metadata.lastModified ?? currentMetadata.lastRemoteLastModified,
        });
        return false;
      }

      const shouldApply =
        !onboardingCompletedRef.current ||
        !Number.isFinite(localTimestamp) ||
        remoteTimestamp > localTimestamp;

      updateRemoteMetadata({
        etag: metadata.etag,
        lastModified: metadata.lastModified,
        profile,
        signature: profileSignature,
      });

      if (!shouldApply) {
        hasPendingLocalChangesRef.current = false;
        currentSignatureRef.current = profileSignature;
        clearConflictToast();
        return false;
      }

      applyingRemoteProfileRef.current = true;
      hasPendingLocalChangesRef.current = false;
      currentSignatureRef.current = profileSignature;
      clearConflictToast();
      writeReloadGuard(conflictKey);
      writeSyncMetadata({
        ...currentMetadata,
        lastAppliedAt: profile.exportedAt,
        lastSavedSignature: profileSignature,
        lastRemoteVersion: profile.exportedAt,
        lastRemoteEtag: metadata.etag ?? currentMetadata.lastRemoteEtag,
        lastRemoteLastModified: metadata.lastModified ?? currentMetadata.lastRemoteLastModified,
      });
      importDashboardConfig(profile, { applyNavigation: false });
      applyingRemoteProfileRef.current = false;
      return true;
    },
    [clearConflictToast, getCurrentProfileSnapshot, updateRemoteMetadata]
  );

  const showConflictToast = useCallback(
    (remoteProfile: RemoteProfileSnapshot) => {
      if (activeConflictKeyRef.current === remoteProfile.conflictKey) {
        return;
      }

      clearConflictToast();
      pendingConflictRef.current = remoteProfile;
      activeConflictKeyRef.current = remoteProfile.conflictKey;
      conflictToastIdRef.current = toast(t('dashboard.profileSync.conflictTitle'), {
        description: t('dashboard.profileSync.conflictDescription'),
        duration: Infinity,
        classNames: {
          toast:
            'max-w-[min(34rem,calc(100vw-1rem))] sm:min-w-[29rem] rounded-[28px] border-white/10 bg-[linear-gradient(180deg,rgba(18,18,20,0.96)_0%,rgba(12,12,14,0.94)_100%)] shadow-2xl',
          content: 'min-w-0 basis-full pr-8',
          title: 'max-w-none whitespace-normal pr-0 text-[15px] font-semibold leading-5',
          description: 'max-w-none whitespace-normal text-sm leading-6',
          actionButton: 'order-3 self-start',
          cancelButton: 'order-4 self-start',
        },
        action: {
          label: t('dashboard.profileSync.keepMine'),
          onClick: () => {
            void flushPendingSaveRef.current({
              dismissConflict: true,
            });
          },
        },
        cancel: {
          label: t('dashboard.profileSync.loadRemote'),
          onClick: () => {
            const pendingConflict = pendingConflictRef.current;
            if (!pendingConflict) {
              return;
            }

            applyRemoteProfile(pendingConflict.profile, {
              etag: pendingConflict.etag,
              lastModified: pendingConflict.lastModified,
            });
          },
        },
      });
    },
    [applyRemoteProfile, clearConflictToast, t]
  );

  const pollRemoteProfile = useCallback(
    async (options: { immediate?: boolean } = {}) => {
      if (!options.immediate && !shouldRunRemoteChecks()) {
        return;
      }

      if (savingRef.current) {
        schedulePollRef.current(PROFILE_REMOTE_POLL_INTERVAL_MS);
        return;
      }

      const requestMetadata: DashboardProfileLoadOptions = {
        etag: lastRemoteEtagRef.current ?? undefined,
        lastModified: lastRemoteLastModifiedRef.current ?? undefined,
      };
      const result = await loadDashboardProfile(requestMetadata);

      if (!result.available) {
        failureCountRef.current += 1;
        schedulePollRef.current(getNextPollDelay(failureCountRef.current));
        return;
      }

      profileSyncAvailableRef.current = true;
      failureCountRef.current = 0;
      updateRemoteMetadata({
        etag: result.etag,
        lastModified: result.lastModified,
      });

      if (result.notModified || !result.profile) {
        clearReloadGuard();
        schedulePollRef.current(PROFILE_REMOTE_POLL_INTERVAL_MS);
        return;
      }

      const remoteProfile = {
        profile: result.profile,
        etag: result.etag,
        lastModified: result.lastModified,
        conflictKey: getConflictKey(result.profile, result.etag, result.lastModified),
      };
      const remoteSignature = getProfileSignature(result.profile);
      const currentSignature = currentSignatureRef.current ?? getCurrentProfileSnapshot().signature;
      const currentMetadata = readSyncMetadata();

      if (isRemoteProfileAlreadyActive(remoteSignature, currentSignature, currentMetadata)) {
        hasPendingLocalChangesRef.current = false;
        currentSignatureRef.current = remoteSignature;
        clearConflictToast();
        clearReloadGuard();
        writeSyncMetadata({
          ...currentMetadata,
          lastAppliedAt: result.profile.exportedAt,
          lastSavedSignature: remoteSignature,
          lastRemoteVersion: result.profile.exportedAt,
          lastRemoteEtag: result.etag ?? currentMetadata.lastRemoteEtag,
          lastRemoteLastModified: result.lastModified ?? currentMetadata.lastRemoteLastModified,
        });
        schedulePollRef.current(PROFILE_REMOTE_POLL_INTERVAL_MS);
        return;
      }

      if (hasPendingLocalChangesRef.current) {
        showConflictToast(remoteProfile);
        schedulePollRef.current(PROFILE_REMOTE_POLL_INTERVAL_MS);
        return;
      }

      applyRemoteProfile(result.profile, {
        etag: result.etag,
        lastModified: result.lastModified,
      });
    },
    [
      applyRemoteProfile,
      clearConflictToast,
      getCurrentProfileSnapshot,
      shouldRunRemoteChecks,
      showConflictToast,
      updateRemoteMetadata,
    ]
  );

  const schedulePoll = useCallback(
    (delay = PROFILE_REMOTE_POLL_INTERVAL_MS) => {
      clearPollTimeout();
      if (!shouldRunRemoteChecks()) {
        return;
      }

      pollTimeoutRef.current = window.setTimeout(() => {
        pollTimeoutRef.current = null;
        void pollRemoteProfile();
      }, delay);
    },
    [clearPollTimeout, pollRemoteProfile, shouldRunRemoteChecks]
  );
  schedulePollRef.current = schedulePoll;

  const flushPendingSave = useCallback(
    async (options: { keepalive?: boolean; dismissConflict?: boolean } = {}) => {
      if (panelMode || !onboardingCompletedRef.current || savingRef.current) {
        return false;
      }

      const { profile, signature } = getCurrentProfileSnapshot();
      const metadata = readSyncMetadata();

      if (metadata.lastSavedSignature === signature) {
        hasPendingLocalChangesRef.current = false;
        clearSaveTimeout();
        if (options.dismissConflict) {
          clearConflictToast();
        }
        return false;
      }

      clearSaveTimeout();
      savingRef.current = true;

      const result = await saveDashboardProfile(profile, {
        keepalive: options.keepalive,
      });

      savingRef.current = false;

      if (!result.saved) {
        if (result.permanentFailure) {
          profileSyncAvailableRef.current = false;
        }
        schedulePoll();
        return false;
      }

      hasPendingLocalChangesRef.current = false;
      profileSyncAvailableRef.current = true;
      clearReloadGuard();
      updateRemoteMetadata({
        etag: result.etag,
        lastModified: result.lastModified,
        profile,
        signature,
      });
      writeSyncMetadata({
        ...metadata,
        lastAppliedAt: profile.exportedAt,
        lastSavedSignature: signature,
        lastRemoteVersion: profile.exportedAt,
        lastRemoteEtag: result.etag ?? metadata.lastRemoteEtag,
        lastRemoteLastModified: result.lastModified ?? metadata.lastRemoteLastModified,
      });

      if (options.dismissConflict) {
        clearConflictToast();
      }

      schedulePoll();
      return true;
    },
    [
      clearConflictToast,
      clearSaveTimeout,
      getCurrentProfileSnapshot,
      panelMode,
      schedulePoll,
      updateRemoteMetadata,
    ]
  );
  flushPendingSaveRef.current = flushPendingSave;

  const syncCurrentLocalState = useCallback(() => {
    if (
      panelMode ||
      applyingRemoteProfileRef.current ||
      !loadCompletedRef.current ||
      !onboardingCompletedRef.current
    ) {
      return;
    }

    const { signature } = getCurrentProfileSnapshot();
    const metadata = readSyncMetadata();

    if (metadata.lastSavedSignature === signature) {
      hasPendingLocalChangesRef.current = false;
      clearSaveTimeout();
      return;
    }

    hasPendingLocalChangesRef.current = true;
    clearSaveTimeout();
    saveTimeoutRef.current = window.setTimeout(() => {
      saveTimeoutRef.current = null;
      void flushPendingSaveRef.current();
    }, PROFILE_SAVE_DEBOUNCE_MS);
  }, [clearSaveTimeout, getCurrentProfileSnapshot, panelMode]);
  syncCurrentLocalStateRef.current = syncCurrentLocalState;

  useEffect(() => {
    onboardingCompletedRef.current = onboardingCompleted;
    if (profileLoadCompleted && onboardingCompleted) {
      syncCurrentLocalStateRef.current();
      schedulePollRef.current();
    }
  }, [onboardingCompleted, profileLoadCompleted]);

  useEffect(() => {
    isOnlineRef.current = isOnline;
    const wasOnline = previousOnlineRef.current;
    previousOnlineRef.current = isOnline;
    if (!isOnline) {
      clearPollTimeout();
      return;
    }

    if (profileLoadCompleted && !wasOnline) {
      syncCurrentLocalStateRef.current();
      void pollRemoteProfile({ immediate: true });
    }
  }, [clearPollTimeout, isOnline, pollRemoteProfile, profileLoadCompleted]);

  useEffect(() => {
    isVisibleRef.current = isVisible;
    const wasVisible = previousVisibleRef.current;
    previousVisibleRef.current = isVisible;
    if (!isVisible) {
      clearPollTimeout();
      if (hasPendingLocalChangesRef.current) {
        void flushPendingSaveRef.current({ keepalive: true });
      }
      return;
    }

    if (profileLoadCompleted && !wasVisible) {
      syncCurrentLocalStateRef.current();
      void pollRemoteProfile({ immediate: true });
    }
  }, [clearPollTimeout, isVisible, pollRemoteProfile, profileLoadCompleted]);

  useEffect(() => {
    if (panelMode || loadCompletedRef.current) {
      return;
    }

    let cancelled = false;

    async function loadSharedProfile() {
      if (!isOnlineRef.current) {
        loadCompletedRef.current = true;
        profileSyncAvailableRef.current = true;
        setProfileLoadCompleted(true);
        return;
      }

      const metadata = readSyncMetadata();
      lastRemoteVersionRef.current = metadata.lastRemoteVersion ?? null;
      lastRemoteEtagRef.current = metadata.lastRemoteEtag ?? null;
      lastRemoteLastModifiedRef.current = metadata.lastRemoteLastModified ?? null;

      const result = await loadDashboardProfile({
        etag: metadata.lastRemoteEtag,
        lastModified: metadata.lastRemoteLastModified,
      });
      if (cancelled) {
        return;
      }

      loadCompletedRef.current = true;
      setProfileLoadCompleted(true);
      profileSyncAvailableRef.current = result.available || profileSyncAvailableRef.current;
      updateRemoteMetadata({
        etag: result.etag,
        lastModified: result.lastModified,
        profile: result.profile,
      });

      if (!result.profile || result.notModified) {
        syncCurrentLocalStateRef.current();
        schedulePollRef.current();
        return;
      }

      applyRemoteProfile(result.profile, {
        etag: result.etag,
        lastModified: result.lastModified,
      });
    }

    void loadSharedProfile();

    return () => {
      cancelled = true;
    };
  }, [applyRemoteProfile, panelMode, updateRemoteMetadata]);

  useEffect(() => {
    if (panelMode) {
      return;
    }

    const subscriptions = [
      useThemeStore.subscribe(() => syncCurrentLocalStateRef.current()),
      useSettingsStore.subscribe(() => syncCurrentLocalStateRef.current()),
      useCustomCardsStore.subscribe(() => syncCurrentLocalStateRef.current()),
      useDashboardEntitiesStore.subscribe(() => syncCurrentLocalStateRef.current()),
      useCardZonesStore.subscribe(() => syncCurrentLocalStateRef.current()),
      useHomeDashboardLayoutStore.subscribe(() => syncCurrentLocalStateRef.current()),
      useLightPresetStore.subscribe(() => syncCurrentLocalStateRef.current()),
    ];

    const handlePersistedState = (event: Event) => {
      const customEvent = event as CustomEvent<{ key?: string; value?: unknown }>;
      if (!SYNC_RELEVANT_PERSISTED_KEYS.has(customEvent.detail?.key ?? '')) {
        return;
      }

      syncCurrentLocalStateRef.current();
    };

    const handleStorage = (event: StorageEvent) => {
      if (!event.key || !SYNC_RELEVANT_PERSISTED_KEYS.has(event.key)) {
        return;
      }

      syncCurrentLocalStateRef.current();
    };

    window.addEventListener(PERSISTED_STATE_EVENT, handlePersistedState as EventListener);
    window.addEventListener('storage', handleStorage);

    return () => {
      subscriptions.forEach((unsubscribe) => {
        unsubscribe();
      });
      window.removeEventListener(PERSISTED_STATE_EVENT, handlePersistedState as EventListener);
      window.removeEventListener('storage', handleStorage);
    };
  }, [panelMode]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleVisibilityChange = () => setIsVisible(getDocumentVisibility() === 'visible');
    const handlePageHide = () => {
      if (hasPendingLocalChangesRef.current) {
        void flushPendingSaveRef.current({ keepalive: true });
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, []);

  useEffect(() => {
    return () => {
      clearSaveTimeout();
      clearPollTimeout();
      clearConflictToast();
    };
  }, [clearConflictToast, clearPollTimeout, clearSaveTimeout]);
}
