import { integrationNotificationFeatureService } from '@/app/services/integration-notification-feature.service';

// Persistent notifications and repair issues currently map Home Assistant-only
// websocket commands. Keep that explicit at the caller boundary.
export const homeAssistantNotificationFeatureService = integrationNotificationFeatureService;
