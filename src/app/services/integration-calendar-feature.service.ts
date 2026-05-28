import type { Connection } from 'home-assistant-js-websocket';
import type { ProviderCalendarFeatureService } from '@/app/platform/provider-feature-services';
import { homeAssistantService } from '@/app/services/home-assistant.service';

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

function getActiveConnection(connection?: Connection | null) {
  return connection ?? homeAssistantService.getConnection();
}

export const integrationCalendarFeatureService: ProviderCalendarFeatureService = {
  async getEvents(entityId, options) {
    const connection = getActiveConnection(options?.connection);
    if (!connection) {
      return [];
    }

    const now = new Date();
    const startDateTime = options?.startDateTime ?? now.toISOString();
    const endDateTime =
      options?.endDateTime ?? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const response = (await connection.sendMessagePromise({
      type: 'call_service',
      domain: 'calendar',
      service: 'get_events',
      target: { entity_id: entityId },
      service_data: {
        start_date_time: startDateTime,
        end_date_time: endDateTime,
      },
      return_response: true,
    })) as CalendarEventsServiceEnvelope;

    const payload = response.response ?? response.result?.response;
    return payload?.[entityId]?.events ?? [];
  },
};
