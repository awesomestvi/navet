import { useI18n } from '@navet/app/hooks';
import { integrationNotificationFeatureService } from '@navet/app/services/integration-notification-feature.service';
import { useEffect, useRef } from 'react';
import { materializeChoreWorkspace } from './chore-workspace-model';
import { useChoreWorkspaceStore } from './chore-workspace-store';

export function useChoreReminderDelivery(enabled = true) {
  const { t } = useI18n();
  const data = useChoreWorkspaceStore((state) => state.data);
  const execute = useChoreWorkspaceStore((state) => state.execute);
  const attempts = useRef(new Set<string>());

  useEffect(() => {
    if (!enabled || !data || !integrationNotificationFeatureService.sendNotification) return;
    const now = Date.now();
    const reconciledData = materializeChoreWorkspace(data, new Date(now)).data;
    const item = reconciledData.outbox.find(
      (candidate) =>
        candidate.eventType.startsWith('reminder_') &&
        candidate.destination === 'home_assistant' &&
        (candidate.status === 'pending' || candidate.status === 'failed') &&
        Date.parse(candidate.nextAttemptAt) <= now &&
        !attempts.current.has(`${candidate.id}:${candidate.attempts}`)
    );
    if (!item?.occurrenceId) return;
    const occurrence = reconciledData.occurrencesById[item.occurrenceId];
    const definition = occurrence
      ? reconciledData.definitionsById[occurrence.definitionId]
      : undefined;
    if (!occurrence || !definition) return;

    const attemptKey = `${item.id}:${item.attempts}`;
    attempts.current.add(attemptKey);
    const messageKey =
      item.eventType === 'reminder_before_due'
        ? 'household.reminder.beforeDue'
        : item.eventType === 'reminder_due'
          ? 'household.reminder.due'
          : item.eventType === 'reminder_overdue'
            ? 'household.reminder.overdue'
            : 'household.reminder.approval';

    void integrationNotificationFeatureService
      .sendNotification({
        title: definition.title,
        message: t(messageKey, { name: definition.title }),
        target: item.destinationTarget,
        data: { choreOccurrenceId: occurrence.id, choreDefinitionId: definition.id },
      })
      .then(() =>
        execute({ type: 'outbox_delivery_update', outboxId: item.id, status: 'delivered' })
      )
      .catch((error: unknown) =>
        execute({
          type: 'outbox_delivery_update',
          outboxId: item.id,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Notification delivery failed',
        })
      );
  }, [data, enabled, execute, t]);
}
