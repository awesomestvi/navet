import { useIntegrationStore } from '@navet/app/hooks';
import { useProviderEntitySnapshotsByPrefix } from '@navet/app/hooks/use-provider-entity';
import { integrationSelectors } from '@navet/app/stores/selectors';
import { useMemo, useRef } from 'react';
import { mapMarkersEqual, selectMapMarkersFromEntities } from './map-markers';
import type { MapMarker } from './map-types';

const MAP_MARKER_ENTITY_PREFIXES = ['person.', 'device_tracker.'] as const;

export function useProviderMapMarkers(enabled = true): MapMarker[] {
  const currentProviderId = useIntegrationStore(integrationSelectors.currentProviderId);
  const entities = useProviderEntitySnapshotsByPrefix(MAP_MARKER_ENTITY_PREFIXES, {
    providerId: currentProviderId,
    enabled: enabled && currentProviderId === 'home_assistant',
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
