import { useMemo } from 'react';
import { providerRuntimeSelectors } from '../stores/selectors';
import { useProviderRuntime } from './use-provider-runtime';

export function useAreaRooms(): string[] {
  const roomDescriptors = useProviderRuntime(providerRuntimeSelectors.roomDescriptors);

  return useMemo(
    () =>
      [
        ...new Set(
          roomDescriptors
            .filter((descriptor) => descriptor.sources.some((source) => source.supportsOrdering))
            .map((descriptor) => descriptor.name.trim())
            .filter((name) => name.length > 0)
        ),
      ].sort((left, right) => left.localeCompare(right)),
    [roomDescriptors]
  );
}
