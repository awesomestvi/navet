import { useEffect, useState } from 'react';
import { useHomeAssistant } from '@/app/hooks/use-home-assistant';
import { homeAssistantSelectors } from '@/app/stores/selectors';

export interface HomeAssistantPersistentNotification {
  notification_id?: string;
  title?: string;
  message?: string;
  created_at?: string;
  status?: string;
}

export interface HomeAssistantRepairIssue {
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

interface HomeAssistantPersistentNotificationEvent {
  update_type?: 'added' | 'removed' | 'updated' | 'current';
  notifications?: HomeAssistantPersistentNotification[];
}

export interface HaNotificationData {
  persistentNotifications: HomeAssistantPersistentNotification[];
  repairIssues: HomeAssistantRepairIssue[];
}

export function useHaNotificationData(): HaNotificationData {
  const connection = useHomeAssistant(homeAssistantSelectors.connection);
  const [persistentNotifications, setPersistentNotifications] = useState<
    HomeAssistantPersistentNotification[]
  >([]);
  const [repairIssues, setRepairIssues] = useState<HomeAssistantRepairIssue[]>([]);

  useEffect(() => {
    if (!connection) {
      setPersistentNotifications([]);
      setRepairIssues([]);
      return;
    }

    let cancelled = false;

    void connection
      .sendMessagePromise({ type: 'persistent_notification/get' })
      .then((result) => {
        if (cancelled || !Array.isArray(result)) return;
        setPersistentNotifications(
          result.filter(
            (entry): entry is HomeAssistantPersistentNotification =>
              typeof entry === 'object' && entry !== null
          )
        );
      })
      .catch(() => {
        if (!cancelled) setPersistentNotifications([]);
      });

    void connection
      .sendMessagePromise({ type: 'repairs/list_issues' })
      .then((result) => {
        if (cancelled || !Array.isArray(result)) return;
        setRepairIssues(
          result.filter(
            (entry): entry is HomeAssistantRepairIssue =>
              typeof entry === 'object' && entry !== null
          )
        );
      })
      .catch(() => {
        if (!cancelled) setRepairIssues([]);
      });

    let unsubscribe: (() => void) | null = null;

    void connection
      .subscribeMessage(
        (event: HomeAssistantPersistentNotificationEvent) => {
          if (cancelled || !Array.isArray(event?.notifications)) return;
          setPersistentNotifications(
            event.notifications.filter(
              (entry): entry is HomeAssistantPersistentNotification =>
                typeof entry === 'object' && entry !== null
            )
          );
        },
        { type: 'persistent_notification/subscribe' }
      )
      .then((unsub) => {
        if (cancelled) {
          unsub();
          return;
        }
        unsubscribe = unsub;
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [connection]);

  return { persistentNotifications, repairIssues };
}
