import type { NavetDevice, NavetRoom } from '@navet/app/internal/compat-models';
import { useMemo } from 'react';
import { useIntegrationStore } from '@/app/hooks/use-integration-store';
import { integrationCompatibilitySelectors } from '@/app/internal/compat-selectors';
import { integrationSelectors } from '@/app/stores/selectors';
import type { IntegrationProviderId } from '@/app/types/provider';
import { createProviderScopedId, parseProviderScopedId } from '@/app/utils/provider-ids';

function resolveProviderRecordEntry<
  T extends { nativeId?: string; externalId?: string; canonicalId: string },
>(
  recordByCanonicalId: Record<string, T>,
  deviceId: string,
  currentProviderId: IntegrationProviderId
): T | null {
  const directMatch = recordByCanonicalId[deviceId];
  if (directMatch) {
    return directMatch;
  }

  const scopedId = parseProviderScopedId(deviceId);
  if (scopedId) {
    return (
      recordByCanonicalId[createProviderScopedId(scopedId.providerId, scopedId.nativeId)] ?? null
    );
  }

  const currentProviderMatch =
    recordByCanonicalId[createProviderScopedId(currentProviderId, deviceId)];
  if (currentProviderMatch) {
    return currentProviderMatch;
  }

  return (
    Object.values(recordByCanonicalId).find((entry) => {
      const nativeId = 'nativeId' in entry ? entry.nativeId : entry.externalId;
      return nativeId === deviceId || entry.canonicalId === deviceId;
    }) ?? null
  );
}

function normalizeRoomName(name: string) {
  return name.trim().toLocaleLowerCase();
}

export function useProviderDevice(deviceId: string): NavetDevice | null {
  const currentProviderId = useIntegrationStore(integrationSelectors.currentProviderId);
  const devicesByCanonicalId = useIntegrationStore(
    integrationCompatibilitySelectors.devicesByCanonicalId
  );

  return useMemo(() => {
    return resolveProviderRecordEntry(devicesByCanonicalId, deviceId, currentProviderId);
  }, [currentProviderId, deviceId, devicesByCanonicalId]);
}

export function useNavetDevices(): NavetDevice[] {
  const devicesByCanonicalId = useIntegrationStore(
    integrationCompatibilitySelectors.devicesByCanonicalId
  );
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
