import { useMemo } from 'react';
import type { PlatformRoom } from '@/app/platform/types';
import { integrationSelectors } from '@/app/stores/selectors';
import { useIntegrationStore } from './use-integration-store';

export function useAggregatedRooms(): PlatformRoom[] {
  const roomDescriptors = useIntegrationStore(integrationSelectors.roomDescriptors);

  return useMemo<PlatformRoom[]>(
    () =>
      roomDescriptors.map((room) => ({
        id: room.id,
        key: room.normalizedName,
        name: room.name,
        providerIds: [...room.providerIds],
        canonicalMemberIds: [...room.memberIds],
      })),
    [roomDescriptors]
  );
}
