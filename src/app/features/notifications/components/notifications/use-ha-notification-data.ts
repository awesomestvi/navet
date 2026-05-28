import { useEffect, useState } from 'react';
import { useHomeAssistant } from '@/app/hooks/use-home-assistant';
import type {
  PlatformNotificationSnapshot,
  PlatformPersistentNotification,
  PlatformRepairIssue,
} from '@/app/platform/provider-feature-models';
import { homeAssistantNotificationFeatureService } from '@/app/services/home-assistant-notification-feature.service';
import { homeAssistantSelectors } from '@/app/stores/selectors';

export interface HaNotificationData extends PlatformNotificationSnapshot {}

export function useHaNotificationData(): HaNotificationData {
  const connection = useHomeAssistant(homeAssistantSelectors.connection);
  const [persistentNotifications, setPersistentNotifications] = useState<
    PlatformPersistentNotification[]
  >([]);
  const [repairIssues, setRepairIssues] = useState<PlatformRepairIssue[]>([]);

  useEffect(() => {
    if (!connection) {
      setPersistentNotifications([]);
      setRepairIssues([]);
      return;
    }

    let cancelled = false;

    void homeAssistantNotificationFeatureService
      .getSnapshot({ messageClient: connection })
      .then((snapshot) => {
        if (cancelled) return;
        setPersistentNotifications(snapshot.persistentNotifications);
        setRepairIssues(snapshot.repairIssues);
      })
      .catch(() => {
        if (!cancelled) {
          setPersistentNotifications([]);
          setRepairIssues([]);
        }
      });

    let unsubscribe: (() => void) | null = null;

    void homeAssistantNotificationFeatureService
      .subscribePersistentNotifications(
        (event) => {
          if (cancelled || !Array.isArray(event?.notifications)) return;
          setPersistentNotifications(event.notifications);
        },
        { messageClient: connection }
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
