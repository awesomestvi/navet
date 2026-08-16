import type { ProviderChoreProjectionFeatureService } from '@navet/core/provider-feature-services';
import { getHomeAssistantConnection } from './homeassistant-service-bridge';

export const homeAssistantChoreProjectionFeatureService: ProviderChoreProjectionFeatureService = {
  async publishSnapshot(snapshot) {
    const connection = getHomeAssistantConnection();
    if (!connection) return;
    await connection.sendMessagePromise({
      type: 'fire_event',
      event_type: 'navet_chore_projection',
      event_data: snapshot,
    });
  },
  async subscribeActionRequests(listener) {
    const connection = getHomeAssistantConnection();
    if (!connection?.subscribeMessage) return () => {};
    return await connection.subscribeMessage(
      (event: { data?: unknown }) => {
        const data = event?.data;
        if (!data || typeof data !== 'object') return;
        const request = data as Record<string, unknown>;
        if (
          typeof request.action !== 'string' ||
          !['claim', 'complete', 'approve', 'reject', 'skip', 'reopen', 'reassign'].includes(
            request.action
          ) ||
          typeof request.occurrenceId !== 'string' ||
          typeof request.participantId !== 'string'
        ) {
          return;
        }
        listener({
          action: request.action as Parameters<typeof listener>[0]['action'],
          occurrenceId: request.occurrenceId,
          participantId: request.participantId,
          reason: typeof request.reason === 'string' ? request.reason : undefined,
          assigneeIds: Array.isArray(request.assigneeIds)
            ? request.assigneeIds.filter((id): id is string => typeof id === 'string')
            : undefined,
        });
      },
      { type: 'subscribe_events', event_type: 'navet_chore_action_requested' }
    );
  },
};
