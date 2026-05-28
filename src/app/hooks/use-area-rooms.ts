import { useMemo } from 'react';
import { providerRuntimeSelectors } from '../stores/selectors';
import { useProviderRuntime } from './use-provider-runtime';

export function useAreaRooms(): string[] {
  const areas = useProviderRuntime(providerRuntimeSelectors.areas);

  return useMemo(
    () =>
      [...new Set(areas.map((area) => area.name.trim()).filter((name) => name.length > 0))].sort(
        (left, right) => left.localeCompare(right)
      ),
    [areas]
  );
}
