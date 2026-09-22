import { useOptionalAuthSession } from '@navet/app/auth/AuthProvider';
import { getProviderFeatureMatrix } from '@navet/app/provider-runtime-registry';
import type {
  IntegrationProviderFeature,
  IntegrationProviderFeatureMatrix,
} from '@navet/app/provider-runtime-types';
import { integrationStore } from '@navet/app/stores/integration-store';
import type { IntegrationProviderId } from '@navet/app/types/provider';
import { parseProviderScopedId } from '@navet/app/utils/provider-ids';
import { useMemo } from 'react';
import { useIntegrationStore } from './use-integration-store';

function resolveCurrentProviderId(
  providerId: IntegrationProviderId | undefined,
  authProviderId: IntegrationProviderId | undefined
): IntegrationProviderId {
  return providerId ?? authProviderId ?? integrationStore.getState().currentProviderId;
}

const EMPTY_SELECTED_PROVIDER_IDS: IntegrationProviderId[] = [];

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
  const selectedProviderIds = useIntegrationStore((state) =>
    providerId ? EMPTY_SELECTED_PROVIDER_IDS : state.selectedProviderIds
  );
  return useMemo(() => {
    if (providerId || selectedProviderIds.length === 0)
      return getProviderFeatureMatrix(resolvedProviderId);
    const matrix = { ...getProviderFeatureMatrix(selectedProviderIds[0]) };
    for (const selectedId of selectedProviderIds.slice(1)) {
      const features = getProviderFeatureMatrix(selectedId);
      for (const key of Object.keys(matrix) as IntegrationProviderFeature[]) {
        matrix[key] ||= features[key];
      }
    }
    return matrix;
  }, [providerId, resolvedProviderId, selectedProviderIds]);
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
