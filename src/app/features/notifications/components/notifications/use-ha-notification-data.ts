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

function selectNoConnection() {
  return null;
}

export function useHaNotificationData(enabled = true): HaNotificationData {
  const connection = useHomeAssistant(
    enabled ? homeAssistantSelectors.connection : selectNoConnection
  );
  const [persistentNotifications, setPersistentNotifications] = useState<
    PlatformPersistentNotification[]
  >([]);
  const [repairIssues, setRepairIssues] = useState<PlatformRepairIssue[]>([]);

  useEffect(() => {
    if (!enabled || !connection) {
      setPersistentNotifications([]);
      setRepairIssues([]);
      return;
    }

    let cancelled = false;

    void integrationNotificationFeatureService
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

    void integrationNotificationFeatureService
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
  }, [connection, enabled]);

  return { persistentNotifications, repairIssues };
}
