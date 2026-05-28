import type { ProviderCalendarFeatureService } from '@/app/platform/provider-feature-services';
import { homeAssistantService } from '@/app/services/home-assistant.service';
import { parseProviderScopedId } from '@/app/utils/provider-ids';

type CalendarServiceEvent = Record<string, unknown>;

type CalendarEventsServicePayload = {
  response?: Record<
    string,
    {
      events?: CalendarServiceEvent[];
    }
  >;
};

type CalendarEventsServiceEnvelope = CalendarEventsServicePayload & {
  result?: CalendarEventsServicePayload;
};

function getActiveMessageClient(
  messageClient?: { sendMessagePromise<T>(message: unknown): Promise<T> } | null
) {
  return messageClient ?? homeAssistantService.getConnection();
}

function requireHomeAssistantCalendarProvider(entityId: string) {
  const providerScope = parseProviderScopedId(entityId);
  if (providerScope && providerScope.providerId !== 'home_assistant') {
    throw new Error('Calendar events are not supported for the current integration yet');
  }

  return providerScope?.nativeId ?? entityId;
}

export const integrationCalendarFeatureService: ProviderCalendarFeatureService = {
  async getEvents(entityId, options) {
    const nativeEntityId = requireHomeAssistantCalendarProvider(entityId);
    const messageClient = getActiveMessageClient(options?.messageClient);
    if (!messageClient) {
      return [];
    }

    const now = new Date();
    const startDateTime = options?.startDateTime ?? now.toISOString();
    const endDateTime =
      options?.endDateTime ?? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const response = (await messageClient.sendMessagePromise({
      type: 'call_service',
      domain: 'calendar',
      service: 'get_events',
      target: { entity_id: nativeEntityId },
      service_data: {
        start_date_time: startDateTime,
        end_date_time: endDateTime,
      },
      return_response: true,
    })) as CalendarEventsServiceEnvelope;

    const payload = response.response ?? response.result?.response;
    return payload?.[nativeEntityId]?.events ?? [];
  },
};
