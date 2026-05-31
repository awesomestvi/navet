import type {
  IntegrationProviderRuntimeRegistration,
  ProviderContractRegistration,
} from '@navet/core/provider-runtime-types';
import { homeAssistantAdminFeatureService } from './homeassistant-admin-feature.service';
import { homeAssistantCalendarFeatureService } from './homeassistant-calendar-feature.service';
import { homeAssistantCameraFeatureService } from './homeassistant-camera-feature.service';
import { homeAssistantClimateFeatureService } from './homeassistant-climate-feature.service';
import { homeAssistantEnergyFeatureService } from './homeassistant-energy-feature.service';
import { homeAssistantEntityRuntimeService } from './homeassistant-entity-runtime.service';
import { homeAssistantHistoryFeatureService } from './homeassistant-history-feature.service';
import { homeAssistantLightFeatureService } from './homeassistant-light-feature.service';
import { homeAssistantMediaFeatureService } from './homeassistant-media-feature.service';
import { homeAssistantNotificationFeatureService } from './homeassistant-notification-feature.service';
import { homeAssistantSecurityFeatureService } from './homeassistant-security-feature.service';
import {
  callHomeAssistantService,
  getHomeAssistantCameraStreamUrl,
  signHomeAssistantPath,
} from './homeassistant-service-bridge';
import { homeAssistantTaskFeatureService } from './homeassistant-task-feature.service';
import { homeAssistantWeatherFeatureService } from './homeassistant-weather-feature.service';

export function createHomeAssistantRuntimeRegistration(
  registration: ProviderContractRegistration
): IntegrationProviderRuntimeRegistration {
  return {
    providerContractAdapter: registration.providerContractAdapter,
    contract: registration.contract,
    implementationStatus: 'implemented',
    capabilities: {
      serviceActions: true,
      pathSigning: true,
      cameraStreams: true,
    },
    featureMatrix: {
      rooms: true,
      lighting: true,
      sensors: true,
      climate: true,
      mediaControls: true,
      mediaBrowse: true,
      mediaArtwork: true,
      cameraSnapshot: true,
      cameraStreams: true,
      energyNow: true,
      calendar: true,
      weather: true,
      notifications: true,
      tasks: true,
    },
    callService: async (domain, service, serviceData = {}, target) =>
      callHomeAssistantService(domain, service, serviceData, target),
    signPath: async (path, expiresSeconds) => {
      const signed = await signHomeAssistantPath(path, expiresSeconds);
      return signed.path;
    },
    getCameraStream: async (entityId, format) =>
      await getHomeAssistantCameraStreamUrl(entityId, format),
    adminFeatureService: homeAssistantAdminFeatureService,
    calendarFeatureService: homeAssistantCalendarFeatureService,
    cameraFeatureService: homeAssistantCameraFeatureService,
    climateFeatureService: homeAssistantClimateFeatureService,
    energyFeatureService: homeAssistantEnergyFeatureService,
    entityRuntimeService: homeAssistantEntityRuntimeService,
    historyFeatureService: homeAssistantHistoryFeatureService,
    lightFeatureService: homeAssistantLightFeatureService,
    mediaFeatureService: homeAssistantMediaFeatureService,
    notificationFeatureService: homeAssistantNotificationFeatureService,
    securityFeatureService: homeAssistantSecurityFeatureService,
    taskFeatureService: homeAssistantTaskFeatureService,
    weatherFeatureService: homeAssistantWeatherFeatureService,
  };
}
