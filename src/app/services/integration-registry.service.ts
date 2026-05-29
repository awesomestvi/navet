import type { NavetProviderContract } from '@navet/app/internal/compat';
import {
  getRegisteredProviderContract,
  getRegisteredSmartHomeProviderAdapter,
} from '@navet/app/provider-contract-registry';
import { getProviderRuntimeRegistration } from '@navet/app/provider-runtime-registry';
import type {
  IntegrationProviderCapability,
  IntegrationProviderFeature,
  IntegrationProviderFeatureMatrix,
  IntegrationProviderRuntimeRegistration,
} from '@navet/app/provider-runtime-types';
import type { SmartHomeProviderAdapter } from '@navet/core/provider-contract';
import type { IntegrationProviderDefinition, IntegrationProviderId } from '../types/provider';
import { INTEGRATION_PROVIDERS } from '../types/provider';

interface IntegrationProviderAdapterBase {
  provider: IntegrationProviderDefinition;
}

export type IntegrationProviderAdapter = IntegrationProviderAdapterBase &
  IntegrationProviderRuntimeRegistration;

const CAPABILITY_MESSAGES: Record<IntegrationProviderCapability, string> = {
  serviceActions: 'Service actions are not implemented yet',
  pathSigning: 'Path signing is not implemented yet',
  cameraStreams: 'Camera streams are not implemented yet',
};

const FEATURE_MESSAGES: Record<IntegrationProviderFeature, string> = {
  rooms: 'Room aggregation is not implemented yet',
  lighting: 'Lighting support is not implemented yet',
  sensors: 'Sensor support is not implemented yet',
  climate: 'Climate support is not implemented yet',
  mediaControls: 'Media controls are not implemented yet',
  mediaBrowse: 'Media browsing is not implemented yet',
  mediaArtwork: 'Media artwork is not implemented yet',
  cameraSnapshot: 'Camera snapshots are not implemented yet',
  cameraStreams: 'Camera streams are not implemented yet',
  energyNow: 'Energy dashboards are not implemented yet',
  calendar: 'Calendar support is not implemented yet',
  weather: 'Weather support is not implemented yet',
  notifications: 'Notifications are not implemented yet',
  tasks: 'Task support is not implemented yet',
};

function createIntegrationProviderAdapter(
  providerId: IntegrationProviderId
): IntegrationProviderAdapter {
  return {
    provider: INTEGRATION_PROVIDERS[providerId],
    ...getProviderRuntimeRegistration(providerId),
  };
}

var integrationProviderAdapters:
  | Partial<Record<IntegrationProviderId, IntegrationProviderAdapter>>
  | undefined;

export function getIntegrationProviderAdapter(
  providerId: IntegrationProviderId
): IntegrationProviderAdapter {
  if (!integrationProviderAdapters) {
    integrationProviderAdapters = {};
  }

  const existing = integrationProviderAdapters[providerId];
  if (existing) {
    return existing;
  }

  const adapter = createIntegrationProviderAdapter(providerId);
  integrationProviderAdapters[providerId] = adapter;
  return adapter;
}

export function getSmartHomeProviderAdapter(
  providerId: IntegrationProviderId
): SmartHomeProviderAdapter {
  return getRegisteredSmartHomeProviderAdapter(providerId);
}

export function getIntegrationProviderContract(
  providerId: IntegrationProviderId
): NavetProviderContract {
  return getRegisteredProviderContract(providerId);
}

export function createMissingIntegrationCapabilityError(
  adapter: IntegrationProviderAdapter,
  capability: IntegrationProviderCapability
): Error {
  return new Error(`${CAPABILITY_MESSAGES[capability]} for provider ${adapter.provider.label}`);
}

export function hasIntegrationProviderCapability(
  adapter: IntegrationProviderAdapter,
  capability: IntegrationProviderCapability
): boolean {
  return adapter.capabilities[capability];
}

export function createMissingIntegrationFeatureError(
  adapter: IntegrationProviderAdapter,
  feature: IntegrationProviderFeature
): Error {
  return new Error(`${FEATURE_MESSAGES[feature]} for provider ${adapter.provider.label}`);
}

export function hasIntegrationProviderFeature(
  adapter: IntegrationProviderAdapter,
  feature: IntegrationProviderFeature
): boolean {
  return adapter.featureMatrix[feature];
}

export function requireIntegrationProviderCapability(
  adapter: IntegrationProviderAdapter,
  capability: IntegrationProviderCapability
): void {
  if (!hasIntegrationProviderCapability(adapter, capability)) {
    throw createMissingIntegrationCapabilityError(adapter, capability);
  }
}

export function requireIntegrationProviderFeature(
  adapter: IntegrationProviderAdapter,
  feature: IntegrationProviderFeature
): void {
  if (!hasIntegrationProviderFeature(adapter, feature)) {
    throw createMissingIntegrationFeatureError(adapter, feature);
  }
}

export function getIntegrationProviderFeatureMatrix(
  providerId: IntegrationProviderId
): IntegrationProviderFeatureMatrix {
  return getIntegrationProviderAdapter(providerId).featureMatrix;
}

export function listAvailableIntegrationProviders(): IntegrationProviderDefinition[] {
  return listIntegrationProviderAdapters().map((adapter) => adapter.provider);
}

export function listImplementedIntegrationProviders(): IntegrationProviderDefinition[] {
  return listIntegrationProviderAdapters()
    .filter((adapter) => adapter.implementationStatus === 'implemented')
    .map((adapter) => adapter.provider);
}

export function listIntegrationProviderAdapters(): IntegrationProviderAdapter[] {
  return (['home_assistant', 'homey', 'openhab', 'hubitat', 'smartthings'] as const).map(
    (providerId) => getIntegrationProviderAdapter(providerId)
  );
}

function requireFeatureService<T>(
  providerId: IntegrationProviderId,
  feature: IntegrationProviderFeature,
  selector: (adapter: IntegrationProviderAdapter) => T | undefined
): T {
  const adapter = getIntegrationProviderAdapter(providerId);
  requireIntegrationProviderFeature(adapter, feature);
  const service = selector(adapter);
  if (!service) {
    throw createMissingIntegrationFeatureError(adapter, feature);
  }
  return service;
}

export function getIntegrationProviderAdminFeatureService(providerId: IntegrationProviderId) {
  return requireFeatureService(providerId, 'rooms', (adapter) => adapter.adminFeatureService);
}

export function getIntegrationProviderCalendarFeatureService(providerId: IntegrationProviderId) {
  return requireFeatureService(providerId, 'calendar', (adapter) => adapter.calendarFeatureService);
}

export function getIntegrationProviderCameraFeatureService(providerId: IntegrationProviderId) {
  return requireFeatureService(
    providerId,
    'cameraStreams',
    (adapter) => adapter.cameraFeatureService
  );
}

export function getIntegrationProviderMediaFeatureService(providerId: IntegrationProviderId) {
  return requireFeatureService(
    providerId,
    'mediaControls',
    (adapter) => adapter.mediaFeatureService
  );
}

export function getIntegrationProviderEntityRuntimeService(providerId: IntegrationProviderId) {
  return getIntegrationProviderAdapter(providerId).entityRuntimeService ?? null;
}

export function getIntegrationProviderEnergyFeatureService(providerId: IntegrationProviderId) {
  return requireFeatureService(providerId, 'energyNow', (adapter) => adapter.energyFeatureService);
}

export function getIntegrationProviderHistoryFeatureService(providerId: IntegrationProviderId) {
  return getIntegrationProviderAdapter(providerId).historyFeatureService ?? null;
}

export function getIntegrationProviderNotificationFeatureService(
  providerId: IntegrationProviderId
) {
  return requireFeatureService(
    providerId,
    'notifications',
    (adapter) => adapter.notificationFeatureService
  );
}

export function getIntegrationProviderTaskFeatureService(providerId: IntegrationProviderId) {
  return requireFeatureService(providerId, 'tasks', (adapter) => adapter.taskFeatureService);
}

export function getIntegrationProviderWeatherFeatureService(providerId: IntegrationProviderId) {
  return requireFeatureService(providerId, 'weather', (adapter) => adapter.weatherFeatureService);
}
