import type { PlatformRoom } from '@navet/app/platform/types';
import { integrationSelectors } from '@navet/app/stores/selectors';
import { useMemo } from 'react';
import { useIntegrationStore } from './use-integration-store';

export function useAggregatedRooms(): PlatformRoom[] {
  const normalizedRoomsByCanonicalId = useIntegrationStore(
    integrationSelectors.normalizedRoomsByCanonicalId
  );

  return useMemo<PlatformRoom[]>(() => {
    const roomsByKey = new Map<string, PlatformRoom>();

    for (const room of Object.values(normalizedRoomsByCanonicalId)) {
      const existing = roomsByKey.get(room.normalizedName);
      if (existing) {
        if (!existing.providerIds.includes(room.providerId)) {
          existing.providerIds.push(room.providerId);
        }
        for (const memberId of room.memberIds) {
          if (!existing.canonicalMemberIds.includes(memberId)) {
            existing.canonicalMemberIds.push(memberId);
          }
        }
        continue;
      }

      roomsByKey.set(room.normalizedName, {
        id: room.normalizedName,
        key: room.normalizedName,
        name: room.name,
        providerIds: [room.providerId],
        canonicalMemberIds: [...room.memberIds],
      });
    }

    return Array.from(roomsByKey.values()).sort((left, right) =>
      left.name.localeCompare(right.name)
    );
  }, [normalizedRoomsByCanonicalId]);
}
