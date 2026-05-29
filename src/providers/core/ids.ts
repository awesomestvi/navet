import {
  type IntegrationProviderId,
  isIntegrationProviderId,
  type ProviderScopedMetadata,
} from '@/app/types/provider';

const PROVIDER_SCOPED_ID_PATTERN = /^([^:]+):(.+)$/;

export function createProviderScopedId(
  providerId: IntegrationProviderId,
  nativeId: string
): string {
  return `${providerId}:${nativeId}`;
}

export function parseProviderScopedId(
  value: string
): { providerId: IntegrationProviderId; nativeId: string } | null {
  const match = PROVIDER_SCOPED_ID_PATTERN.exec(value);
  if (!match) {
    return null;
  }

  const [, providerId, nativeId] = match;
  if (!nativeId || !isIntegrationProviderId(providerId)) {
    return null;
  }

  return {
    providerId,
    nativeId,
  };
}

export function createProviderScopedMetadata(
  providerId: IntegrationProviderId,
  nativeId: string
): ProviderScopedMetadata {
  return {
    providerId,
    nativeId,
    canonicalId: createProviderScopedId(providerId, nativeId),
  };
}

export function getProviderNativeId(value: string): string {
  return parseProviderScopedId(value)?.nativeId ?? value;
}
