import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useHomeAssistant } from '@/app/hooks/use-home-assistant';
import { homeAssistantService } from '@/app/services/home-assistant.service';
import { homeAssistantSelectors } from '@/app/stores/selectors';
import { storage } from '@/app/utils/storage';

const READ_NOTIFICATIONS_STORAGE_KEY = 'navet-read-notifications';
const HIDDEN_NOTIFICATIONS_STORAGE_KEY = 'navet-hidden-notifications';
const PENDING_UPDATE_INSTALLS_STORAGE_KEY = 'navet-pending-update-installs';
const NOTIFICATION_STORAGE_SYNC_EVENT = 'navet-notification-storage-sync';

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  notificationId: string;
  source: 'persistent_notification' | 'update' | 'repair';
  isBusy?: boolean;
  progress?: number | null;
  statusLabel?: string;
  requiresRestart?: boolean;
}

interface HomeAssistantPersistentNotification {
  notification_id?: string;
  title?: string;
  message?: string;
  created_at?: string;
  status?: string;
}

interface HomeAssistantPersistentNotificationEvent {
  update_type?: 'added' | 'removed' | 'updated' | 'current';
  notifications?: HomeAssistantPersistentNotification[];
}

interface HomeAssistantRepairIssue {
  issue_id?: string;
  domain?: string;
  issue_domain?: string;
  translation_key?: string;
  severity?: string;
  breaks_in_ha_version?: string;
  learn_more_url?: string;
  title?: string;
  description?: string;
}

interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  runPrimaryAction: (id: string) => Promise<void>;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
}

const loadReadNotifications = (): string[] => {
  return loadNotificationIds(READ_NOTIFICATIONS_STORAGE_KEY);
};

const loadHiddenNotifications = (): string[] => {
  return loadNotificationIds(HIDDEN_NOTIFICATIONS_STORAGE_KEY);
};

const loadPendingUpdateInstalls = (): string[] => {
  return loadNotificationIds(PENDING_UPDATE_INSTALLS_STORAGE_KEY);
};

const loadNotificationIds = (storageKey: string): string[] => {
  return storage.get<string[]>(storageKey, []);
};

const persistReadNotifications = (ids: string[]) => {
  persistNotificationIds(READ_NOTIFICATIONS_STORAGE_KEY, ids);
};

const persistHiddenNotifications = (ids: string[]) => {
  persistNotificationIds(HIDDEN_NOTIFICATIONS_STORAGE_KEY, ids);
};

const persistPendingUpdateInstalls = (ids: string[]) => {
  persistNotificationIds(PENDING_UPDATE_INSTALLS_STORAGE_KEY, ids);
};

const persistNotificationIds = (storageKey: string, ids: string[]) => {
  storage.set(storageKey, ids);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(NOTIFICATION_STORAGE_SYNC_EVENT, {
        detail: { storageKey, ids },
      })
    );
  }
};

const inferNotificationType = (
  entityId: string,
  attributes: Record<string, unknown>
): Notification['type'] => {
  const severity =
    typeof attributes.severity === 'string'
      ? attributes.severity.toLowerCase()
      : typeof attributes.level === 'string'
        ? attributes.level.toLowerCase()
        : '';

  if (severity.includes('error') || severity.includes('critical')) {
    return 'error';
  }

  if (severity.includes('warn')) {
    return 'warning';
  }

  if (severity.includes('success')) {
    return 'success';
  }

  const searchText =
    `${entityId} ${attributes.title ?? ''} ${attributes.message ?? ''}`.toLowerCase();
  if (
    searchText.includes('error') ||
    searchText.includes('failed') ||
    searchText.includes('offline')
  ) {
    return 'error';
  }
  if (
    searchText.includes('warning') ||
    searchText.includes('battery') ||
    searchText.includes('open')
  ) {
    return 'warning';
  }
  if (searchText.includes('success') || searchText.includes('completed')) {
    return 'success';
  }

  return 'info';
};

export function useNotifications(): UseNotificationsReturn {
  const connection = useHomeAssistant(homeAssistantSelectors.connection);
  const entities = useDeferredValue(useHomeAssistant(homeAssistantSelectors.entities));
  const [readNotifications, setReadNotifications] = useState<string[]>(loadReadNotifications);
  const [hiddenNotifications, setHiddenNotifications] = useState<string[]>(loadHiddenNotifications);
  const [pendingUpdateInstalls, setPendingUpdateInstalls] =
    useState<string[]>(loadPendingUpdateInstalls);
  const [persistentNotifications, setPersistentNotifications] = useState<
    HomeAssistantPersistentNotification[]
  >([]);
  const [repairIssues, setRepairIssues] = useState<HomeAssistantRepairIssue[]>([]);

  useEffect(() => {
    persistReadNotifications(readNotifications);
  }, [readNotifications]);

  useEffect(() => {
    persistHiddenNotifications(hiddenNotifications);
  }, [hiddenNotifications]);

  useEffect(() => {
    persistPendingUpdateInstalls(pendingUpdateInstalls);
  }, [pendingUpdateInstalls]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const syncFromStorage = () => {
      setReadNotifications(loadReadNotifications());
      setHiddenNotifications(loadHiddenNotifications());
      setPendingUpdateInstalls(loadPendingUpdateInstalls());
    };

    const handleStorageSync = () => {
      syncFromStorage();
    };

    window.addEventListener(NOTIFICATION_STORAGE_SYNC_EVENT, handleStorageSync);
    window.addEventListener('storage', handleStorageSync);

    return () => {
      window.removeEventListener(NOTIFICATION_STORAGE_SYNC_EVENT, handleStorageSync);
      window.removeEventListener('storage', handleStorageSync);
    };
  }, []);

  useEffect(() => {
    if (!entities) {
      setPendingUpdateInstalls([]);
      return;
    }

    setPendingUpdateInstalls((current) =>
      current.filter((entityId) => Boolean(entities[entityId]) && entityId.startsWith('update.'))
    );
  }, [entities]);

  useEffect(() => {
    if (!connection) {
      setPersistentNotifications([]);
      setRepairIssues([]);
      return;
    }

    let cancelled = false;

    void connection
      .sendMessagePromise({
        type: 'persistent_notification/get',
      })
      .then((result) => {
        if (cancelled || !Array.isArray(result)) {
          return;
        }

        setPersistentNotifications(
          result.filter(
            (entry): entry is HomeAssistantPersistentNotification =>
              typeof entry === 'object' && entry !== null
          )
        );
      })
      .catch(() => {
        if (!cancelled) {
          setPersistentNotifications([]);
        }
      });

    void connection
      .sendMessagePromise({
        type: 'repairs/list_issues',
      })
      .then((result) => {
        if (cancelled || !Array.isArray(result)) {
          return;
        }

        setRepairIssues(
          result.filter(
            (entry): entry is HomeAssistantRepairIssue =>
              typeof entry === 'object' && entry !== null
          )
        );
      })
      .catch(() => {
        if (!cancelled) {
          setRepairIssues([]);
        }
      });

    let unsubscribePersistentNotifications: (() => void) | null = null;

    void connection
      .subscribeMessage(
        (event: HomeAssistantPersistentNotificationEvent) => {
          if (cancelled || !Array.isArray(event?.notifications)) {
            return;
          }

          setPersistentNotifications(
            event.notifications.filter(
              (entry): entry is HomeAssistantPersistentNotification =>
                typeof entry === 'object' && entry !== null
            )
          );
        },
        {
          type: 'persistent_notification/subscribe',
        }
      )
      .then((unsubscribe) => {
        if (cancelled) {
          unsubscribe();
          return;
        }

        unsubscribePersistentNotifications = unsubscribe;
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      unsubscribePersistentNotifications?.();
    };
  }, [connection]);

  const notifications = useMemo<Notification[]>(() => {
    if (!entities && persistentNotifications.length === 0 && repairIssues.length === 0) {
      return [];
    }

    const livePersistentNotifications = persistentNotifications.map((notification) => {
      const notificationId = notification.notification_id ?? crypto.randomUUID();
      const id = `persistent_notification:${notificationId}`;
      const title = notification.title?.trim() || 'Notification';
      const message = notification.message?.trim() || '';
      const timestamp = new Date(notification.created_at ?? Date.now());

      return {
        id,
        notificationId,
        source: 'persistent_notification' as const,
        type: inferNotificationType(id, {
          title,
          message,
          severity: notification.status,
        }),
        title,
        message,
        timestamp: Number.isNaN(timestamp.getTime()) ? new Date() : timestamp,
        read: readNotifications.includes(id),
      };
    });

    const liveRepairNotifications = repairIssues.map((issue) => {
      const issueDomain = issue.issue_domain ?? issue.domain ?? 'homeassistant';
      const issueId = issue.issue_id ?? issue.translation_key ?? 'issue';
      const id = `repair:${issueDomain}:${issueId}`;
      const title =
        issue.title?.trim() || issue.translation_key?.replace(/_/g, ' ') || 'Home Assistant issue';
      const messageParts = [
        issue.description?.trim(),
        issue.breaks_in_ha_version ? `Affects ${issue.breaks_in_ha_version}` : null,
      ].filter(Boolean);

      return {
        id,
        notificationId: id,
        source: 'repair' as const,
        type:
          typeof issue.severity === 'string' && issue.severity.toLowerCase().includes('error')
            ? ('error' as const)
            : ('warning' as const),
        title,
        message: messageParts.join(' ') || 'Attention needed in Home Assistant settings.',
        timestamp: new Date(),
        read: readNotifications.includes(id),
      };
    });

    const updateNotifications = Object.entries(entities ?? {})
      .filter(([entityId, entity]) => {
        if (!entityId.startsWith('update.')) {
          return false;
        }

        return (
          entity.state === 'on' ||
          Boolean(entity.attributes?.in_progress) ||
          pendingUpdateInstalls.includes(entityId)
        );
      })
      .map(([entityId, entity]) => {
        const title =
          (typeof entity.attributes?.friendly_name === 'string' &&
            entity.attributes.friendly_name) ||
          'Update available';
        const installedVersion =
          typeof entity.attributes?.installed_version === 'string'
            ? entity.attributes.installed_version
            : null;
        const latestVersion =
          typeof entity.attributes?.latest_version === 'string'
            ? entity.attributes.latest_version
            : null;
        const releaseSummary =
          typeof entity.attributes?.release_summary === 'string'
            ? entity.attributes.release_summary
            : null;
        const rawProgress =
          typeof entity.attributes?.update_percentage === 'number'
            ? entity.attributes.update_percentage
            : typeof entity.attributes?.update_progress === 'number'
              ? entity.attributes.update_progress
              : null;
        const progress =
          typeof rawProgress === 'number' && !Number.isNaN(rawProgress)
            ? Math.max(0, Math.min(100, Math.round(rawProgress)))
            : null;
        const isBusy =
          Boolean(entity.attributes?.in_progress) || pendingUpdateInstalls.includes(entityId);
        const requiresRestart =
          pendingUpdateInstalls.includes(entityId) &&
          !entity.attributes?.in_progress &&
          entity.state !== 'on';

        const versionMessage =
          installedVersion && latestVersion
            ? `Update available: ${installedVersion} -> ${latestVersion}`
            : latestVersion
              ? `Update available to ${latestVersion}`
              : 'Update available';
        const message = releaseSummary?.trim() || versionMessage;
        const statusLabel = requiresRestart
          ? 'Restart Home Assistant to finish update'
          : isBusy
            ? progress !== null
              ? `Installing ${progress}%`
              : 'Installing update...'
            : latestVersion
              ? `Ready to install ${latestVersion}`
              : 'Update available';
        const timestampSource =
          typeof entity.last_changed === 'string'
            ? entity.last_changed
            : typeof entity.last_updated === 'string'
              ? entity.last_updated
              : '';
        const timestamp = new Date(timestampSource || Date.now());

        return {
          id: entityId,
          notificationId: entityId,
          source: 'update' as const,
          type: 'warning' as const,
          title,
          message,
          timestamp: Number.isNaN(timestamp.getTime()) ? new Date() : timestamp,
          read: readNotifications.includes(entityId),
          isBusy,
          progress,
          statusLabel,
          requiresRestart,
        };
      });

    return [...livePersistentNotifications, ...liveRepairNotifications, ...updateNotifications]
      .filter((notification) => !hiddenNotifications.includes(notification.id))
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [
    entities,
    hiddenNotifications,
    pendingUpdateInstalls,
    persistentNotifications,
    readNotifications,
    repairIssues,
  ]);

  const unreadCount = notifications.filter((notification) => !notification.read).length;

  const markAsRead = useCallback((id: string) => {
    setReadNotifications((current) => (current.includes(id) ? current : [...current, id]));
  }, []);

  const runPrimaryAction = useCallback(
    async (id: string) => {
      const notification = notifications.find((entry) => entry.id === id);
      if (!notification) {
        return;
      }

      if (notification.source === 'update') {
        if (notification.requiresRestart) {
          await homeAssistantService.callService('homeassistant', 'restart');
          setPendingUpdateInstalls((current) => current.filter((entityId) => entityId !== id));
          markAsRead(id);
          return;
        }

        setPendingUpdateInstalls((current) => (current.includes(id) ? current : [...current, id]));
        await homeAssistantService.callService(
          'update',
          'install',
          {},
          { entity_id: notification.id }
        );
      }

      markAsRead(id);
    },
    [markAsRead, notifications]
  );

  const markAllAsRead = useCallback(() => {
    setReadNotifications(notifications.map((notification) => notification.id));
  }, [notifications]);

  const deleteNotification = useCallback(
    async (id: string) => {
      const notification = notifications.find((entry) => entry.id === id);
      if (!notification) {
        return;
      }

      setHiddenNotifications((current) => (current.includes(id) ? current : [...current, id]));
      setReadNotifications((current) => current.filter((entry) => entry !== id));

      if (notification.source === 'persistent_notification') {
        try {
          await homeAssistantService.callService('persistent_notification', 'dismiss', {
            notification_id: notification.notificationId,
          });
        } catch {
          // Keep the item hidden locally even if Home Assistant rejects or delays dismissal.
        }
      }
    },
    [notifications]
  );

  const clearAll = useCallback(async () => {
    if (!notifications.length || !confirm('Are you sure you want to clear all notifications?')) {
      return;
    }

    const notificationIds = notifications.map((notification) => notification.id);
    setHiddenNotifications((current) => [...new Set([...current, ...notificationIds])]);
    setReadNotifications([]);

    await Promise.allSettled(
      notifications
        .filter((notification) => notification.source === 'persistent_notification')
        .map((notification) =>
          homeAssistantService.callService('persistent_notification', 'dismiss', {
            notification_id: notification.notificationId,
          })
        )
    );
  }, [notifications]);

  return {
    notifications,
    unreadCount,
    runPrimaryAction,
    markAllAsRead,
    deleteNotification,
    clearAll,
  };
}
