export type IntegrationProviderId = 'home_assistant' | 'homey' | 'openhab';

export interface IntegrationProviderDefinition {
  id: IntegrationProviderId;
  label: string;
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
    supportsAggregation: true,
    supportsRooms: true,
    supportsRealtimeUpdates: true,
  },
  homey: {
    id: 'homey',
    label: 'Homey',
    supportsAggregation: true,
    supportsRooms: true,
    supportsRealtimeUpdates: true,
  },
  openhab: {
    id: 'openhab',
    label: 'openHAB',
    supportsAggregation: true,
    supportsRooms: true,
    supportsRealtimeUpdates: true,
  },
};

export function isIntegrationProviderId(value: string): value is IntegrationProviderId {
  return value === 'home_assistant' || value === 'homey' || value === 'openhab';
}
