import { useEffect, useState } from 'react';
import { useHomeAssistant } from '@/app/hooks/use-home-assistant';
import type {
  PlatformNotificationSnapshot,
  PlatformPersistentNotification,
  PlatformRepairIssue,
} from '@/app/platform/provider-feature-models';
import { integrationNotificationFeatureService } from '@/app/services/integration-notification-feature.service';
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

    void integrationNotificationFeatureService
      .getSnapshot({ connection })
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

    void integrationNotificationFeatureService
      .subscribePersistentNotifications(
        (event) => {
          if (cancelled || !Array.isArray(event?.notifications)) return;
          setPersistentNotifications(event.notifications);
        },
        { connection }
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
