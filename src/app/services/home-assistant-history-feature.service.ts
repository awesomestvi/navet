import { integrationHistoryService } from '@/app/services/integration-history.service';

// Energy history/statistics are still Home Assistant specific.
// Keep the explicit alias at the feature boundary even while the underlying
// implementation remains the shared provider service instance.
export const homeAssistantHistoryFeatureService = integrationHistoryService;
