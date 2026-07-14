import type { ProviderHistoryFeatureService } from '@navet/core/provider-feature-services';
import { callHomeAssistantApi, getHomeAssistantConnection } from './homeassistant-service-bridge';

interface HomeAssistantHistoryState {
  entity_id?: unknown;
  state?: unknown;
  attributes?: unknown;
  last_changed?: unknown;
  last_updated?: unknown;
}

type HomeAssistantHistoryResponse = HomeAssistantHistoryState[][];

function parseTimestamp(value: unknown): string | null {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) {
    return null;
  }

  return value;
}

function validatePeriod(startTime: string, endTime: string) {
  const start = Date.parse(startTime);
  const end = Date.parse(endTime);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) {
    throw new Error('Entity history requires a valid start time before the end time');
  }
}

export const homeAssistantHistoryFeatureService: ProviderHistoryFeatureService = {
  getMessageClient: () => getHomeAssistantConnection(),
  async getEntityHistory(request) {
    const endTime = request.endTime ?? new Date().toISOString();
    validatePeriod(request.startTime, endTime);

    const query = new URLSearchParams({
      filter_entity_id: request.entityId,
      end_time: endTime,
    });
    if (!request.includeAttributes) {
      query.set('minimal_response', '');
      query.set('no_attributes', '');
    }
    if (request.significantChangesOnly) {
      query.set('significant_changes_only', '');
    }

    const response = await callHomeAssistantApi<HomeAssistantHistoryResponse>(
      'GET',
      `history/period/${encodeURIComponent(request.startTime)}?${query.toString()}`
    );
    const points = (Array.isArray(response?.[0]) ? response[0] : [])
      .map((entry) => {
        const changedAt = parseTimestamp(entry.last_changed ?? entry.last_updated);
        if (typeof entry.state !== 'string' || !changedAt) {
          return null;
        }

        const updatedAt = parseTimestamp(entry.last_updated);
        const attributes =
          entry.attributes &&
          typeof entry.attributes === 'object' &&
          !Array.isArray(entry.attributes)
            ? (entry.attributes as Record<string, unknown>)
            : undefined;

        return {
          state: entry.state,
          changedAt,
          ...(updatedAt ? { updatedAt } : {}),
          ...(attributes ? { attributes } : {}),
        };
      })
      .filter((point): point is NonNullable<typeof point> => point !== null);

    return { entityId: request.entityId, points };
  },
  supportsStatisticsHistory: (entityId) => entityId.startsWith('sensor.'),
  supportsEnergyStatistics: (entityId) => entityId.startsWith('sensor.'),
};
