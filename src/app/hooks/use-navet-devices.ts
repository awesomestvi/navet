import { useMemo } from 'react';
import type { NavetDevice, NavetRoom } from '@/app/core/navet';
import type { IntegrationProviderId } from '@/app/types/provider';
import { integrationSelectors } from '../stores/selectors';
import { useIntegrationStore } from './use-integration-store';

function normalizeRoomName(name: string) {
  return name.trim().toLocaleLowerCase();
}

export function useNavetDevices(): NavetDevice[] {
  const devicesByCanonicalId = useIntegrationStore(integrationSelectors.devicesByCanonicalId);
  const selectedProviderIds = useIntegrationStore(integrationSelectors.selectedProviderIds);

  return useMemo(
    () =>
      Object.values(devicesByCanonicalId)
        .filter((device) => selectedProviderIds.includes(device.providerId))
        .sort((left, right) => left.name.localeCompare(right.name)),
    [devicesByCanonicalId, selectedProviderIds]
  );
}

export function useNavetProviderDevices(providerId: IntegrationProviderId): NavetDevice[] {
  const devices = useNavetDevices();

  return useMemo(
    () => devices.filter((device) => device.providerId === providerId),
    [devices, providerId]
  );
}

export function useNavetRooms(): NavetRoom[] {
  const devices = useNavetDevices();

  return useMemo(() => {
    const roomMap = new Map<string, NavetRoom>();

    for (const device of devices) {
      const roomKey = normalizeRoomName(device.room);
      const existing = roomMap.get(roomKey);

      if (existing) {
        if (!existing.memberIds.includes(device.canonicalId)) {
          existing.memberIds.push(device.canonicalId);
        }
        continue;
      }

      roomMap.set(roomKey, {
        id: roomKey,
        canonicalId: roomKey,
        providerId: device.providerId,
        nativeId: roomKey,
        name: device.room,
        normalizedName: roomKey,
        memberIds: [device.canonicalId],
      });
    }

    return Array.from(roomMap.values()).sort((left, right) => left.name.localeCompare(right.name));
  }, [devices]);
}
