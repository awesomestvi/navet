import { useCallback, useEffect, useState } from 'react';
import { shallow } from 'zustand/shallow';
import { useHomeAssistant } from '@/app/hooks/use-home-assistant';
import type { HomeAssistantStore } from '@/app/stores/home-assistant-store';
import { storage } from '@/app/utils/storage';

const READ_NOTIFICATIONS_STORAGE_KEY = 'navet-read-notifications';
const HIDDEN_NOTIFICATIONS_STORAGE_KEY = 'navet-hidden-notifications';
const PENDING_UPDATE_INSTALLS_STORAGE_KEY = 'navet-pending-update-installs';
export const NOTIFICATION_STORAGE_SYNC_EVENT = 'navet-notification-storage-sync';

const loadNotificationIds = (storageKey: string): string[] => storage.get<string[]>(storageKey, []);

const areNotificationIdListsEqual = (left: string[], right: string[]) =>
  left.length === right.length && left.every((value, index) => value === right[index]);

export const persistNotificationIds = (storageKey: string, ids: string[]) => {
  storage.set(storageKey, ids);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(NOTIFICATION_STORAGE_SYNC_EVENT, { detail: { storageKey, ids } })
    );
  }
};

export const persistReadNotifications = (ids: string[]) =>
  persistNotificationIds(READ_NOTIFICATIONS_STORAGE_KEY, ids);
export const persistHiddenNotifications = (ids: string[]) =>
  persistNotificationIds(HIDDEN_NOTIFICATIONS_STORAGE_KEY, ids);
export const persistPendingUpdateInstalls = (ids: string[]) =>
  persistNotificationIds(PENDING_UPDATE_INSTALLS_STORAGE_KEY, ids);

export interface NotificationStorageState {
  readNotifications: string[];
  setReadNotifications: React.Dispatch<React.SetStateAction<string[]>>;
  hiddenNotifications: string[];
  setHiddenNotifications: React.Dispatch<React.SetStateAction<string[]>>;
  pendingUpdateInstalls: string[];
  setPendingUpdateInstalls: React.Dispatch<React.SetStateAction<string[]>>;
}

// Only update.* entities are needed to validate pending installs.
// Narrowing here means the effect only re-runs when update entities change
// (new firmware available, update installed), not on every HA entity update.
function selectUpdateEntities(state: HomeAssistantStore) {
  if (!state.entities) return null;
  return Object.fromEntries(
    Object.entries(state.entities).filter(([id]) => id.startsWith('update.'))
  );
}

export function useNotificationStorage(): NotificationStorageState {
  const updateEntities = useHomeAssistant(selectUpdateEntities, shallow);
  const [readNotifications, setReadNotificationsState] = useState<string[]>(() =>
    loadNotificationIds(READ_NOTIFICATIONS_STORAGE_KEY)
  );
  const [hiddenNotifications, setHiddenNotificationsState] = useState<string[]>(() =>
    loadNotificationIds(HIDDEN_NOTIFICATIONS_STORAGE_KEY)
  );
  const [pendingUpdateInstalls, setPendingUpdateInstallsState] = useState<string[]>(() =>
    loadNotificationIds(PENDING_UPDATE_INSTALLS_STORAGE_KEY)
  );

  const setReadNotifications = useCallback<React.Dispatch<React.SetStateAction<string[]>>>(
    (value) => {
      setReadNotificationsState((current) => {
        const next = typeof value === 'function' ? value(current) : value;
        if (areNotificationIdListsEqual(current, next)) return current;
        persistReadNotifications(next);
        return next;
      });
    },
    []
  );

  const setHiddenNotifications = useCallback<React.Dispatch<React.SetStateAction<string[]>>>(
    (value) => {
      setHiddenNotificationsState((current) => {
        const next = typeof value === 'function' ? value(current) : value;
        if (areNotificationIdListsEqual(current, next)) return current;
        persistHiddenNotifications(next);
        return next;
      });
    },
    []
  );

  const setPendingUpdateInstalls = useCallback<React.Dispatch<React.SetStateAction<string[]>>>(
    (value) => {
      setPendingUpdateInstallsState((current) => {
        const next = typeof value === 'function' ? value(current) : value;
        if (areNotificationIdListsEqual(current, next)) return current;
        persistPendingUpdateInstalls(next);
        return next;
      });
    },
    []
  );

  // Keep cross-tab state in sync via storage events
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncFromStorage = () => {
      const nextRead = loadNotificationIds(READ_NOTIFICATIONS_STORAGE_KEY);
      const nextHidden = loadNotificationIds(HIDDEN_NOTIFICATIONS_STORAGE_KEY);
      const nextPending = loadNotificationIds(PENDING_UPDATE_INSTALLS_STORAGE_KEY);

      // Use state setters directly — not the persist wrappers. Otherwise this
      // same-tab CustomEvent runs synchronously after persist, and setHiddenNotifications
      // would persist + dispatch again → unbounded recursion.
      setReadNotificationsState((c) => (areNotificationIdListsEqual(c, nextRead) ? c : nextRead));
      setHiddenNotificationsState((c) =>
        areNotificationIdListsEqual(c, nextHidden) ? c : nextHidden
      );
      setPendingUpdateInstallsState((c) =>
        areNotificationIdListsEqual(c, nextPending) ? c : nextPending
      );
    };

    window.addEventListener(NOTIFICATION_STORAGE_SYNC_EVENT, syncFromStorage);
    window.addEventListener('storage', syncFromStorage);
    return () => {
      window.removeEventListener(NOTIFICATION_STORAGE_SYNC_EVENT, syncFromStorage);
      window.removeEventListener('storage', syncFromStorage);
    };
  }, []);

  // Remove pending installs for entities that no longer exist in HA.
  // updateEntities only changes when update entities are added/removed/installed —
  // not on unrelated entity state updates.
  useEffect(() => {
    if (!updateEntities) {
      setPendingUpdateInstalls([]);
      return;
    }
    setPendingUpdateInstalls((current) =>
      current.filter((entityId) => Boolean(updateEntities[entityId]))
    );
  }, [updateEntities, setPendingUpdateInstalls]);

  return {
    readNotifications,
    setReadNotifications,
    hiddenNotifications,
    setHiddenNotifications,
    pendingUpdateInstalls,
    setPendingUpdateInstalls,
  };
}
