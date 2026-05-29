import { getProviderFeatureMatrix } from '@navet/app/provider-runtime-registry';
import type {
  IntegrationProviderFeature,
  IntegrationProviderFeatureMatrix,
} from '@navet/app/provider-runtime-types';
import { integrationStore } from '@/app/stores/integration-store';
import type { IntegrationProviderId } from '@/app/types/provider';
import { parseProviderScopedId } from '@/app/utils/provider-ids';
import { useOptionalAuthSession } from '@/auth/AuthProvider';

function resolveCurrentProviderId(
  providerId: IntegrationProviderId | undefined,
  authProviderId: IntegrationProviderId | undefined
): IntegrationProviderId {
  return providerId ?? authProviderId ?? integrationStore.getState().currentProviderId;
}

export function resolveProviderIdForFeatureSupport(
  entityId: string | undefined,
  fallbackProviderId?: IntegrationProviderId
): IntegrationProviderId {
  if (entityId) {
    const parsed = parseProviderScopedId(entityId);
    if (parsed) {
      return parsed.providerId;
    }
  }

  return resolveCurrentProviderId(fallbackProviderId, undefined);
}

export function useProviderFeatureMatrix(
  providerId?: IntegrationProviderId
): IntegrationProviderFeatureMatrix {
  const authSession = useOptionalAuthSession();
  const resolvedProviderId = resolveCurrentProviderId(providerId, authSession?.providerId);
  return getProviderFeatureMatrix(resolvedProviderId);
}

export function useEntityProviderFeatureMatrix(
  entityId?: string
): IntegrationProviderFeatureMatrix {
  const authSession = useOptionalAuthSession();
  const resolvedProviderId = resolveProviderIdForFeatureSupport(entityId, authSession?.providerId);
  return getProviderFeatureMatrix(resolvedProviderId);
}

export function useProviderFeature(
  feature: IntegrationProviderFeature,
  providerId?: IntegrationProviderId
): boolean {
  return useProviderFeatureMatrix(providerId)[feature];
}

export function useEntityProviderFeature(
  entityId: string | undefined,
  feature: IntegrationProviderFeature
): boolean {
  return useEntityProviderFeatureMatrix(entityId)[feature];
}
