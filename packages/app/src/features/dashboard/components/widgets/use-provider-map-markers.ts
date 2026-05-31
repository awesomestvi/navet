import { useIntegrationStore } from '@navet/app/hooks';
import { useProviderEntitySnapshots } from '@navet/app/hooks/use-provider-entity';
import { integrationSelectors } from '@navet/app/stores/selectors';
import { useMemo, useRef } from 'react';
import { mapMarkersEqual, selectMapMarkersFromEntities } from './map-markers';
import type { MapMarker } from './map-types';

export function useProviderMapMarkers(): MapMarker[] {
  const currentProviderId = useIntegrationStore(integrationSelectors.currentProviderId);
  const entities = useProviderEntitySnapshots({
    providerId: currentProviderId,
    enabled: currentProviderId === 'home_assistant',
  });
  const stableMarkersRef = useRef<MapMarker[]>([]);

  return useMemo(() => {
    const nextMarkers = selectMapMarkersFromEntities(entities);
    if (mapMarkersEqual(stableMarkersRef.current, nextMarkers)) {
      return stableMarkersRef.current;
    }

    stableMarkersRef.current = nextMarkers;
    return nextMarkers;
  }, [entities]);
}
