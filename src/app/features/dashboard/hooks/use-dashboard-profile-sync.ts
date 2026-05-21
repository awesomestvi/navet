import { useCallback, useEffect, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { ALL_ROOMS_ID } from '@/app/constants/rooms';
import { STORAGE_KEYS } from '@/app/constants/storage-keys';
import { isHomeAssistantPanelMode } from '@/app/runtime/app-mode';
import {
  loadDashboardProfile,
  saveDashboardProfile,
} from '@/app/services/dashboard-profile.service';
import {
  type DashboardConfigPayload,
  exportDashboardConfig,
  importDashboardConfig,
} from '@/app/utils/dashboard-config';
import { storage } from '@/app/utils/storage';
import { useDashboardEntitiesStore } from '../stores/dashboard-entities-store';

const PROFILE_SAVE_INTERVAL_MS = 5000;
const PROFILE_REMOTE_POLL_INTERVAL_MS = 30000;

interface DashboardProfileSyncMetadata {
  lastAppliedAt?: string;
  lastSavedSignature?: string;
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

export function useDashboardProfileSync() {
  const { onboardingCompleted } = useDashboardEntitiesStore(
    useShallow((state) => ({
      onboardingCompleted: state.onboardingCompleted,
    }))
  );
  const loadCompletedRef = useRef(false);
  const profileSyncAvailableRef = useRef(false);
  const savingRef = useRef(false);
  const [profileLoadCompleted, setProfileLoadCompleted] = useState(false);

  const panelMode = isHomeAssistantPanelMode();

  const applyRemoteProfile = useCallback(
    (profile: DashboardConfigPayload) => {
      const metadata = readSyncMetadata();
      const remoteTimestamp = getProfileTimestamp(profile);
      const localTimestamp = Date.parse(metadata.lastAppliedAt ?? '');
      const shouldApply =
        !onboardingCompleted ||
        !Number.isFinite(localTimestamp) ||
        remoteTimestamp > localTimestamp;

      if (!shouldApply) {
        return false;
      }

      importDashboardConfig(profile, { applyNavigation: false });
      writeSyncMetadata({
        lastAppliedAt: profile.exportedAt,
        lastSavedSignature: getProfileSignature(profile),
      });
      window.location.reload();
      return true;
    },
    [onboardingCompleted]
  );

  useEffect(() => {
    if (panelMode) {
      return;
    }

    if (loadCompletedRef.current) {
      return;
    }

    let cancelled = false;

    async function loadSharedProfile() {
      const { available, profile } = await loadDashboardProfile();
      if (cancelled) {
        return;
      }

      loadCompletedRef.current = true;
      setProfileLoadCompleted(true);
      profileSyncAvailableRef.current = available;

      if (!profile) {
        return;
      }

      applyRemoteProfile(profile);
    }

    void loadSharedProfile();

    return () => {
      cancelled = true;
    };
  }, [applyRemoteProfile, panelMode]);

  useEffect(() => {
    if (panelMode) {
      return;
    }

    if (!profileLoadCompleted || !onboardingCompleted) {
      return;
    }

    const interval = window.setInterval(() => {
      if (!profileSyncAvailableRef.current || savingRef.current) {
        return;
      }

      const profile = getProfileForSync();
      const signature = getProfileSignature(profile);
      const metadata = readSyncMetadata();

      if (metadata.lastSavedSignature === signature) {
        return;
      }

      savingRef.current = true;

      void saveDashboardProfile(profile)
        .then((saved) => {
          if (!saved) {
            return;
          }

          writeSyncMetadata({
            lastAppliedAt: profile.exportedAt,
            lastSavedSignature: signature,
          });
          profileSyncAvailableRef.current = true;
        })
        .finally(() => {
          savingRef.current = false;
        });
    }, PROFILE_SAVE_INTERVAL_MS);

    return () => {
      window.clearInterval(interval);
    };
  }, [onboardingCompleted, panelMode, profileLoadCompleted]);

  useEffect(() => {
    if (panelMode) {
      return;
    }

    if (!profileLoadCompleted || !onboardingCompleted) {
      return;
    }

    const interval = window.setInterval(() => {
      if (!profileSyncAvailableRef.current || savingRef.current) {
        return;
      }

      void loadDashboardProfile().then(({ profile }) => {
        if (!profile) {
          return;
        }

        applyRemoteProfile(profile);
      });
    }, PROFILE_REMOTE_POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(interval);
    };
  }, [applyRemoteProfile, onboardingCompleted, panelMode, profileLoadCompleted]);
}
