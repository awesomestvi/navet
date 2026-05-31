import type { IntegrationServiceTarget } from './integration-service-target';
import type { NavetProviderContract, SmartHomeProviderAdapter } from './provider-contract';
import type { PlatformCameraStream, PlatformCameraStreamType } from './provider-feature-models';
import type {
  ProviderAdminFeatureService,
  ProviderCalendarFeatureService,
  ProviderCameraFeatureService,
  ProviderClimateFeatureService,
  ProviderEnergyFeatureService,
  ProviderEntityRuntimeService,
  ProviderHistoryFeatureService,
  ProviderLightFeatureService,
  ProviderMediaFeatureService,
  ProviderNotificationFeatureService,
  ProviderSecurityFeatureService,
  ProviderTaskFeatureService,
  ProviderWeatherFeatureService,
} from './provider-feature-services';

export interface ProviderContractRegistration {
  contract: NavetProviderContract;
  providerContractAdapter: SmartHomeProviderAdapter;
}

export interface IntegrationProviderCapabilities {
  serviceActions: boolean;
  pathSigning: boolean;
  cameraStreams: boolean;
}

export type IntegrationProviderCapability = keyof IntegrationProviderCapabilities;

export interface IntegrationProviderFeatureMatrix {
  rooms: boolean;
  lighting: boolean;
  sensors: boolean;
  climate: boolean;
  mediaControls: boolean;
  mediaBrowse: boolean;
  mediaArtwork: boolean;
  cameraSnapshot: boolean;
  cameraStreams: boolean;
  energyNow: boolean;
  calendar: boolean;
  weather: boolean;
  notifications: boolean;
  tasks: boolean;
}

export type IntegrationProviderFeature = keyof IntegrationProviderFeatureMatrix;

export type IntegrationProviderImplementationStatus = 'implemented' | 'planned';

export interface IntegrationProviderRuntimeRegistration {
  providerContractAdapter: SmartHomeProviderAdapter;
  contract: NavetProviderContract;
  implementationStatus: IntegrationProviderImplementationStatus;
  capabilities: IntegrationProviderCapabilities;
  featureMatrix: IntegrationProviderFeatureMatrix;
  invokeService?: (
    domain: string,
    service: string,
    serviceData?: Record<string, unknown>,
    target?: IntegrationServiceTarget
  ) => Promise<void>;
  signPath?: (path: string, expiresSeconds?: number) => Promise<string>;
  getCameraStream?: (
    entityId: string,
    format: PlatformCameraStreamType
  ) => Promise<PlatformCameraStream>;
  adminFeatureService?: ProviderAdminFeatureService;
  calendarFeatureService?: ProviderCalendarFeatureService;
  cameraFeatureService?: ProviderCameraFeatureService;
  climateFeatureService?: ProviderClimateFeatureService;
  energyFeatureService?: ProviderEnergyFeatureService;
  entityRuntimeService?: ProviderEntityRuntimeService;
  historyFeatureService?: ProviderHistoryFeatureService;
  lightFeatureService?: ProviderLightFeatureService;
  mediaFeatureService?: ProviderMediaFeatureService;
  notificationFeatureService?: ProviderNotificationFeatureService;
  securityFeatureService?: ProviderSecurityFeatureService;
  taskFeatureService?: ProviderTaskFeatureService;
  weatherFeatureService?: ProviderWeatherFeatureService;
}
