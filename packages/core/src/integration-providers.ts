export const INTEGRATION_PROVIDER_IDS = [
  'home_assistant',
  'homey',
  'openhab',
  'hubitat',
  'smartthings',
] as const;

export type IntegrationProviderId = (typeof INTEGRATION_PROVIDER_IDS)[number];

export const IMPLEMENTED_INTEGRATION_PROVIDER_IDS = [
  'home_assistant',
  'homey',
  'openhab',
] as const satisfies readonly IntegrationProviderId[];

export type ImplementedIntegrationProviderId =
  (typeof IMPLEMENTED_INTEGRATION_PROVIDER_IDS)[number];

export interface IntegrationProviderDefinition {
  id: IntegrationProviderId;
  label: string;
  implementationStatus: 'implemented' | 'planned';
  loginMode: 'url_oauth' | 'url_session' | 'cloud_oauth' | 'unavailable';
  supportsDiscovery: boolean;
  supportsAggregation: boolean;
  supportsRooms: boolean;
  supportsRealtimeUpdates: boolean;
}

export interface ProviderScopedMetadata {
  providerId: IntegrationProviderId;
  nativeId: string;
  canonicalId: string;
}

export interface ProviderRoom extends ProviderScopedMetadata {
  name: string;
  alias?: string;
}

export const INTEGRATION_PROVIDERS: Record<IntegrationProviderId, IntegrationProviderDefinition> = {
  home_assistant: {
    id: 'home_assistant',
    label: 'Home Assistant',
    implementationStatus: 'implemented',
    loginMode: 'url_oauth',
    supportsDiscovery: true,
    supportsAggregation: true,
    supportsRooms: true,
    supportsRealtimeUpdates: true,
  },
  homey: {
    id: 'homey',
    label: 'Homey',
    implementationStatus: 'implemented',
    loginMode: 'cloud_oauth',
    supportsDiscovery: false,
    supportsAggregation: true,
    supportsRooms: true,
    supportsRealtimeUpdates: true,
  },
  openhab: {
    id: 'openhab',
    label: 'openHAB',
    implementationStatus: 'implemented',
    loginMode: 'url_session',
    supportsDiscovery: false,
    supportsAggregation: true,
    supportsRooms: true,
    supportsRealtimeUpdates: true,
  },
  hubitat: {
    id: 'hubitat',
    label: 'Hubitat',
    implementationStatus: 'planned',
    loginMode: 'unavailable',
    supportsDiscovery: false,
    supportsAggregation: true,
    supportsRooms: true,
    supportsRealtimeUpdates: true,
  },
  smartthings: {
    id: 'smartthings',
    label: 'SmartThings',
    implementationStatus: 'planned',
    loginMode: 'unavailable',
    supportsDiscovery: false,
    supportsAggregation: true,
    supportsRooms: true,
    supportsRealtimeUpdates: true,
  },
};

export function isIntegrationProviderId(value: string): value is IntegrationProviderId {
  return (INTEGRATION_PROVIDER_IDS as readonly string[]).includes(value);
}

export function isImplementedIntegrationProviderId(
  providerId: string
): providerId is ImplementedIntegrationProviderId {
  return (IMPLEMENTED_INTEGRATION_PROVIDER_IDS as readonly string[]).includes(providerId);
}
