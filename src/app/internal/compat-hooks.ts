import type { NavetDevice, NavetRoom } from '@navet/app/internal/compat-models';
import { useMemo } from 'react';
import { useIntegrationStore } from '@/app/hooks/use-integration-store';
import { integrationSelectors } from '@/app/stores/selectors';
import type { IntegrationProviderId } from '@/app/types/provider';
import { parseProviderScopedId } from '@/app/utils/provider-ids';

function normalizeRoomName(name: string) {
  return name.trim().toLocaleLowerCase();
}

export function useProviderDevice(deviceId: string): NavetDevice | null {
  const currentProviderId = useIntegrationStore(integrationSelectors.currentProviderId);
  const lookupProviderIds =
    currentProviderId === 'home_assistant' || parseProviderScopedId(deviceId)
      ? [parseProviderScopedId(deviceId)?.providerId ?? currentProviderId]
      : ([currentProviderId, 'home_assistant'] as const);

  return useIntegrationStore((state) => {
    for (const providerId of lookupProviderIds) {
      const device = integrationSelectors.providerDeviceByLookup(providerId, deviceId)(state);
      if (device) {
        return device;
      }
    }

    return null;
  }, Object.is);
}

export function useNavetDevices(): NavetDevice[] {
  const selectedProviderIds = useIntegrationStore(integrationSelectors.selectedProviderIds);
  const providerDeviceRecords = useIntegrationStore(
    (state) =>
      selectedProviderIds.map(
        (providerId) => integrationSelectors.providerDevicesByProviderId(state)[providerId] ?? {}
      ),
    (left, right) =>
      left.length === right.length && left.every((record, index) => record === right[index])
  );

  return useMemo(
    () =>
      providerDeviceRecords
        .flatMap((record) => Object.values(record))
        .sort((left, right) => left.name.localeCompare(right.name)),
    [providerDeviceRecords]
  );
}

export function useNavetProviderDevices(providerId: IntegrationProviderId): NavetDevice[] {
  const devicesByCanonicalId = useIntegrationStore(
    (state) => integrationSelectors.providerDevicesByProviderId(state)[providerId] ?? {},
    Object.is
  );

  return useMemo(
    () =>
      Object.values(devicesByCanonicalId).sort((left, right) =>
        left.name.localeCompare(right.name)
      ),
    [devicesByCanonicalId]
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
