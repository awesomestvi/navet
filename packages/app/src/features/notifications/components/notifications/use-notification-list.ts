import { type TranslateFn, useI18n } from '@navet/app/i18n';
import type { PlatformUpdateNotificationCandidate } from '@navet/app/platform/provider-feature-models';
import { useMemo } from 'react';
import type { PlatformNotification } from './use-notifications';
import type { ProviderNotificationData } from './use-provider-notification-data';

const inferNotificationType = (
  entityId: string,
  attributes: Record<string, unknown>
): PlatformNotification['type'] => {
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

interface UseNotificationListParams extends ProviderNotificationData {
  readNotifications: string[];
  hiddenNotifications: string[];
  pendingUpdateInstalls: string[];
}

interface BuildUpdateNotificationsParams {
  pendingUpdateInstalls: string[];
  readNotifications: string[];
  t: TranslateFn;
  updateCandidates: PlatformUpdateNotificationCandidate[];
}

export function buildUpdateNotifications({
  pendingUpdateInstalls,
  readNotifications,
  t,
  updateCandidates,
}: BuildUpdateNotificationsParams): PlatformNotification[] {
  return updateCandidates
    .filter(
      (candidate) =>
        candidate.state === 'on' ||
        candidate.inProgress ||
        pendingUpdateInstalls.includes(candidate.entityId)
    )
    .map((candidate) => {
      const title = candidate.friendlyName || t('notifications.update.available');
      const isBusy = candidate.inProgress || pendingUpdateInstalls.includes(candidate.entityId);
      const requiresRestart =
        pendingUpdateInstalls.includes(candidate.entityId) &&
        !candidate.inProgress &&
        candidate.state !== 'on';
      const versionMessage =
        candidate.installedVersion && candidate.latestVersion
          ? t('notifications.update.availableFromTo', {
              from: candidate.installedVersion,
              to: candidate.latestVersion,
            })
          : candidate.latestVersion
            ? t('notifications.update.availableTo', { version: candidate.latestVersion })
            : t('notifications.update.available');
      const detailMessage =
        candidate.releaseNotes?.trim() || candidate.releaseSummary?.trim() || null;
      const message = detailMessage ? `${versionMessage}\n\n${detailMessage}` : versionMessage;
      const statusLabel = requiresRestart
        ? t('notifications.update.restartToFinish')
        : isBusy
          ? candidate.progress !== null && candidate.progress !== undefined
            ? t('notifications.update.installingProgress', { progress: candidate.progress })
            : t('notifications.update.installing')
          : candidate.latestVersion
            ? t('notifications.update.readyToInstall', { version: candidate.latestVersion })
            : t('notifications.update.available');
      const timestamp = new Date(candidate.lastChanged ?? candidate.lastUpdated ?? Date.now());

      const notification: PlatformNotification = {
        id: candidate.entityId,
        notificationId: candidate.entityId,
        source: 'update' as const,
        type: 'warning' as const,
        title,
        message,
        timestamp: Number.isNaN(timestamp.getTime()) ? new Date() : timestamp,
        read: readNotifications.includes(candidate.entityId),
        isBusy,
        progress: candidate.progress ?? null,
        statusLabel,
        requiresRestart,
        installedVersion: candidate.installedVersion ?? null,
        latestVersion: candidate.latestVersion ?? null,
        detailsUrl: candidate.detailsUrl ?? null,
      };

      return notification;
    });
}

export function useNotificationList({
  entitiesHydrated,
  persistentNotifications,
  repairIssues,
  updateCandidates,
  readNotifications,
  hiddenNotifications,
  pendingUpdateInstalls,
}: UseNotificationListParams): PlatformNotification[] {
  const { t } = useI18n();

  return useMemo<PlatformNotification[]>(() => {
    if (
      !entitiesHydrated &&
      persistentNotifications.length === 0 &&
      repairIssues.length === 0 &&
      updateCandidates.length === 0
    ) {
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

    const updateNotifications = buildUpdateNotifications({
      pendingUpdateInstalls,
      readNotifications,
      t,
      updateCandidates,
    });

    return [...livePersistentNotifications, ...liveRepairNotifications, ...updateNotifications]
      .filter((notification) => !hiddenNotifications.includes(notification.id))
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [
    entitiesHydrated,
    hiddenNotifications,
    pendingUpdateInstalls,
    persistentNotifications,
    readNotifications,
    repairIssues,
    t,
    updateCandidates,
  ]);
}
