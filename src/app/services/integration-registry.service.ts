import type { IntegrationProviderDefinition, IntegrationProviderId } from '../types/provider';
import { INTEGRATION_PROVIDERS } from '../types/provider';
import type { HomeAssistantCameraStreamType } from './home-assistant.service';
import { homeAssistantService } from './home-assistant.service';
import { homeyService } from './homey.service';

export interface IntegrationServiceTarget {
  entity_id?: string | string[];
  area_id?: string | string[];
  device_id?: string | string[];
}

export interface IntegrationProviderCapabilities {
  serviceActions: boolean;
  pathSigning: boolean;
  cameraStreams: boolean;
}

export type IntegrationProviderCapability = keyof IntegrationProviderCapabilities;

export type IntegrationProviderImplementationStatus = 'implemented' | 'planned';

export interface IntegrationProviderAdapter {
  provider: IntegrationProviderDefinition;
  implementationStatus: IntegrationProviderImplementationStatus;
  capabilities: IntegrationProviderCapabilities;
  callService?: (
    domain: string,
    service: string,
    serviceData?: Record<string, unknown>,
    target?: IntegrationServiceTarget
  ) => Promise<void>;
  signPath?: (path: string, expiresSeconds?: number) => Promise<string>;
  getCameraStream?: (
    entityId: string,
    format: HomeAssistantCameraStreamType
  ) => Promise<{ url: string }>;
}

const CAPABILITY_MESSAGES: Record<IntegrationProviderCapability, string> = {
  serviceActions: 'Service actions are not implemented yet',
  pathSigning: 'Path signing is not implemented yet',
  cameraStreams: 'Camera streams are not implemented yet',
};

function createUnsupportedProviderAdapter(
  providerId: Exclude<IntegrationProviderId, 'home_assistant'>
): IntegrationProviderAdapter {
  const provider = INTEGRATION_PROVIDERS[providerId];

  return {
    provider,
    implementationStatus: 'planned',
    capabilities: {
      serviceActions: false,
      pathSigning: false,
      cameraStreams: false,
    },
  };
}

const ADAPTERS: Record<IntegrationProviderId, IntegrationProviderAdapter> = {
  home_assistant: {
    provider: INTEGRATION_PROVIDERS.home_assistant,
    implementationStatus: 'implemented',
    capabilities: {
      serviceActions: true,
      pathSigning: true,
      cameraStreams: true,
    },
    callService: async (domain, service, serviceData = {}, target) =>
      homeAssistantService.callService(domain, service, serviceData, target),
    signPath: async (path, expiresSeconds) => {
      const signed = await homeAssistantService.signPath(path, expiresSeconds);
      return signed.path;
    },
    getCameraStream: async (entityId, format) =>
      await homeAssistantService.getCameraStreamUrl(entityId, format),
  },
  homey: {
    provider: INTEGRATION_PROVIDERS.homey,
    implementationStatus: 'implemented',
    capabilities: {
      serviceActions: true,
      pathSigning: false,
      cameraStreams: false,
    },
    callService: async (domain, service, serviceData = {}, target) =>
      await homeyService.callService(domain, service, serviceData, target),
  },
  openhab: createUnsupportedProviderAdapter('openhab'),
};

export function getIntegrationProviderAdapter(
  providerId: IntegrationProviderId
): IntegrationProviderAdapter {
  return ADAPTERS[providerId];
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

export function requireIntegrationProviderCapability(
  adapter: IntegrationProviderAdapter,
  capability: IntegrationProviderCapability
): void {
  if (!hasIntegrationProviderCapability(adapter, capability)) {
    throw createMissingIntegrationCapabilityError(adapter, capability);
  }
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
  return Object.values(ADAPTERS);
}
