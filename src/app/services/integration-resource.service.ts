import type { NavetResourceKind } from '@/app/core/navet';
import type { ResolvedPlatformResource } from '@/app/platform/resources';
import type { IntegrationProviderId } from '@/app/types/provider';
import { parseProviderScopedId } from '@/app/utils/provider-ids';
import { getIntegrationProviderContract } from './integration-registry.service';

interface ResolvePlatformArtworkRequest {
  entityId: string;
  attrs: Record<string, unknown>;
  fallbackPicture?: string;
  providerId?: IntegrationProviderId;
}

function resolveProviderId(
  entityId: string,
  providerId?: IntegrationProviderId
): IntegrationProviderId {
  return providerId ?? parseProviderScopedId(entityId)?.providerId ?? 'home_assistant';
}

export async function resolvePlatformArtwork({
  entityId,
  attrs,
  fallbackPicture,
  providerId,
}: ResolvePlatformArtworkRequest): Promise<ResolvedPlatformResource> {
  return await resolveResource(entityId, 'media_artwork', {
    attrs,
    fallbackPicture,
    providerId,
  });
}

export async function resolveResource(
  deviceId: string,
  kind: NavetResourceKind,
  options?: {
    attrs?: Record<string, unknown>;
    fallbackPicture?: string;
    providerId?: IntegrationProviderId;
  }
): Promise<ResolvedPlatformResource> {
  const resolvedProviderId = resolveProviderId(deviceId, options?.providerId);
  const contract = getIntegrationProviderContract(resolvedProviderId);

  if (!contract.resolveResource) {
    return {
      id: deviceId,
      kind: 'unavailable',
      cacheKey: deviceId,
      authStrategy: 'none',
    };
  }

  return await contract.resolveResource({
    deviceId,
    providerId: resolvedProviderId,
    kind,
    attrs: options?.attrs,
    fallbackPicture: options?.fallbackPicture,
  });
}
