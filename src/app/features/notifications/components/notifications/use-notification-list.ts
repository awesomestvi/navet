import { useDeferredValue, useMemo } from 'react';
import { useHomeAssistant } from '@/app/hooks/use-home-assistant';
import { useI18n } from '@/app/i18n';
import { homeAssistantSelectors } from '@/app/stores/selectors';
import type { HaNotificationData } from './use-ha-notification-data';
import type { Notification } from './use-notifications';

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

  if (severity.includes('error') || severity.includes('critical')) return 'error';
  if (severity.includes('warn')) return 'warning';
  if (severity.includes('success')) return 'success';

  const searchText =
    `${entityId} ${attributes.title ?? ''} ${attributes.message ?? ''}`.toLowerCase();
  if (
    searchText.includes('error') ||
    searchText.includes('failed') ||
    searchText.includes('offline')
  )
    return 'error';
  if (
    searchText.includes('warning') ||
    searchText.includes('battery') ||
    searchText.includes('open')
  )
    return 'warning';
  if (searchText.includes('success') || searchText.includes('completed')) return 'success';
  return 'info';
};

interface UseNotificationListParams extends HaNotificationData {
  readNotifications: string[];
  hiddenNotifications: string[];
  pendingUpdateInstalls: string[];
}

export function useNotificationList({
  persistentNotifications,
  repairIssues,
  readNotifications,
  hiddenNotifications,
  pendingUpdateInstalls,
}: UseNotificationListParams): Notification[] {
  const { t } = useI18n();
  const entities = useDeferredValue(useHomeAssistant(homeAssistantSelectors.entities));

  return useMemo<Notification[]>(() => {
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
        type: inferNotificationType(id, { title, message, severity: notification.status }),
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
        if (!entityId.startsWith('update.')) return false;
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
          t('notifications.update.available');
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
            ? t('notifications.update.availableFromTo', {
                from: installedVersion,
                to: latestVersion,
              })
            : latestVersion
              ? t('notifications.update.availableTo', { version: latestVersion })
              : t('notifications.update.available');
        const message = releaseSummary?.trim() || versionMessage;
        const statusLabel = requiresRestart
          ? t('notifications.update.restartToFinish')
          : isBusy
            ? progress !== null
              ? t('notifications.update.installingProgress', { progress })
              : t('notifications.update.installing')
            : latestVersion
              ? t('notifications.update.readyToInstall', { version: latestVersion })
              : t('notifications.update.available');
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
    t,
  ]);
}
