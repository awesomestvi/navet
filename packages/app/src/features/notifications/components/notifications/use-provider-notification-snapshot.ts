import { useIntegrationStore } from '@navet/app/hooks';
import { useHomeAssistant } from '@navet/app/hooks/use-home-assistant';
import type {
  PlatformNotificationSnapshot,
  PlatformPersistentNotification,
  PlatformPersistentNotificationEvent,
} from '@navet/app/platform/provider-feature-models';
import { getProviderRuntimeRegistration } from '@navet/app/provider-runtime-registry';
import { homeAssistantSelectors, integrationSelectors } from '@navet/app/stores/selectors';
import type { IntegrationProviderId } from '@navet/app/types/provider';
import { useEffect, useState } from 'react';

const EMPTY_NOTIFICATION_SNAPSHOT: PlatformNotificationSnapshot = {
  persistentNotifications: [],
  repairIssues: [],
};

export function applyNotificationEvent(
  current: PlatformPersistentNotification[],
  event: PlatformPersistentNotificationEvent
): PlatformPersistentNotification[] {
  if (!event.notifications) return current;
  if (!event.update_type || event.update_type === 'current') return event.notifications;
  const changedIds = new Set(
    event.notifications.map((item) => item.notification_id).filter(Boolean)
  );
  const remaining = current.filter((item) => !changedIds.has(item.notification_id));
  return event.update_type === 'removed' ? remaining : [...remaining, ...event.notifications];
}

export function useProviderNotificationSnapshot(): PlatformNotificationSnapshot {
  const selected = useIntegrationStore(integrationSelectors.selectedProviderIds);
  const health = useIntegrationStore(integrationSelectors.providerHealth);
  const connection = useHomeAssistant(homeAssistantSelectors.connection);
  const key = selected.filter((id) => health[id]?.connected).join(',');
  const [snapshot, setSnapshot] = useState(EMPTY_NOTIFICATION_SNAPSHOT);
  useEffect(() => {
    let cancelled = false;
    const snapshots = new Map<IntegrationProviderId, PlatformNotificationSnapshot>();
    const cleanups: (() => void)[] = [];
    setSnapshot(EMPTY_NOTIFICATION_SNAPSHOT);
    const publish = () => {
      if (cancelled) return;
      setSnapshot({
        persistentNotifications: [...snapshots.values()].flatMap(
          (value) => value.persistentNotifications
        ),
        repairIssues: [...snapshots.values()].flatMap((value) => value.repairIssues),
      });
    };
    for (const id of key.split(',').filter(Boolean) as IntegrationProviderId[]) {
      const service = getProviderRuntimeRegistration(id).notificationFeatureService;
      if (!service) continue;
      let pendingEvents: PlatformPersistentNotificationEvent[] | null = [];
      const options = id === 'home_assistant' ? { messageClient: connection } : undefined;
      void service
        .getSnapshot(options)
        .then((value) => {
          if (!cancelled) {
            snapshots.set(id, {
              ...value,
              persistentNotifications: (pendingEvents ?? []).reduce(
                applyNotificationEvent,
                value.persistentNotifications
              ),
            });
            pendingEvents = null;
            publish();
          }
        })
        .catch(() => {
          pendingEvents = null;
        });
      void service
        .subscribePersistentNotifications((event) => {
          if (cancelled || !event.notifications) return;
          pendingEvents?.push(event);
          snapshots.set(id, {
            persistentNotifications: applyNotificationEvent(
              snapshots.get(id)?.persistentNotifications ?? [],
              event
            ),
            repairIssues: snapshots.get(id)?.repairIssues ?? [],
          });
          publish();
        }, options)
        .then((cleanup) => {
          if (cancelled) cleanup();
          else cleanups.push(cleanup);
        })
        .catch(() => undefined);
    }
    return () => {
      cancelled = true;
      cleanups.forEach((cleanup) => {
        cleanup();
      });
    };
  }, [key, connection]);
  return snapshot;
}
