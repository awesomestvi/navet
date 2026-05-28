import { useIntegrationStore } from '@/app/hooks';
import { useHomeAssistant } from '@/app/hooks/use-home-assistant';
import { integrationSelectors } from '@/app/stores/selectors';
import { mapMarkersEqual, selectMapMarkersFromHa } from './map-markers';
import type { MapMarker } from './map-types';

function selectEmptyMapMarkers(): MapMarker[] {
  return [];
}

export function useProviderMapMarkers(): MapMarker[] {
  const currentProviderId = useIntegrationStore(integrationSelectors.currentProviderId);

  return useHomeAssistant(
    currentProviderId === 'home_assistant' ? selectMapMarkersFromHa : selectEmptyMapMarkers,
    mapMarkersEqual
  );
}
