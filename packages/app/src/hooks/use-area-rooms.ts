import { useMemo } from 'react';
import { providerRuntimeSelectors } from '../stores/selectors';
import { useProviderRuntime } from './use-provider-runtime';

export function useAreaRooms(): string[] {
  const manageableRoomsByProviderId = useProviderRuntime(
    providerRuntimeSelectors.manageableRoomsByProviderId
  );

  return useMemo(
    () =>
      [
        ...new Set(
          Object.values(manageableRoomsByProviderId)
            .flat()
            .filter((room) => room.canOrder)
            .map((room) => room.name.trim())
            .filter((name) => name.length > 0)
        ),
      ].sort((left, right) => left.localeCompare(right)),
    [manageableRoomsByProviderId]
  );
}
