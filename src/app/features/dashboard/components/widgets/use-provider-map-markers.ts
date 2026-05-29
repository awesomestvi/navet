import { useMemo } from 'react';
import { useIntegrationStore } from '@/app/hooks';
import { useProviderEntitySnapshots } from '@/app/hooks/use-provider-entity';
import { integrationSelectors } from '@/app/stores/selectors';
import { selectMapMarkersFromEntities } from './map-markers';
import type { MapMarker } from './map-types';

export function useProviderMapMarkers(): MapMarker[] {
  const currentProviderId = useIntegrationStore(integrationSelectors.currentProviderId);
  const entities = useProviderEntitySnapshots({
    providerId: currentProviderId,
    enabled: currentProviderId === 'home_assistant',
  });

  return useMemo(() => selectMapMarkersFromEntities(entities), [entities]);
}
