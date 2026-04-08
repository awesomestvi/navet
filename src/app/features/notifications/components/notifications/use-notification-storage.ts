import { useEffect, useState } from 'react';
import { useHomeAssistant } from '@/app/hooks/use-home-assistant';
import { homeAssistantSelectors } from '@/app/stores/selectors';
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

export function useNotificationStorage(): NotificationStorageState {
  const entities = useHomeAssistant(homeAssistantSelectors.entities);
  const [readNotifications, setReadNotifications] = useState<string[]>(() =>
    loadNotificationIds(READ_NOTIFICATIONS_STORAGE_KEY)
  );
  const [hiddenNotifications, setHiddenNotifications] = useState<string[]>(() =>
    loadNotificationIds(HIDDEN_NOTIFICATIONS_STORAGE_KEY)
  );
  const [pendingUpdateInstalls, setPendingUpdateInstalls] = useState<string[]>(() =>
    loadNotificationIds(PENDING_UPDATE_INSTALLS_STORAGE_KEY)
  );

  useEffect(() => {
    persistReadNotifications(readNotifications);
  }, [readNotifications]);

  useEffect(() => {
    persistHiddenNotifications(hiddenNotifications);
  }, [hiddenNotifications]);

  useEffect(() => {
    persistPendingUpdateInstalls(pendingUpdateInstalls);
  }, [pendingUpdateInstalls]);

  // Keep cross-tab state in sync via storage events
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncFromStorage = () => {
      const nextRead = loadNotificationIds(READ_NOTIFICATIONS_STORAGE_KEY);
      const nextHidden = loadNotificationIds(HIDDEN_NOTIFICATIONS_STORAGE_KEY);
      const nextPending = loadNotificationIds(PENDING_UPDATE_INSTALLS_STORAGE_KEY);

      setReadNotifications((c) => (areNotificationIdListsEqual(c, nextRead) ? c : nextRead));
      setHiddenNotifications((c) => (areNotificationIdListsEqual(c, nextHidden) ? c : nextHidden));
      setPendingUpdateInstalls((c) =>
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

  // Remove pending installs for entities that no longer exist
  useEffect(() => {
    if (!entities) {
      setPendingUpdateInstalls([]);
      return;
    }
    setPendingUpdateInstalls((current) =>
      current.filter((entityId) => Boolean(entities[entityId]) && entityId.startsWith('update.'))
    );
  }, [entities]);

  return {
    readNotifications,
    setReadNotifications,
    hiddenNotifications,
    setHiddenNotifications,
    pendingUpdateInstalls,
    setPendingUpdateInstalls,
  };
}
