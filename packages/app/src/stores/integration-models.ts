import type { IntegrationProviderId } from '@navet/app/types/provider';
import type { NavetProviderRuntimeState } from '@navet/core/types';

export type IntegrationProviderRuntimeState = Omit<
  NavetProviderRuntimeState,
  'error' | 'unreachable'
>;

export interface IntegrationProviderRoomModel {
  id: string;
  canonicalId: string;
  providerId: IntegrationProviderId;
  nativeId: string;
  name: string;
  normalizedName: string;
  alias?: string;
  memberIds: string[];
}

export interface IntegrationRoomDescriptorSource {
  providerId: IntegrationProviderId;
  nativeId: string;
  canonicalId?: string;
  sourceType: 'provider_managed' | 'derived';
  supportsOrdering: boolean;
  supportsDeletion: boolean;
}

export interface IntegrationRoomDescriptor {
  id: string;
  canonicalId: string;
  name: string;
  normalizedName: string;
  providerIds: IntegrationProviderId[];
  memberIds: string[];
  sources: IntegrationRoomDescriptorSource[];
}
