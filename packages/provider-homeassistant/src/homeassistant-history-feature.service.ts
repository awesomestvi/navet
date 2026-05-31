import type { ProviderHistoryFeatureService } from '@navet/core/provider-feature-services';
import { getHomeAssistantConnection } from './homeassistant-service-bridge';

export const homeAssistantHistoryFeatureService: ProviderHistoryFeatureService = {
  getMessageClient: () => getHomeAssistantConnection(),
  supportsStatisticsHistory: (entityId) => entityId.startsWith('sensor.'),
  supportsEnergyStatistics: (entityId) => entityId.startsWith('sensor.'),
};
